export const JOB_SCHEMA_VERSION = '1.0';

export const SHEET_COLUMNS = [
  'Job Title',
  'Company Name',
  'Job URL',
  'Location',
  'Remote Type',
  'Country Eligibility',
  'Source',
  'Posting Date',
  'Employment Type',
  'Salary',
  'Date Collected',
  'Last Verified',
  'Collection Status',
  'Duplicate Key'
];

export type RemoteType = 'Remote' | 'Hybrid' | 'On-site' | 'Unspecified';

export type CountryEligibility = 'US' | 'Canada' | 'US & Canada' | 'Worldwide' | 'Restricted' | 'Other';

export interface CanonicalJob {
  job_id: string;
  job_title: string;
  company_name: string;
  job_url: string;
  location: string;
  source_name: string;
  collected_at: string;
  original_posting_date?: string;
  employment_type?: string;
  remote_type: RemoteType;
  country_eligibility: CountryEligibility;
  is_us_ca_eligible: boolean;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_formatted?: string;
  job_description?: string;
  source_job_id?: string;
  application_url?: string;
  company_career_url?: string;
  last_verified_at: string;
  duplicate_key: string;
  rejection_reason?: string;
  review_required: boolean;
  sync_status: 'pending' | 'synced' | 'failed' | 'ignored';
  synced_at?: string;
}

export interface SearchPreferences {
  target_countries: string[];
  remote_only: boolean;
  included_keywords: string[];
  excluded_keywords: string[];
  seniority_levels: string[];
  employment_types: string[];
  min_salary: number;
  max_freshness_days: number;
  auto_sync: boolean;
  review_mode: boolean;
}

export interface JobSourceConfig {
  id: string;
  name: string;
  type: 'greenhouse' | 'lever' | 'ashby' | 'remotive' | 'custom_api';
  identifier: string; // e.g. company token or feed url
  base_url?: string;
  enabled: boolean;
  health: 'healthy' | 'degraded' | 'error' | 'untested';
  last_run_at?: string;
  total_discovered: number;
  total_new: number;
  total_duplicates: number;
  total_failed: number;
  last_error?: string;
}

export interface CollectionRun {
  id: string;
  started_at: string;
  finished_at?: string;
  status: 'queued' | 'running' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';
  sources_selected: string[];
  sources_completed: string[];
  sources_failed: { source_id: string; error: string }[];
  total_discovered: number;
  total_valid: number;
  total_new: number;
  total_duplicates: number;
  total_rejected: number;
  synced_to_sheets: number;
  log: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    source?: string;
    message: string;
  }>;
}

export interface SheetConfig {
  spreadsheet_id: string;
  spreadsheet_url: string;
  sheet_name: string;
  last_synced_at?: string;
  total_rows_synced: number;
  auto_sync_enabled: boolean;
}
