import type { BaseConnector, ConnectorResult, RawJobListing } from './base.ts';
import type { JobSourceConfig } from '../types/job.ts';

export class CustomApiConnector implements BaseConnector {
  public config: JobSourceConfig;

  constructor(config: JobSourceConfig) {
    this.config = config;
  }

  // SSRF Protection: ensure URL is public HTTP/HTTPS and not private/loopback
  private validateUrl(targetUrl: string): { isValid: boolean; error?: string } {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { isValid: false, error: 'Only HTTP and HTTPS protocols are permitted' };
      }
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        host.startsWith('172.16.') ||
        host.endsWith('.internal') ||
        host.endsWith('.local')
      ) {
        return { isValid: false, error: 'Access to private internal network addresses is restricted' };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Malformed API endpoint URL' };
    }
  }

  public async validateConfiguration(): Promise<{ isValid: boolean; error?: string }> {
    const url = this.config.base_url || this.config.identifier;
    if (!url) {
      return { isValid: false, error: 'API endpoint URL is required' };
    }
    const val = this.validateUrl(url);
    if (!val.isValid) return val;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'RemoteJobIntelligence/1.0',
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) {
        return { isValid: false, error: `API endpoint returned HTTP ${res.status}` };
      }
      const data = await res.json().catch(() => null);
      if (!data) {
        return { isValid: false, error: 'API did not return valid JSON' };
      }
      return { isValid: true };
    } catch (err: any) {
      return { isValid: false, error: err.message || 'API connection failed or timed out' };
    }
  }

  public async discoverJobs(): Promise<ConnectorResult> {
    const url = this.config.base_url || this.config.identifier;
    if (!url) {
      return { success: false, discoveredJobs: [], error: 'Missing API endpoint URL' };
    }

    const val = this.validateUrl(url);
    if (!val.isValid) {
      return { success: false, discoveredJobs: [], error: val.error };
    }

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'RemoteJobIntelligence/1.0',
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        return { success: false, discoveredJobs: [], error: `API returned HTTP ${res.status}` };
      }

      const rawJson = await res.json();
      const jobList = this.findJobArray(rawJson);

      if (!jobList || jobList.length === 0) {
        return {
          success: true,
          discoveredJobs: [],
          error: 'Connected, but no job listings array found in JSON payload'
        };
      }

      const discoveredJobs: RawJobListing[] = jobList.map((item: any, idx: number) => {
        const title = item.title || item.jobTitle || item.job_title || item.role || item.position || item.name || '';
        const company = item.company || item.company_name || item.companyName || item.employer || this.config.name;
        const jobUrl = item.url || item.job_url || item.jobUrl || item.link || item.absolute_url || item.apply_url || `${url}#job-${idx}`;
        const location = item.location || item.candidate_required_location || item.job_location || item.country || (item.is_remote ? 'Remote' : 'Remote');
        const description = item.description || item.snippet || item.summary || item.content || '';
        const datePosted = item.publication_date || item.published_at || item.created_at || item.date || new Date().toISOString();
        const sourceJobId = String(item.id || item.job_id || item.slug || idx);

        let salaryMin: number | undefined = undefined;
        let salaryMax: number | undefined = undefined;
        if (typeof item.salary_min === 'number') salaryMin = item.salary_min;
        if (typeof item.salary_max === 'number') salaryMax = item.salary_max;
        if (!salaryMin && typeof item.salary === 'string') {
          const matches = item.salary.match(/\d+[\d,]*/g);
          if (matches && matches.length >= 2) {
            salaryMin = parseInt(matches[0].replace(/,/g, ''), 10);
            salaryMax = parseInt(matches[1].replace(/,/g, ''), 10);
          }
        }

        return {
          title: String(title),
          company: String(company),
          url: String(jobUrl),
          location: typeof location === 'string' ? location : 'Remote',
          description: typeof description === 'string' ? description : undefined,
          datePosted: String(datePosted),
          salaryMin,
          salaryMax,
          salaryCurrency: item.currency || 'USD',
          sourceJobId,
          applyUrl: item.apply_url || item.application_url || jobUrl
        };
      });

      return { success: true, discoveredJobs };
    } catch (err: any) {
      return { success: false, discoveredJobs: [], error: err.message || 'Failed to query custom API' };
    }
  }

  private findJobArray(data: any): any[] | null {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return null;

    // Check common property names
    const candidateKeys = ['jobs', 'data', 'results', 'postings', 'vacancies', 'items', 'listings', 'positions'];
    for (const key of candidateKeys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }

    // Check nested objects (e.g. data.jobs)
    for (const key of Object.keys(data)) {
      if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
        for (const subKey of candidateKeys) {
          if (Array.isArray(data[key][subKey])) {
            return data[key][subKey];
          }
        }
      }
    }

    return null;
  }
}
