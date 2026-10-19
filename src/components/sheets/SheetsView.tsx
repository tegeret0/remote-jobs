import React, { useState } from 'react';
import {
  Table,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Send,
  Eye,
  Info
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { CanonicalJob, SheetConfig } from '../../types/job.ts';
import { SHEET_COLUMNS } from '../../types/job.ts';

interface SheetsViewProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isSigningIn: boolean;
  accessToken: string | null;
  sheetConfig: SheetConfig;
  onUpdateConfig: (config: SheetConfig) => void;
  jobs: CanonicalJob[];
  onSyncPending: () => Promise<{ success: boolean; syncedCount: number; skippedDuplicatesCount: number; error?: string }>;
}

export const SheetsView: React.FC<SheetsViewProps> = ({
  user,
  onSignIn,
  onSignOut,
  isSigningIn,
  accessToken,
  sheetConfig,
  onUpdateConfig,
  jobs,
  onSyncPending
}) => {
  const [spreadsheetInput, setSpreadsheetInput] = useState(sheetConfig.spreadsheet_id || '');
  const [sheetNameInput, setSheetNameInput] = useState(sheetConfig.sheet_name || 'Remote Jobs');
  const [autoSync, setAutoSync] = useState(sheetConfig.auto_sync_enabled);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; title?: string; error?: string } | null>(null);

  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [createResult, setCreateResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncOutcome, setSyncOutcome] = useState<{ success: boolean; message: string } | null>(null);

  const pendingJobs = jobs.filter(j => j.sync_status === 'pending');
  const syncedJobs = jobs.filter(j => j.sync_status === 'synced');

  const handleSaveConfig = () => {
    onUpdateConfig({
      ...sheetConfig,
      spreadsheet_id: spreadsheetInput.trim(),
      sheet_name: sheetNameInput.trim() || 'Remote Jobs',
      auto_sync_enabled: autoSync
    });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!accessToken) {
      setTestResult({ success: false, error: 'Please sign in with Google first' });
      return;
    }
    if (!spreadsheetInput.trim()) {
      setTestResult({ success: false, error: 'Please enter a spreadsheet ID or URL' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/sheets/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          spreadsheetId: spreadsheetInput.trim(),
          sheetName: sheetNameInput.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          title: data.metadata?.title || 'Spreadsheet Connected'
        });
        handleSaveConfig();
      } else {
        setTestResult({ success: false, error: data.error || 'Failed to verify spreadsheet' });
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      setCreateResult({ success: false, error: 'Please sign in with Google first' });
      return;
    }

    setIsCreatingSheet(true);
    setCreateResult(null);

    try {
      const res = await fetch('/api/sheets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          title: `Remote Jobs Intelligence Tracker (${new Date().toLocaleDateString()})`
        })
      });

      const data = await res.json();
      if (data.success && data.spreadsheetId) {
        setSpreadsheetInput(data.spreadsheetId);
        onUpdateConfig({
          ...sheetConfig,
          spreadsheet_id: data.spreadsheetId,
          spreadsheet_url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
          sheet_name: 'Remote Jobs'
        });
        setCreateResult({
          success: true,
          url: data.spreadsheetUrl
        });
        setTestResult({ success: true, title: 'New Tracker Spreadsheet Created & Configured!' });
      } else {
        setCreateResult({ success: false, error: data.error || 'Could not create spreadsheet' });
      }
    } catch (err: any) {
      setCreateResult({ success: false, error: err.message });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncOutcome(null);
    try {
      const res = await onSyncPending();
      if (res.success) {
        setSyncOutcome({
          success: true,
          message: `Successfully synchronized ${res.syncedCount} new vacancies! (${res.skippedDuplicatesCount} duplicates skipped to protect spreadsheet)`
        });
      } else {
        setSyncOutcome({
          success: false,
          message: `Sync failed: ${res.error}`
        });
      }
    } catch (err: any) {
      setSyncOutcome({ success: false, message: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <span>Google Sheets Integration</span>
            </h2>
            <span className="text-[10px] font-mono uppercase bg-emerald-950 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded font-medium">
              14-Column Schema
            </span>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Connect your personal Google account to record and synchronize discovered remote vacancies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {sheetConfig.spreadsheet_id && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheet_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition"
            >
              <span>Open in Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Account Authentication Card */}
      <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>Google Account Authorization</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Authorized to create, inspect, and append records directly into your personal Google Sheets.
            </p>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                <div className="text-xs text-right">
                  <div className="text-zinc-200 font-semibold">{user.displayName || user.email}</div>
                  <div className="text-[10px] text-emerald-400 font-mono">Google Connected</div>
                </div>
                <button
                  onClick={onSignOut}
                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 font-bold text-xs rounded-lg transition shadow-md"
              >
                <LogIn className="w-4 h-4 text-cyan-600" />
                <span>{isSigningIn ? 'Opening Google Auth...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Spreadsheet Configuration & 1-Click Creator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Target Spreadsheet Setup</span>
            </h3>
            <button
              onClick={handleCreateNewSheet}
              disabled={isCreatingSheet || !user}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 disabled:opacity-50"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isCreatingSheet ? 'Creating Sheet...' : '1-Click Create Tracker Sheet'}</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Spreadsheet ID or Full Google Sheets URL
              </label>
              <input
                type="text"
                placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms or paste browser URL"
                value={spreadsheetInput}
                onChange={e => setSpreadsheetInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                You can paste the entire Google Sheets URL directly from your browser.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Worksheet Tab Name
                </label>
                <input
                  type="text"
                  placeholder="Remote Jobs"
                  value={sheetNameInput}
                  onChange={e => setSheetNameInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={e => {
                      setAutoSync(e.target.checked);
                      onUpdateConfig({ ...sheetConfig, auto_sync_enabled: e.target.checked });
                    }}
                    className="w-4 h-4 rounded border-zinc-700 text-teal-500 bg-zinc-900 focus:ring-0"
                  />
                  <span className="text-zinc-300 font-medium">Auto-Sync New Jobs After Run</span>
                </label>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                    : 'bg-red-950/60 text-red-300 border-red-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">{testResult.success ? 'Connection Validated' : 'Validation Error'}</div>
                  <div className="text-[11px] mt-0.5">{testResult.title || testResult.error}</div>
                </div>
              </div>
            )}

            {createResult?.success && (
              <div className="p-3 bg-cyan-950/60 border border-cyan-800 text-cyan-300 rounded-lg text-xs flex items-center justify-between">
                <span>Spreadsheet created! Pre-configured with the 14 required columns.</span>
                <a
                  href={createResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold"
                >
                  Open Sheet &rarr;
                </a>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !user}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-semibold transition"
              >
                {isTesting ? 'Verifying Write Access...' : 'Test Connection'}
              </button>

              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold rounded-lg transition"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Synchronization Control (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Send className="w-4 h-4 text-teal-400" />
              <span>Batch Synchronization Status</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center font-mono">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">Pending Export</div>
                <div className="text-xl font-bold text-amber-400 mt-1">{pendingJobs.length}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">Total Exported</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{sheetConfig.total_rows_synced || syncedJobs.length}</div>
              </div>
            </div>

            <div className="text-xs text-zinc-400 space-y-2">
              <div className="flex items-center gap-2 text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-semibold">Built-in Duplicate Prevention</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Prior to appending, the engine checks existing entries in the spreadsheet against Column 3 (URL) and Column 14 (Duplicate Key). Previously exported opportunities are automatically skipped.
              </p>
            </div>

            {syncOutcome && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  syncOutcome.success
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                    : 'bg-red-950/60 text-red-300 border-red-800'
                }`}
              >
                {syncOutcome.message}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <button
              onClick={handleManualSync}
              disabled={isSyncing || pendingJobs.length === 0 || !user || !sheetConfig.spreadsheet_id}
              className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                isSyncing || pendingJobs.length === 0 || !user || !sheetConfig.spreadsheet_id
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/50'
              }`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synchronizing Bounded Batch...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Sync {pendingJobs.length} Pending Records Now</span>
                </>
              )}
            </button>
            <div className="text-center text-[10px] text-zinc-500 mt-2 font-mono">
              Last synced: {sheetConfig.last_synced_at ? new Date(sheetConfig.last_synced_at).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>
      </div>

      {/* 14-Column Canonical Schema Specification Card */}
      <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Table className="w-4 h-4 text-cyan-400" />
            <span>Canonical Spreadsheet Column Specification (14 Fields)</span>
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">Fixed Column Order</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {SHEET_COLUMNS.map((col, idx) => (
            <div
              key={col}
              className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-center font-mono text-[11px]"
            >
              <div className="text-[9px] text-zinc-500">Col {idx + 1}</div>
              <div className="text-zinc-200 font-semibold mt-0.5 truncate" title={col}>
                {col}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
