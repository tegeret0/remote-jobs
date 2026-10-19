import type { CanonicalJob, CountryEligibility, RemoteType, SearchPreferences } from '../types/job.ts';

export const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

export const CA_PROVINCE_CODES = new Set([
  'ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'
]);

export function cleanText(input?: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, ' ') // Strip HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCompanyName(company: string): string {
  if (!company) return '';
  return company
    .replace(/\b(Inc\.?|LLC\.?|Corp\.?|Corporation|Ltd\.?|Limited|Co\.?|Technologies|Tech)\b/gi, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase();
}

export function canonicalizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl.trim());
    // Strip common tracking and referral query params
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'gh_src', 'gh_jid', 'source', 'lever-source', 'lever-origin',
      'fbclid', 'gclid', 'msclkid', 'trk', 'trackingId'
    ];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }
    // Remove hash/fragment
    parsed.hash = '';
    // Strip trailing slash on path if length > 1
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;
    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

export interface EligibilityResult {
  remote_type: RemoteType;
  country_eligibility: CountryEligibility;
  is_us_ca_eligible: boolean;
  notes: string;
}

export function parseRemoteAndEligibility(locationStr: string, descriptionText: string = ''): EligibilityResult {
  const combined = `${locationStr} ${descriptionText}`.toLowerCase();
  const loc = locationStr.toLowerCase();

  // 1. Determine Remote Status
  let remote_type: RemoteType = 'Unspecified';
  if (
    loc.includes('remote') ||
    loc.includes('anywhere') ||
    loc.includes('work from home') ||
    loc.includes('telecommute') ||
    loc.includes('distributed') ||
    loc.includes('virtual')
  ) {
    remote_type = 'Remote';
  } else if (loc.includes('hybrid')) {
    remote_type = 'Hybrid';
  } else if (loc.includes('on-site') || loc.includes('onsite') || loc.includes('in-office')) {
    remote_type = 'On-site';
  } else if (combined.includes('100% remote') || combined.includes('fully remote')) {
    remote_type = 'Remote';
  }

  // 2. Disqualify explicit non-US/CA exclusions
  const hasEuropeRestriction =
    combined.includes('emea only') ||
    combined.includes('europe only') ||
    combined.includes('uk only') ||
    combined.includes('germany only') ||
    combined.includes('latam only') ||
    combined.includes('apac only') ||
    combined.includes('australia only');

  if (hasEuropeRestriction) {
    return {
      remote_type,
      country_eligibility: 'Restricted',
      is_us_ca_eligible: false,
      notes: 'Restricted to region outside US and Canada'
    };
  }

  // 3. Country Matching
  let matchesUS = false;
  let matchesCA = false;

  if (
    loc.includes('united states') ||
    loc.includes('usa') ||
    loc.includes('u.s.') ||
    /\bus\b/i.test(locationStr) ||
    loc.includes('remote - us') ||
    loc.includes('us remote')
  ) {
    matchesUS = true;
  }

  if (
    loc.includes('canada') ||
    loc.includes('remote - ca') ||
    loc.includes('canada remote') ||
    loc.includes('ca remote') ||
    loc.includes('toronto') ||
    loc.includes('vancouver') ||
    loc.includes('montreal') ||
    loc.includes('ottawa') ||
    loc.includes('calgary')
  ) {
    matchesCA = true;
  }

  // Check state / province tokens e.g. "San Francisco, CA" or "Austin, TX"
  const tokens = locationStr.split(/[\s,/-]+/).map(t => t.trim().toUpperCase());
  for (const token of tokens) {
    if (US_STATE_CODES.has(token) && !matchesUS) {
      matchesUS = true;
    }
    if (CA_PROVINCE_CODES.has(token) && !matchesCA) {
      matchesCA = true;
    }
  }

  // Check for North America / Americas
  if (loc.includes('north america') || loc.includes('americas') || (matchesUS && matchesCA)) {
    return {
      remote_type: remote_type === 'Unspecified' ? 'Remote' : remote_type,
      country_eligibility: 'US & Canada',
      is_us_ca_eligible: true,
      notes: 'Eligible for US & Canadian candidates'
    };
  }

  if (matchesUS && !matchesCA) {
    return {
      remote_type: remote_type === 'Unspecified' ? 'Remote' : remote_type,
      country_eligibility: 'US',
      is_us_ca_eligible: true,
      notes: 'Eligible for US candidates'
    };
  }

  if (matchesCA && !matchesUS) {
    return {
      remote_type: remote_type === 'Unspecified' ? 'Remote' : remote_type,
      country_eligibility: 'Canada',
      is_us_ca_eligible: true,
      notes: 'Eligible for Canadian candidates'
    };
  }

  // Worldwide or Anywhere
  if (loc.includes('worldwide') || loc.includes('anywhere') || loc.includes('global')) {
    return {
      remote_type: 'Remote',
      country_eligibility: 'Worldwide',
      is_us_ca_eligible: true,
      notes: 'Worldwide remote opportunity (accessible to US/CA)'
    };
  }

  return {
    remote_type,
    country_eligibility: 'Other',
    is_us_ca_eligible: false,
    notes: 'Location does not explicitly confirm US or Canada eligibility'
  };
}

