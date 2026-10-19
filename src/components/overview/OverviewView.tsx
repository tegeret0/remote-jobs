import React from 'react';
import {
  Briefcase,
  Layers,
  CopyCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  Globe,
  Database
} from 'lucide-react';
import type { CanonicalJob, CollectionRun, JobSourceConfig, SheetConfig } from '../../types/job.ts';

interface OverviewViewProps {
  jobs: CanonicalJob[];
  sources: JobSourceConfig[];
  runs: CollectionRun[];
  sheetConfig: SheetConfig;
  onNavigate: (tab: string) => void;
  onRunCollection: () => void;
  isRunning: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  jobs,
  sources,
  runs,
  sheetConfig,
  onNavigate,
  onRunCollection,
  isRunning
}) => {
  const totalJobs = jobs.length;
  const today = new Date().toISOString().slice(0, 10);
  const newToday = jobs.filter(j => j.collected_at.startsWith(today)).length;
  const syncedJobs = jobs.filter(j => j.sync_status === 'synced').length;
  const pendingSync = jobs.filter(j => j.sync_status === 'pending').length;

  const totalDupsRejected = sources.reduce((acc, s) => acc + (s.total_duplicates || 0), 0);
  const totalDiscovered = sources.reduce((acc, s) => acc + (s.total_discovered || 0), 0);
  const dupRate = totalDiscovered > 0 ? Math.round((totalDupsRejected / totalDiscovered) * 100) : 0;

  // Breakdown by country
  const usCount = jobs.filter(j => j.country_eligibility === 'US').length;
  const caCount = jobs.filter(j => j.country_eligibility === 'Canada').length;
  const bothCount = jobs.filter(j => j.country_eligibility === 'US & Canada').length;
  const worldwideCount = jobs.filter(j => j.country_eligibility === 'Worldwide').length;

  const lastRun = runs[0];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100">
            Intelligence Overview
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Real-time status of multi-source job collection, US/CA eligibility filtering, and Google Sheets pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('collection')}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition"
          >
            Collection Console
          </button>
          <button
            onClick={onRunCollection}
            disabled={isRunning}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition shadow-sm"
          >
            {isRunning ? 'Run in progress...' : 'Trigger Run Now'}
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Unique Jobs</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-2 font-mono">{totalJobs}</div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-cyan-400">
            <span>{newToday} discovered today</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Duplicates Filtered</span>
            <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-800/50 flex items-center justify-center text-teal-400">
              <CopyCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-2 font-mono">{totalDupsRejected}</div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-teal-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{dupRate}% deduplication rate</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Google Sheets Synced</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-2 font-mono">{syncedJobs}</div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-zinc-400">
            <span>{pendingSync} pending export</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Active Sources</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-2 font-mono">
            {sources.filter(s => s.enabled).length} <span className="text-sm font-normal text-zinc-500">/ {sources.length}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>All healthy</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Country Distribution & Last Run Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country Eligibility Card */}
        <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Geographic Distribution</span>
            </h3>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Target: US & CA</span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs text-zinc-300 mb-1">
                <span>United States Only</span>
                <span className="font-mono text-cyan-400 font-medium">{usCount}</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full"
                  style={{ width: `${totalJobs ? Math.round((usCount / totalJobs) * 100) : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-300 mb-1">
                <span>Canada Only</span>
                <span className="font-mono text-teal-400 font-medium">{caCount}</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full"
                  style={{ width: `${totalJobs ? Math.round((caCount / totalJobs) * 100) : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-300 mb-1">
                <span>US & Canada (Dual Open)</span>
                <span className="font-mono text-emerald-400 font-medium">{bothCount}</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${totalJobs ? Math.round((bothCount / totalJobs) * 100) : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-300 mb-1">
                <span>Worldwide Remote (US/CA Eligible)</span>
                <span className="font-mono text-zinc-400 font-medium">{worldwideCount}</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-600 rounded-full"
                  style={{ width: `${totalJobs ? Math.round((worldwideCount / totalJobs) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed">
            * Every job is validated through our geographic normalization parser to prevent cross-border ineligibility surprises.
          </div>
        </div>

        {/* Most Recent Collection Run */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <span>Latest Collection Execution</span>
            </h3>
            {lastRun && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${
                lastRun.status === 'completed'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : lastRun.status === 'completed_with_errors'
                  ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                  : lastRun.status === 'running'
                  ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800 animate-pulse'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {lastRun.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {lastRun ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/60 p-4 rounded-lg border border-zinc-800">
                <div>
                  <div className="text-[11px] text-zinc-500">Raw Discovered</div>
                  <div className="text-lg font-bold text-zinc-200 font-mono mt-0.5">{lastRun.total_discovered}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">Passed Criteria</div>
                  <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{lastRun.total_valid}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">New Stored</div>
                  <div className="text-lg font-bold text-teal-400 font-mono mt-0.5">{lastRun.total_new}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">Duplicates Rejected</div>
                  <div className="text-lg font-bold text-zinc-400 font-mono mt-0.5">{lastRun.total_duplicates}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs text-zinc-400 font-medium">Recent Run Log:</div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 font-mono text-[11px] text-zinc-400 space-y-1 max-h-36 overflow-y-auto">
                  {lastRun.log.slice(-4).map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-zinc-600 shrink-0">{entry.timestamp.slice(11, 19)}</span>
                      <span className={
                        entry.level === 'error' ? 'text-red-400' :
                        entry.level === 'warn' ? 'text-amber-400' : 'text-zinc-300'
                      }>
                        {entry.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-zinc-500">Started at: {new Date(lastRun.started_at).toLocaleString()}</span>
                <button
                  onClick={() => onNavigate('history')}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                >
                  <span>Full History</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="text-sm text-zinc-300 font-medium">No Collection Runs Yet</div>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Click "Run Collection" to query configured Greenhouse, Lever, and Remotive sources for remote engineering vacancies.
              </p>
              <button
                onClick={onRunCollection}
                disabled={isRunning}
                className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition"
              >
                Execute First Collection Run
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Source Health Table Summary */}
      <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Configured Connectors & Health</span>
          </h3>
          <button
            onClick={() => onNavigate('sources')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>Manage Sources</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/60 text-zinc-500 uppercase text-[10px] font-mono border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">Source Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Discovered</th>
                <th className="py-2.5 px-3">New Stored</th>
                <th className="py-2.5 px-3">Duplicates</th>
                <th className="py-2.5 px-3">Last Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {sources.map(s => (
                <tr key={s.id} className="hover:bg-zinc-900/40">
                  <td className="py-2.5 px-3 font-medium text-zinc-200">{s.name}</td>
                  <td className="py-2.5 px-3 font-mono text-zinc-400 uppercase text-[10px]">{s.type}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      s.health === 'healthy' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900' :
                      s.health === 'error' ? 'text-red-400 bg-red-950/60 border border-red-900' :
                      'text-zinc-400 bg-zinc-900 border border-zinc-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.health === 'healthy' ? 'bg-emerald-400' : s.health === 'error' ? 'bg-red-400' : 'bg-zinc-400'}`} />
                      {s.health}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{s.total_discovered}</td>
                  <td className="py-2.5 px-3 font-mono text-teal-400">{s.total_new}</td>
                  <td className="py-2.5 px-3 font-mono text-zinc-500">{s.total_duplicates}</td>
                  <td className="py-2.5 px-3 text-zinc-500">
                    {s.last_run_at ? new Date(s.last_run_at).toLocaleDateString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
