import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRawJob, canonicalizeUrl, parseRemoteAndEligibility } from './normalizer.ts';
import { DeduplicationEngine } from './deduplicator.ts';

test('URL canonicalization strips tracking queries and hashes', () => {
  const dirty = 'https://boards.greenhouse.io/gitlab/jobs/12345?gh_src=linkedin&utm_source=feed#apply';
  const clean = canonicalizeUrl(dirty);
  assert.equal(clean, 'https://boards.greenhouse.io/gitlab/jobs/12345');
});

test('parseRemoteAndEligibility correctly identifies US & Canada Remote', () => {
  const res1 = parseRemoteAndEligibility('Remote - US');
  assert.equal(res1.remote_type, 'Remote');
  assert.equal(res1.country_eligibility, 'US');
  assert.equal(res1.is_us_ca_eligible, true);

  const res2 = parseRemoteAndEligibility('Remote, Toronto, ON');
  assert.equal(res2.remote_type, 'Remote');
  assert.equal(res2.country_eligibility, 'Canada');
  assert.equal(res2.is_us_ca_eligible, true);

  const res3 = parseRemoteAndEligibility('Remote - Americas');
  assert.equal(res3.country_eligibility, 'US & Canada');
  assert.equal(res3.is_us_ca_eligible, true);

  const res4 = parseRemoteAndEligibility('Remote - London, UK (EMEA only)');
  assert.equal(res4.is_us_ca_eligible, false);
  assert.equal(res4.country_eligibility, 'Restricted');
});

test('normalizeRawJob filters non-engineering roles and accepts software engineers', () => {
  const invalid = normalizeRawJob({
    title: 'Senior Marketing Manager',
    company: 'Acme Corp',
    url: 'https://example.com/job/1',
    location: 'Remote - US'
  }, 'Test');
  assert.equal(invalid.isValid, false);
  assert.match(invalid.rejectionReason || '', /outside software engineering/);

  const valid = normalizeRawJob({
    title: 'Senior Full-Stack Engineer (React / Node)',
    company: 'Stripe, Inc.',
    url: 'https://stripe.com/jobs/1234?utm_source=twitter',
    location: 'Remote - United States',
    sourceJobId: 'str-1234'
  }, 'Greenhouse');
  assert.equal(valid.isValid, true);
  assert.equal(valid.job?.company_name, 'Stripe, Inc.');
  assert.equal(valid.job?.country_eligibility, 'US');
  assert.equal(valid.job?.is_us_ca_eligible, true);
  assert.equal(valid.job?.job_url, 'https://stripe.com/jobs/1234');
});

test('DeduplicationEngine detects duplicate records via URL, source ID, and composite key', () => {
  const existingJob = {
    job_id: 'job_1',
    job_title: 'Staff Backend Engineer',
    company_name: 'Figma',
    job_url: 'https://boards.greenhouse.io/figma/jobs/999',
    location: 'Remote - US',
    source_name: 'Greenhouse',
    collected_at: new Date().toISOString(),
    remote_type: 'Remote' as const,
    country_eligibility: 'US' as const,
    is_us_ca_eligible: true,
    source_job_id: 'figma-999',
    last_verified_at: new Date().toISOString(),
    duplicate_key: 'greenhouse:figma-999',
    review_required: false,
    sync_status: 'pending' as const
  };

  const engine = new DeduplicationEngine([existingJob]);

  // Test 1: exact same source ID
  const dup1 = { ...existingJob, job_id: 'job_2', job_url: 'https://different-url.com' };
  const res1 = engine.processBatch([dup1]);
  assert.equal(res1.uniqueCount, 0);
  assert.equal(res1.duplicateCount, 1);
  assert.match(res1.duplicates[0].duplicateReason, /source-specific job id/i);

  // Test 2: different source ID but same URL with tracking params
  const dup2 = {
    ...existingJob,
    job_id: 'job_3',
    source_job_id: 'other-source-id',
    job_url: 'https://boards.greenhouse.io/figma/jobs/999?utm_medium=cpc'
  };
  const res2 = engine.processBatch([dup2]);
  assert.equal(res2.uniqueCount, 0);
  assert.equal(res2.duplicateCount, 1);
  assert.match(res2.duplicates[0].duplicateReason, /canonical job url/i);

  // Test 3: Genuinely new job
  const newJob = {
    ...existingJob,
    job_id: 'job_4',
    job_title: 'Frontend Engineer',
    company_name: 'Datadog',
    job_url: 'https://careers.datadog.com/jobs/888',
    source_job_id: 'datadog-888'
  };
  const res3 = engine.processBatch([newJob]);
  assert.equal(res3.uniqueCount, 1);
  assert.equal(res3.duplicateCount, 0);
});