export interface NormalizationOutput {
  isValid: boolean;
  job?: CanonicalJob;
  rejectionReason?: string;
}

export function normalizeRawJob(
  raw: {
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
  },
  sourceName: string,
  preferences?: Partial<SearchPreferences>
): NormalizationOutput {
  const title = cleanText(raw.title);
  const company = cleanText(raw.company);
  const url = canonicalizeUrl(raw.url);

  // 1. Mandatory field validation
  if (!title || title.length < 3) {
    return { isValid: false, rejectionReason: 'Missing or invalid job title' };
  }
  if (!company || company.length < 2) {
    return { isValid: false, rejectionReason: 'Missing or invalid company name' };
  }
  if (!url || !url.startsWith('http')) {
    return { isValid: false, rejectionReason: 'Missing or malformed job URL' };
  }

  // 2. Keyword relevance check for engineering target
  const lowerTitle = title.toLowerCase();
  const engineeringRoles = [
    'engineer', 'developer', 'architect', 'full stack', 'fullstack',
    'front end', 'frontend', 'back end', 'backend', 'web', 'devops',
    'sre', 'platform', 'cloud', 'systems', 'infrastructure'
  ];
  const isEngineering = engineeringRoles.some(role => lowerTitle.includes(role));
  if (!isEngineering) {
    return { isValid: false, rejectionReason: 'Job title is outside software engineering target categories' };
  }

  // 3. Excluded keywords check (e.g. Intern, Unpaid, Sales)
  const excluded = ['intern', 'internship', 'unpaid', 'volunteer', 'tutor'];
  if (preferences?.excluded_keywords?.length) {
    for (const kw of preferences.excluded_keywords) {
      if (kw.trim() && lowerTitle.includes(kw.trim().toLowerCase())) {
        return { isValid: false, rejectionReason: `Matched user excluded keyword: ${kw}` };
      }
    }
  }
  for (const ex of excluded) {
    if (lowerTitle.includes(ex)) {
      return { isValid: false, rejectionReason: `Excluded role type: ${ex}` };
    }
  }

  // 4. Remote & Eligibility Check
  const locationRaw = cleanText(raw.location) || 'Remote';
  const eligibility = parseRemoteAndEligibility(locationRaw, raw.description || '');

  if (preferences?.remote_only && eligibility.remote_type !== 'Remote') {
    return { isValid: false, rejectionReason: `Filtered out: not remote-first (${eligibility.remote_type})` };
  }

  // Check target countries filter if specified
  if (preferences?.target_countries?.length) {
    if (!eligibility.is_us_ca_eligible) {
      return { isValid: false, rejectionReason: `Restricted: Not eligible for US/Canada target (${eligibility.country_eligibility})` };
    }
  }

  // 5. Generate duplicate composite key
  const normCompany = normalizeCompanyName(company);
  const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normLoc = eligibility.country_eligibility;
  const duplicateKey = raw.sourceJobId
    ? `${sourceName.toLowerCase()}:${raw.sourceJobId}`
    : `${normCompany}|${normTitle}|${normLoc}`;

  // 6. Assemble CanonicalJob
  const jobId = `job_${Buffer.from(url).toString('base64url').slice(0, 16)}_${Date.now().toString(36)}`;

  let salaryFormatted = undefined;
  if (raw.salaryMin || raw.salaryMax) {
    const cur = raw.salaryCurrency || 'USD';
    if (raw.salaryMin && raw.salaryMax) {
      salaryFormatted = `${cur} $${raw.salaryMin.toLocaleString()} - $${raw.salaryMax.toLocaleString()}`;
    } else if (raw.salaryMin) {
      salaryFormatted = `${cur} $${raw.salaryMin.toLocaleString()}+`;
    }
  }

  const job: CanonicalJob = {
    job_id: jobId,
    job_title: title,
    company_name: company,
    job_url: url,
    location: locationRaw,
    source_name: sourceName,
    collected_at: new Date().toISOString(),
    original_posting_date: raw.datePosted || new Date().toISOString(),
    employment_type: raw.employmentType || 'Full-time',
    remote_type: eligibility.remote_type,
    country_eligibility: eligibility.country_eligibility,
    is_us_ca_eligible: eligibility.is_us_ca_eligible,
    salary_min: raw.salaryMin,
    salary_max: raw.salaryMax,
    salary_currency: raw.salaryCurrency || 'USD',
    salary_formatted: salaryFormatted,
    job_description: raw.description ? cleanText(raw.description).slice(0, 3000) : undefined,
    source_job_id: raw.sourceJobId,
    application_url: raw.applyUrl ? canonicalizeUrl(raw.applyUrl) : url,
    last_verified_at: new Date().toISOString(),
    duplicate_key: duplicateKey,
    review_required: !eligibility.is_us_ca_eligible || eligibility.country_eligibility === 'Worldwide',
    sync_status: 'pending'
  };

  return { isValid: true, job };
}
