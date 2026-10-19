import type { CanonicalJob } from '../types/job.ts';
import { SHEET_COLUMNS } from '../types/job.ts';
import { StorageService } from './storage.ts';

export interface SheetMetadata {
  id: string;
  title: string;
  sheets: string[];
}

export class GoogleSheetsService {
  public static async testConnection(
    accessToken: string,
    spreadsheetId: string,
    sheetName?: string
  ): Promise<{ success: boolean; metadata?: SheetMetadata; error?: string }> {
    if (!accessToken) return { success: false, error: 'Google access token is missing. Please sign in.' };
    if (!spreadsheetId) return { success: false, error: 'Spreadsheet ID or URL is required.' };

    const cleanId = this.extractSpreadsheetId(spreadsheetId);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'RemoteJobIntelligence/1.0' }
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const msg = errorJson.error?.message || `HTTP ${res.status}`;
        return { success: false, error: `Google Sheets API Error: ${msg}` };
      }

      const data = await res.json();
      const sheetTitles = (data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

      return {
        success: true,
        metadata: {
          id: data.spreadsheetId,
          title: data.properties?.title || 'Untitled Spreadsheet',
          sheets: sheetTitles
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to Google Sheets API' };
    }
  }

  public static async createTrackerSheet(
    accessToken: string,
    title: string = 'Remote Jobs Intelligence Tracker'
  ): Promise<{ success: boolean; spreadsheetId?: string; spreadsheetUrl?: string; error?: string }> {
    if (!accessToken) return { success: false, error: 'Access token required' };

    try {
      const payload = {
        properties: { title },
        sheets: [
          {
            properties: { title: 'Remote Jobs', gridProperties: { frozenRowCount: 1 } },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: SHEET_COLUMNS.map(col => ({
                      userEnteredValue: { stringValue: col },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        backgroundColor: { red: 0.1, green: 0.2, blue: 0.25 }
                      }
                    }))
                  }
                ]
              }
            ]
          }
        ]
      };

      const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'RemoteJobIntelligence/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `HTTP ${res.status}` };
      }

      const data = await res.json();
      return {
        success: true,
        spreadsheetId: data.spreadsheetId,
        spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create spreadsheet' };
    }
  }

  public static async ensureHeaders(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string
  ): Promise<{ success: boolean; error?: string }> {
    const cleanId = this.extractSpreadsheetId(spreadsheetId);
    try {
      const range = `${sheetName}!A1:N1`;
      const checkRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const checkData = await checkRes.json();
      const existingHeaders = checkData.values?.[0] || [];

      if (existingHeaders.length === 0) {
        // Write headers
        const writeRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: [SHEET_COLUMNS] })
          }
        );
        if (!writeRes.ok) {
          const err = await writeRes.json().catch(() => ({}));
          return { success: false, error: err.error?.message || 'Failed to write sheet headers' };
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public static async fetchExistingKeysFromSheet(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string
  ): Promise<Set<string>> {
    const cleanId = this.extractSpreadsheetId(spreadsheetId);
    const existingKeys = new Set<string>();

    try {
      // Read columns C (URL) and N (Duplicate Key)
      const range = `${sheetName}!A2:N1000`;
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) return existingKeys;
      const data = await res.json();
      const rows = data.values || [];

      for (const row of rows) {
        const url = row[2]; // Column C
        const dupKey = row[13]; // Column N
        if (url) existingKeys.add(url.trim());
        if (dupKey) existingKeys.add(dupKey.trim());
      }
    } catch (err) {
      console.warn('Could not read existing spreadsheet keys (might be empty sheet):', err);
    }
    return existingKeys;
  }

  public static async syncJobsToSheet(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string,
    candidateJobs: CanonicalJob[]
  ): Promise<{
    success: boolean;
    syncedCount: number;
    skippedDuplicatesCount: number;
    error?: string;
  }> {
    if (!accessToken) return { success: false, syncedCount: 0, skippedDuplicatesCount: 0, error: 'Sign in required' };
    if (!spreadsheetId) return { success: false, syncedCount: 0, skippedDuplicatesCount: 0, error: 'Spreadsheet ID required' };
    if (!sheetName) sheetName = 'Remote Jobs';

    const cleanId = this.extractSpreadsheetId(spreadsheetId);

    // 1. Ensure headers exist
    const headerResult = await this.ensureHeaders(accessToken, cleanId, sheetName);
    if (!headerResult.success) {
      return { success: false, syncedCount: 0, skippedDuplicatesCount: 0, error: headerResult.error };
    }

    // 2. Fetch already written duplicate keys from sheet to guarantee idempotency
    const existingInSheet = await this.fetchExistingKeysFromSheet(accessToken, cleanId, sheetName);

    // 3. Filter candidates
    const rowsToAppend: any[][] = [];
    const jobsAppended: CanonicalJob[] = [];
    let skippedDuplicatesCount = 0;

    for (const job of candidateJobs) {
      if (existingInSheet.has(job.duplicate_key) || existingInSheet.has(job.job_url)) {
        skippedDuplicatesCount++;
        continue;
      }

      const row = [
        job.job_title,
        job.company_name,
        job.job_url,
        job.location,
        job.remote_type,
        job.country_eligibility,
        job.source_name,
        job.original_posting_date || '',
        job.employment_type || 'Full-time',
        job.salary_formatted || '',
        job.collected_at,
        job.last_verified_at,
        'Active',
        job.duplicate_key
      ];

      rowsToAppend.push(row);
      jobsAppended.push(job);
      existingInSheet.add(job.duplicate_key);
      existingInSheet.add(job.job_url);
    }

    if (rowsToAppend.length === 0) {
      return { success: true, syncedCount: 0, skippedDuplicatesCount };
    }

    // 4. Batch append to spreadsheet
    try {
      const appendRange = `${sheetName}!A:N`;
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'RemoteJobIntelligence/1.0'
          },
          body: JSON.stringify({ values: rowsToAppend })
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          syncedCount: 0,
          skippedDuplicatesCount,
          error: errJson.error?.message || `Append failed with HTTP ${res.status}`
        };
      }

      // 5. Update local database with synced status
      const now = new Date().toISOString();
      for (const j of jobsAppended) {
        StorageService.updateJob(j.job_id, {
          sync_status: 'synced',
          synced_at: now
        });
      }

      // Update sheet config stats
      const currentConfig = StorageService.getSheetConfig();
      StorageService.saveSheetConfig({
        ...currentConfig,
        spreadsheet_id: cleanId,
        sheet_name: sheetName,
        last_synced_at: now,
        total_rows_synced: (currentConfig.total_rows_synced || 0) + rowsToAppend.length
      });

      return {
        success: true,
        syncedCount: rowsToAppend.length,
        skippedDuplicatesCount
      };
    } catch (err: any) {
      return { success: false, syncedCount: 0, skippedDuplicatesCount, error: err.message || 'Network failure during sheet append' };
    }
  }

  public static extractSpreadsheetId(input: string): string {
    if (!input) return '';
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return input.trim();
  }
}
