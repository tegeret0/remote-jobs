import type { JobSourceConfig, SearchPreferences } from '../types/job.ts';

export interface RawJobListing {
  title: string;
  company: string;
  url: string;
  location?: string;
  description?: string;
  datePosted?: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  sourceJobId?: string;
  applyUrl?: string;
}

export interface ConnectorResult {
  success: boolean;
  discoveredJobs: RawJobListing[];
  error?: string;
}

export interface BaseConnector {
  config: JobSourceConfig;
  validateConfiguration(): Promise<{ isValid: boolean; error?: string }>;
  discoverJobs(preferences?: Partial<SearchPreferences>): Promise<ConnectorResult>;
}
