import fs from 'node:fs';
import path from 'node:path';
import type { CanonicalJob, CollectionRun, JobSourceConfig, SearchPreferences, SheetConfig } from '../types/job.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function safeReadJson<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    safeWriteJson(filename, defaultValue);
    return defaultValue;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filename}, returning default:`, err);
    return defaultValue;
  }
}

function safeWriteJson<T>(filename: string, data: T) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const tempPath = path.join(DATA_DIR, `${filename}.tmp.${Date.now()}`);
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
    console.error(`Failed atomic write for ${filename}:`, err);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

const DEFAULT_SOURCES: JobSourceConfig[] = [
  {
    id: 'src_greenhouse_gitlab',
    name: 'GitLab (Greenhouse)',
    type: 'greenhouse',
    identifier: 'gitlab',
    base_url: 'https://boards-api.greenhouse.io/v1/boards/gitlab/jobs?content=true',
    enabled: true,
    health: 'healthy',
    total_discovered: 0,
    total_new: 0,
    total_duplicates: 0,
    total_failed: 0
  },
  {
    id: 'src_greenhouse_automattic',
    name: 'Automattic (Greenhouse)',
    type: 'greenhouse',
    identifier: 'automattic',
    base_url: 'https://boards-api.greenhouse.io/v1/boards/automattic/jobs?content=true',
    enabled: true,
    health: 'healthy',
    total_discovered: 0,
    total_new: 0,
    total_duplicates: 0,
    total_failed: 0
  },
  {
    id: 'src_greenhouse_figma',
    name: 'Figma (Greenhouse)',
    type: 'greenhouse',
    identifier: 'figma',
    base_url: 'https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true',
    enabled: true,
    health: 'healthy',
    total_discovered: 0,
    total_new: 0,
    total_duplicates: 0,
    total_failed: 0
  },
  {
    id: 'src_remotive_eng',
    name: 'Remotive Engineering Feed',
    type: 'remotive',
    identifier: 'software-dev',
    base_url: 'https://remotive.com/api/remote-jobs?category=software-dev&limit=40',
    enabled: true,
    health: 'healthy',
    total_discovered: 0,
    total_new: 0,
    total_duplicates: 0,
    total_failed: 0
  },
  {
    id: 'src_lever_postings',
    name: 'Postman (Lever)',
    type: 'lever',
    identifier: 'postman',
    base_url: 'https://api.lever.co/v0/postings/postman?mode=json',
    enabled: true,
    health: 'healthy',
    total_discovered: 0,
    total_new: 0,
    total_duplicates: 0,
    total_failed: 0
  }
];

const DEFAULT_PREFERENCES: SearchPreferences = {
  target_countries: ['US', 'Canada'],
  remote_only: true,
  included_keywords: [
    'Software Engineer', 'Full-Stack', 'Frontend', 'Backend',
    'Full Stack', 'Developer', 'Web Developer', 'DevOps'
  ],
  excluded_keywords: ['intern', 'internship', 'unpaid', 'tutor', 'sales'],
  seniority_levels: ['Junior', 'Mid', 'Senior', 'Staff', 'Lead', 'Principal'],
  employment_types: ['Full-time', 'Contract'],
  min_salary: 0,
  max_freshness_days: 30,
  auto_sync: false,
  review_mode: false
};

const DEFAULT_SHEET_CONFIG: SheetConfig = {
  spreadsheet_id: '',
  spreadsheet_url: '',
  sheet_name: 'Remote Jobs',
  total_rows_synced: 0,
  auto_sync_enabled: false
};

export class StorageService {
  public static getJobs(): CanonicalJob[] {
    return safeReadJson<CanonicalJob[]>('jobs.json', []);
  }

  public static saveJobs(jobs: CanonicalJob[]) {
    safeWriteJson('jobs.json', jobs);
  }

  public static addJobs(newJobs: CanonicalJob[]) {
    const existing = this.getJobs();
    const existingMap = new Map(existing.map(j => [j.job_id, j]));
    for (const job of newJobs) {
      existingMap.set(job.job_id, job);
    }
    const combined = Array.from(existingMap.values());
    this.saveJobs(combined);
    return combined;
  }

  public static updateJob(jobId: string, updates: Partial<CanonicalJob>): CanonicalJob | null {
    const jobs = this.getJobs();
    const idx = jobs.findIndex(j => j.job_id === jobId);
    if (idx === -1) return null;
    jobs[idx] = { ...jobs[idx], ...updates };
    this.saveJobs(jobs);
    return jobs[idx];
  }

  public static getSources(): JobSourceConfig[] {
    return safeReadJson<JobSourceConfig[]>('sources.json', DEFAULT_SOURCES);
  }

  public static saveSources(sources: JobSourceConfig[]) {
    safeWriteJson('sources.json', sources);
  }

  public static updateSource(sourceId: string, updates: Partial<JobSourceConfig>): JobSourceConfig | null {
    const sources = this.getSources();
    const idx = sources.findIndex(s => s.id === sourceId);
    if (idx === -1) return null;
    sources[idx] = { ...sources[idx], ...updates };
    this.saveSources(sources);
    return sources[idx];
  }

  public static addSource(source: Omit<JobSourceConfig, 'id' | 'total_discovered' | 'total_new' | 'total_duplicates' | 'total_failed'>): JobSourceConfig {
    const sources = this.getSources();
    const id = `src_${source.type}_${Date.now().toString(36)}`;
    const newSource: JobSourceConfig = {
      ...source,
      id,
      health: 'untested',
      total_discovered: 0,
      total_new: 0,
      total_duplicates: 0,
      total_failed: 0
    };
    sources.push(newSource);
    this.saveSources(sources);
    return newSource;
  }

  public static deleteSource(sourceId: string): boolean {
    const sources = this.getSources();
    const filtered = sources.filter(s => s.id !== sourceId);
    if (filtered.length !== sources.length) {
      this.saveSources(filtered);
      return true;
    }
    return false;
  }

  public static getRuns(): CollectionRun[] {
    return safeReadJson<CollectionRun[]>('runs.json', []);
  }

  public static saveRuns(runs: CollectionRun[]) {
    safeWriteJson('runs.json', runs);
  }

  public static addRun(run: CollectionRun) {
    const runs = this.getRuns();
    runs.unshift(run); // Most recent first
    if (runs.length > 50) runs.pop();
    this.saveRuns(runs);
  }

  public static updateRun(runId: string, updates: Partial<CollectionRun>): CollectionRun | null {
    const runs = this.getRuns();
    const idx = runs.findIndex(r => r.id === runId);
    if (idx === -1) return null;
    runs[idx] = { ...runs[idx], ...updates };
    this.saveRuns(runs);
    return runs[idx];
  }

  public static getPreferences(): SearchPreferences {
    return safeReadJson<SearchPreferences>('preferences.json', DEFAULT_PREFERENCES);
  }

  public static savePreferences(prefs: SearchPreferences) {
    safeWriteJson('preferences.json', prefs);
  }

  public static getSheetConfig(): SheetConfig {
    return safeReadJson<SheetConfig>('sheets.json', DEFAULT_SHEET_CONFIG);
  }

  public static saveSheetConfig(config: SheetConfig) {
    safeWriteJson('sheets.json', config);
  }
}
