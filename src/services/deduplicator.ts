import type { CanonicalJob } from '../types/job.ts';
import { canonicalizeUrl, normalizeCompanyName } from './normalizer.ts';

export interface DeduplicationResult {
  uniqueJobs: CanonicalJob[];
  duplicates: Array<{
    job: CanonicalJob;
    duplicateReason: string;
    matchedKey: string;
  }>;
  totalIncoming: number;
  uniqueCount: number;
  duplicateCount: number;
}

export function computeJobFingerprint(job: CanonicalJob): {
  sourceKey?: string;
  urlKey: string;
  compositeKey: string;
} {
  const normUrl = canonicalizeUrl(job.job_url);
  const normCompany = normalizeCompanyName(job.company_name);
  const normTitle = job.job_title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const compositeKey = `${normCompany}|${normTitle}|${job.country_eligibility}`;
  const sourceKey = job.source_job_id ? `${job.source_name.toLowerCase()}:${job.source_job_id}` : undefined;

  return { sourceKey, urlKey: normUrl, compositeKey };
}

export class DeduplicationEngine {
  private knownSourceKeys: Set<string>;
  private knownUrls: Set<string>;
  private knownCompositeKeys: Set<string>;

  constructor(existingJobs: CanonicalJob[] = []) {
    this.knownSourceKeys = new Set();
    this.knownUrls = new Set();
    this.knownCompositeKeys = new Set();

    for (const job of existingJobs) {
      this.registerJob(job);
    }
  }

  public registerJob(job: CanonicalJob) {
    const { sourceKey, urlKey, compositeKey } = computeJobFingerprint(job);
    if (sourceKey) this.knownSourceKeys.add(sourceKey);
    if (urlKey) this.knownUrls.add(urlKey);
    if (compositeKey) this.knownCompositeKeys.add(compositeKey);
  }

  public processBatch(incomingJobs: CanonicalJob[]): DeduplicationResult {
    const uniqueJobs: CanonicalJob[] = [];
    const duplicates: Array<{
      job: CanonicalJob;
      duplicateReason: string;
      matchedKey: string;
    }> = [];

    // Track keys within the current batch to avoid internal duplicates
    const batchSourceKeys = new Set<string>();
    const batchUrls = new Set<string>();
    const batchCompositeKeys = new Set<string>();

    for (const job of incomingJobs) {
      const { sourceKey, urlKey, compositeKey } = computeJobFingerprint(job);

      // 1. Check Source Job ID match
      if (sourceKey && (this.knownSourceKeys.has(sourceKey) || batchSourceKeys.has(sourceKey))) {
        duplicates.push({
          job,
          duplicateReason: 'Source-specific job ID already registered',
          matchedKey: sourceKey
        });
        continue;
      }

      // 2. Check Canonical URL match
      if (this.knownUrls.has(urlKey) || batchUrls.has(urlKey)) {
        duplicates.push({
          job,
          duplicateReason: 'Canonical job URL already exists in database',
          matchedKey: urlKey
        });
        continue;
      }

      // 3. Check Normalized Composite Key (Company + Title + Country)
      if (this.knownCompositeKeys.has(compositeKey) || batchCompositeKeys.has(compositeKey)) {
        duplicates.push({
          job,
          duplicateReason: 'Composite signature match (company, title, and region match existing record)',
          matchedKey: compositeKey
        });
        continue;
      }

      // Unique: add to batch tracking and result list
      if (sourceKey) batchSourceKeys.add(sourceKey);
      batchUrls.add(urlKey);
      batchCompositeKeys.add(compositeKey);
      uniqueJobs.push(job);
    }

    return {
      uniqueJobs,
      duplicates,
      totalIncoming: incomingJobs.length,
      uniqueCount: uniqueJobs.length,
      duplicateCount: duplicates.length
    };
  }
}
