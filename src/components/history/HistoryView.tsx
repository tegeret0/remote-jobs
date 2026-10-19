import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Terminal,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { CollectionRun } from '../../types/job.ts';

interface HistoryViewProps {
  runs: CollectionRun[];
  onNavigate: (tab: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ runs, onNavigate }) => {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(runs[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedRunId(prev => (prev === id ? null : id));
  };

  const calculateDuration = (start: string, end?: string): string => {
    if (!end) return 'Running...';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const sec = Math.max(0, Math.round((e - s) / 1000));
    return `${sec}s`;
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Collection Audit Log</span>
            <span className="text-xs font-mono font-normal text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {runs.length} Recorded Runs
            </span>
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Historical audit logs of discovery volumes, duplicate exclusions, and per-source execution states.
          </p>
        </div>

        <button
          onClick={() => onNavigate('collection')}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs rounded-lg transition"
        >
          Launch New Collection
        </button>
      </div>

      {/* Runs Table */}
      <div className="bg-zinc-900/60 rounded-xl border border-zinc-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] font-mono border-b border-zinc-800 select-none">
              <tr>
                <th className="py-3 px-3 w-8"></th>
                <th className="py-3 px-3">Run ID & Timestamp</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Sources Covered</th>
                <th className="py-3 px-3">Discovered</th>
                <th className="py-3 px-3">New Stored</th>
                <th className="py-3 px-3">Duplicates</th>
                <th className="py-3 px-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {runs.length > 0 ? (
                runs.map(run => {
                  const isExpanded = expandedRunId === run.id;
                  const duration = calculateDuration(run.started_at, run.finished_at);

                  return (
                    <React.Fragment key={run.id}>
                      <tr
                        onClick={() => toggleExpand(run.id)}
                        className={`hover:bg-zinc-850/50 transition cursor-pointer ${
                          isExpanded ? 'bg-zinc-850/40' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-zinc-500">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-mono text-xs font-semibold text-zinc-200">
                            {run.id}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {new Date(run.started_at).toLocaleString()}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                              run.status === 'completed'
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                                : run.status === 'completed_with_errors'
                                ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                                : run.status === 'running'
                                ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800 animate-pulse'
                                : 'bg-red-950/80 text-red-400 border-red-800'
                            }`}
                          >
                            {run.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] text-zinc-400">
                          {run.sources_completed.length} / {run.sources_selected.length} OK
                          {run.sources_failed.length > 0 && (
                            <span className="text-red-400 ml-1">({run.sources_failed.length} failed)</span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono text-zinc-300">
                          {run.total_discovered}
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-teal-400">
                          +{run.total_new}
                        </td>

                        <td className="py-3 px-3 font-mono text-zinc-500">
                          {run.total_duplicates}
                        </td>

                        <td className="py-3 px-3 font-mono text-zinc-400">
                          {duration}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-zinc-950 p-4 border-b border-zinc-800">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs text-zinc-400">
                                <span className="font-semibold flex items-center gap-1.5 text-zinc-300">
                                  <Terminal className="w-3.5 h-3.5 text-teal-400" />
                                  <span>Execution Event Stream ({run.log?.length || 0} entries)</span>
                                </span>
                                <span className="font-mono text-[10px] text-zinc-500">
                                  Started: {run.started_at}
                                </span>
                              </div>

                              <div className="bg-zinc-900/90 rounded-lg p-3 border border-zinc-800 font-mono text-[11px] text-zinc-300 max-h-48 overflow-y-auto space-y-1">
                                {run.log && run.log.length > 0 ? (
                                  run.log.map((logItem, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <span className="text-zinc-600 shrink-0">
                                        [{logItem.timestamp.slice(11, 19)}]
                                      </span>
                                      {logItem.source && (
                                        <span className="text-teal-400 font-semibold shrink-0">
                                          [{logItem.source}]
                                        </span>
                                      )}
                                      <span
                                        className={
                                          logItem.level === 'error' ? 'text-red-400' :
                                          logItem.level === 'warn' ? 'text-amber-400' : 'text-zinc-300'
                                        }
                                      >
                                        {logItem.message}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-zinc-600">No log entries recorded.</div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 space-y-2">
                    <History className="w-8 h-8 text-zinc-600 mx-auto" />
                    <div className="text-sm font-medium text-zinc-400">No collection history recorded yet</div>
                    <p className="text-xs text-zinc-600">
                      When you click Run Collection, audit records and timing metrics will be preserved here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
