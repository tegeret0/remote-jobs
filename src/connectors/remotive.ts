import type { BaseConnector, ConnectorResult, RawJobListing } from './base.ts';
import type { JobSourceConfig } from '../types/job.ts';

export class RemotiveConnector implements BaseConnector {
  public config: JobSourceConfig;

  constructor(config: JobSourceConfig) {
    this.config = config;
  }

  public async validateConfiguration(): Promise<{ isValid: boolean; error?: string }> {
    try {
      const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=1', {
        headers: { 'User-Agent': 'RemoteJobIntelligence/1.0' },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) {
        return { isValid: false, error: `Remotive returned HTTP ${res.status}` };
      }
      return { isValid: true };
    } catch (err: any) {
      return { isValid: false, error: err.message || 'Remotive connection timeout' };
    }
  }

  public async discoverJobs(): Promise<ConnectorResult> {
    try {
      const url = 'https://remotive.com/api/remote-jobs?category=software-dev&limit=40';
      const res = await fetch(url, {
        headers: { 'User-Agent': 'RemoteJobIntelligence/1.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        return { success: false, discoveredJobs: [], error: `Remotive API returned HTTP ${res.status}` };
      }

      const data = await res.json();
      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

      const discoveredJobs: RawJobListing[] = jobs.map((j: any) => {
        let salaryMin: number | undefined = undefined;
        let salaryMax: number | undefined = undefined;
        if (j.salary) {
          const nums = j.salary.match(/\d+[\d,]*/g);
          if (nums && nums.length >= 2) {
            salaryMin = parseInt(nums[0].replace(/,/g, ''), 10);
            salaryMax = parseInt(nums[1].replace(/,/g, ''), 10);
          } else if (nums && nums.length === 1) {
            salaryMin = parseInt(nums[0].replace(/,/g, ''), 10);
          }
        }

        return {
          title: j.title || '',
          company: j.company_name || 'Tech Company',
          url: j.url,
          location: j.candidate_required_location || 'USA / Canada / Worldwide',
          description: j.description || '',
          datePosted: j.publication_date || new Date().toISOString(),
          employmentType: j.job_type || 'full_time',
          salaryMin,
          salaryMax,
          salaryCurrency: 'USD',
          sourceJobId: String(j.id),
          applyUrl: j.url
        };
      });

      return { success: true, discoveredJobs };
    } catch (err: any) {
      return { success: false, discoveredJobs: [], error: err.message || 'Failed to fetch Remotive feed' };
    }
  }
}
