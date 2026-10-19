import type { BaseConnector, ConnectorResult, RawJobListing } from './base.ts';
import type { JobSourceConfig } from '../types/job.ts';

export class AshbyConnector implements BaseConnector {
  public config: JobSourceConfig;

  constructor(config: JobSourceConfig) {
    this.config = config;
  }

  private extractOrg(input: string): string {
    const trimmed = input.trim();
    if (trimmed.includes('ashbyhq.com')) {
      const match = trimmed.match(/ashbyhq\.com\/(?:posting-api\/job-board\/)?([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1];
    }
    return trimmed;
  }

  public async validateConfiguration(): Promise<{ isValid: boolean; error?: string }> {
    const org = this.extractOrg(this.config.identifier || '');
    if (!org) return { isValid: false, error: 'Ashby organization identifier or URL is required' };
    if (!/^[a-zA-Z0-9_-]+$/.test(org)) {
      return { isValid: false, error: 'Invalid Ashby organization identifier' };
    }
    try {
      const url = `https://api.ashbyhq.com/posting-api/job-board/${org}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'RemoteJobIntelligence/1.0' }, signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        return { isValid: false, error: `Ashby returned HTTP ${res.status}` };
      }
      return { isValid: true };
    } catch (err: any) {
      return { isValid: false, error: err.message || 'Ashby connection timeout' };
    }
  }

  public async discoverJobs(): Promise<ConnectorResult> {
    const org = this.extractOrg(this.config.identifier || '');
    if (!org || !/^[a-zA-Z0-9_-]+$/.test(org)) {
      return { success: false, discoveredJobs: [], error: 'Invalid Ashby organization' };
    }

    try {
      const url = `https://api.ashbyhq.com/posting-api/job-board/${org}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'RemoteJobIntelligence/1.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        return { success: false, discoveredJobs: [], error: `Ashby API returned HTTP ${res.status}` };
      }

      const data = await res.json();
      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

      const discoveredJobs: RawJobListing[] = jobs.map((j: any) => {
        const isRemote = j.isRemote || j.locationName?.toLowerCase().includes('remote');
        return {
          title: j.title || '',
          company: this.config.name.replace(/\(.*\)/, '').trim(),
          url: j.jobUrl || `https://jobs.ashbyhq.com/${org}/${j.id}`,
          location: j.locationName || (isRemote ? 'Remote' : 'Unspecified'),
          description: j.descriptionHtml || '',
          datePosted: j.publishedAt || new Date().toISOString(),
          employmentType: j.employmentType || 'Full-time',
          sourceJobId: String(j.id),
          applyUrl: j.applyUrl || j.jobUrl
        };
      });

      return { success: true, discoveredJobs };
    } catch (err: any) {
      return { success: false, discoveredJobs: [], error: err.message || 'Failed to fetch Ashby postings' };
    }
  }
}
