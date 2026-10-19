import type { CanonicalJob, CollectionRun, JobSourceConfig, SearchPreferences } from '../types/job.ts';
import { StorageService } from './storage.ts';
import { createConnector } from '../connectors/factory.ts';
import { normalizeRawJob } from './normalizer.ts';
import { DeduplicationEngine } from './deduplicator.ts';

let activeRunAbortController: AbortController | null = null;
let currentActiveRunId: string | null = null;

export class CollectionService {
  public static getActiveRunId(): string | null {
    return currentActiveRunId;
  }

  public static cancelCurrentRun(): boolean {
    if (activeRunAbortController && currentActiveRunId) {
      activeRunAbortController.abort();
      StorageService.updateRun(currentActiveRunId, {
        status: 'cancelled',
        finished_at: new Date().toISOString()
      });
      currentActiveRunId = null;
      activeRunAbortController = null;
      return true;
    }
    return false;
  }

  public static async executeCollection(sourceIds?: string[]): Promise<CollectionRun> {
    const preferences: SearchPreferences = StorageService.getPreferences();
    const allSources = StorageService.getSources();

    const selectedSources = sourceIds && sourceIds.length > 0
      ? allSources.filter(s => sourceIds.includes(s.id))
      : allSources.filter(s => s.enabled);

    if (selectedSources.length === 0) {
      throw new Error('No sources enabled or selected for collection');
    }

    const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    currentActiveRunId = runId;
    activeRunAbortController = new AbortController();

    const run: CollectionRun = {
      id: runId,
      started_at: new Date().toISOString(),
      status: 'running',
      sources_selected: selectedSources.map(s => s.id),
      sources_completed: [],
      sources_failed: [],
      total_discovered: 0,
      total_valid: 0,
      total_new: 0,
      total_duplicates: 0,
      total_rejected: 0,
      synced_to_sheets: 0,
      log: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Collection started for ${selectedSources.length} source(s): ${selectedSources.map(s => s.name).join(', ')}`
        }
      ]
    };

    StorageService.addRun(run);

    const validCandidateJobs: CanonicalJob[] = [];

    for (const source of selectedSources) {
      if (activeRunAbortController.signal.aborted) {
        run.log.push({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'Collection cancelled by user'
        });
        run.status = 'cancelled';
        run.finished_at = new Date().toISOString();
        StorageService.updateRun(runId, run);
        currentActiveRunId = null;
        return run;
      }

      run.log.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        source: source.name,
        message: `Connecting to ${source.name} (${source.type})...`
      });
      StorageService.updateRun(runId, { log: run.log });

      const connector = createConnector(source);
      let connectorResult;

      try {
        connectorResult = await connector.discoverJobs(preferences);
      } catch (err: any) {
        connectorResult = { success: false, discoveredJobs: [], error: err.message || 'Unknown network error' };
      }

      if (!connectorResult.success) {
        run.sources_failed.push({ source_id: source.id, error: connectorResult.error || 'Failed' });
        run.log.push({
          timestamp: new Date().toISOString(),
          level: 'error',
          source: source.name,
          message: `Source error: ${connectorResult.error}`
        });

        StorageService.updateSource(source.id, {
          health: 'error',
          total_failed: source.total_failed + 1,
          last_error: connectorResult.error
        });
        continue;
      }

      const rawCount = connectorResult.discoveredJobs.length;
      run.total_discovered += rawCount;
      run.sources_completed.push(source.id);

      run.log.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        source: source.name,
        message: `Discovered ${rawCount} raw listings. Running normalization & US/Canada eligibility checks...`
      });

      let sourceValidCount = 0;
      let sourceRejectedCount = 0;

      for (const raw of connectorResult.discoveredJobs) {
        const norm = normalizeRawJob(raw, source.name, preferences);
        if (norm.isValid && norm.job) {
          validCandidateJobs.push(norm.job);
          sourceValidCount++;
        } else {
          sourceRejectedCount++;
          run.total_rejected++;
        }
      }

      run.total_valid += sourceValidCount;

      run.log.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        source: source.name,
        message: `${sourceValidCount} passed validation, ${sourceRejectedCount} filtered out.`
      });

      StorageService.updateSource(source.id, {
        health: 'healthy',
        last_run_at: new Date().toISOString(),
        total_discovered: source.total_discovered + rawCount,
        last_error: undefined
      });

      StorageService.updateRun(runId, {
        sources_completed: run.sources_completed,
        sources_failed: run.sources_failed,
        total_discovered: run.total_discovered,
        total_valid: run.total_valid,
        total_rejected: run.total_rejected,
        log: run.log
      });
    }

    // Step 2: Deduplication against existing repository records and batch
    run.log.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Executing deduplication across ${validCandidateJobs.length} normalized candidate listings...`
    });

    const existingJobs = StorageService.getJobs();
    const dedupeEngine = new DeduplicationEngine(existingJobs);
    const dedupeResult = dedupeEngine.processBatch(validCandidateJobs);

    run.total_new = dedupeResult.uniqueCount;
    run.total_duplicates = dedupeResult.duplicateCount;

    run.log.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Deduplication complete: ${dedupeResult.uniqueCount} genuinely new vacancies found, ${dedupeResult.duplicateCount} duplicates rejected.`
    });

    // Step 3: Persist new jobs into database
    if (dedupeResult.uniqueJobs.length > 0) {
      StorageService.addJobs(dedupeResult.uniqueJobs);
    }

    // Update source stats with new vs duplicate breakdown
    for (const source of selectedSources) {
      const sourceNew = dedupeResult.uniqueJobs.filter(j => j.source_name.includes(source.name) || source.name.includes(j.source_name)).length;
      const sourceDups = dedupeResult.duplicates.filter(d => d.job.source_name.includes(source.name) || source.name.includes(d.job.source_name)).length;
      StorageService.updateSource(source.id, {
        total_new: source.total_new + sourceNew,
        total_duplicates: source.total_duplicates + sourceDups
      });
    }

    // Step 4: Finalize Run Status
    const finalStatus = run.sources_failed.length > 0
      ? (run.sources_completed.length > 0 ? 'completed_with_errors' : 'failed')
      : 'completed';

    run.status = finalStatus;
    run.finished_at = new Date().toISOString();
    run.log.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Collection run finished with status: ${finalStatus}. Total new jobs saved: ${run.total_new}`
    });

    StorageService.updateRun(runId, run);
    currentActiveRunId = null;
    activeRunAbortController = null;

    return run;
  }
}
