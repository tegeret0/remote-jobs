import type { BaseConnector, ConnectorResult, RawJobListing } from './base.ts';
import type { JobSourceConfig } from '../types/job.ts';

export class LeverConnector implements BaseConnector {
  public config: JobSourceConfig;

  constructor(config: JobSourceConfig) {
    this.config = config;
  }

  private extractSite(input: string): string {
    const trimmed = input.trim();
    if (trimmed.includes('lever.co')) {
      const match = trimmed.match(/lever\.co\/(?:v0\/postings\/)?([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1];
    }
    return trimmed;
  }

  public async validateConfiguration(): Promise<{ isValid: boolean; error?: string }> {
    const site = this.extractSite(this.config.identifier || '');
    if (!site) {
      return { isValid: false, error: 'Lever site name or URL is required' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(site)) {
      return { isValid: false, error: 'Invalid Lever site format' };
    }
    try {
      const url = `https://api.lever.co/v0/postings/${site}?limit=1&mode=json`;
      const res = await fetch(url, { headers: { 'User-Agent': 'RemoteJobIntelligence/1.0' }, signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        return { isValid: false, error: `Lever returned HTTP ${res.status}` };
      }
      return { isValid: true };
    } catch (err: any) {
      return { isValid: false, error: err.message || 'Lever connection timeout' };
    }
  }

  public async discoverJobs(): Promise<ConnectorResult> {
    const site = this.extractSite(this.config.identifier || '');
    if (!site || !/^[a-zA-Z0-9_-]+$/.test(site)) {
      return { success: false, discoveredJobs: [], error: 'Invalid Lever site' };
    }

    try {
      const url = `https://api.lever.co/v0/postings/${site}?mode=json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'RemoteJobIntelligence/1.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        return { success: false, discoveredJobs: [], error: `Lever API returned HTTP ${res.status}` };
      }

      const list = await res.json();
      if (!Array.isArray(list)) {
        return { success: false, discoveredJobs: [], error: 'Malformed response from Lever API' };
      }

      const discoveredJobs: RawJobListing[] = list.map((item: any) => {
        const location = item.categories?.location || (item.workplaceType === 'remote' ? 'Remote' : 'Unspecified');
        return {
          title: item.text || '',
          company: this.config.name.replace(/\(.*\)/, '').trim(),
          url: item.hostedUrl || `https://jobs.lever.co/${site}/${item.id}`,
          location: `${location} ${item.categories?.allLocations?.join(', ') || ''}`.trim(),
          description: item.descriptionPlain || item.description || '',
          datePosted: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
          employmentType: item.categories?.commitment || 'Full-time',
          sourceJobId: item.id,
          applyUrl: item.applyUrl || item.hostedUrl
        };
      });

      return { success: true, discoveredJobs };
    } catch (err: any) {
      return { success: false, discoveredJobs: [], error: err.message || 'Failed to fetch Lever postings' };
    }
  }
}
