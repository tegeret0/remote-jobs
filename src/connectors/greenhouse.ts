import type { BaseConnector, ConnectorResult, RawJobListing } from './base.ts';
import type { JobSourceConfig } from '../types/job.ts';

export class GreenhouseConnector implements BaseConnector {
  public config: JobSourceConfig;

  constructor(config: JobSourceConfig) {
    this.config = config;
  }

  public async validateConfiguration(): Promise<{ isValid: boolean; error?: string }> {
    const token = this.config.identifier?.trim();
    if (!token) {
      return { isValid: false, error: 'Greenhouse board token is required' };
    }
    // Prevent SSRF: ensure token contains only letters, digits, dashes, and underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
      return { isValid: false, error: 'Invalid board token format (letters, digits, dashes only)' };
    }
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${token}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'RemoteJobIntelligence/1.0' }, signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        return { isValid: false, error: `Greenhouse returned HTTP ${res.status}` };
      }
      return { isValid: true };
    } catch (err: any) {
      return { isValid: false, error: err.message || 'Connection timeout or network failure' };
    }
  }

  public async discoverJobs(): Promise<ConnectorResult> {
    const token = this.config.identifier?.trim();
    if (!token || !/^[a-zA-Z0-9_-]+$/.test(token)) {
      return { success: false, discoveredJobs: [], error: 'Invalid or missing Greenhouse token' };
    }

    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'RemoteJobIntelligence/1.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        return { success: false, discoveredJobs: [], error: `Greenhouse API returned HTTP ${res.status}` };
      }

      const data = await res.json();
      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

      const discoveredJobs: RawJobListing[] = jobs.map((j: any) => {
        return {
          title: j.title || '',
          company: this.config.name.replace(/\(.*\)/, '').trim(),
          url: j.absolute_url || `https://boards.greenhouse.io/${token}/jobs/${j.id}`,
          location: j.location?.name || 'Remote',
          description: j.content || '',
          datePosted: j.updated_at || new Date().toISOString(),
          sourceJobId: String(j.id),
          applyUrl: j.absolute_url ? `${j.absolute_url}#app` : undefined
        };
      });

      return { success: true, discoveredJobs };
    } catch (err: any) {
      return { success: false, discoveredJobs: [], error: err.message || 'Failed to fetch Greenhouse postings' };
    }
  }
}
