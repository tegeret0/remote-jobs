import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CopyCheck,
  Filter,
  Terminal,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import type { CollectionRun, JobSourceConfig } from '../../types/job.ts';

interface CollectionWorkspaceProps {
  sources: JobSourceConfig[];
  currentRun: CollectionRun | null;
  isRunning: boolean;
  onRunCollection: (sourceIds?: string[]) => void;
  onCancelCollection: () => void;
  onNavigate: (tab: string) => void;
  onTestSource: (sourceId: string) => Promise<{ isValid: boolean; error?: string }>;
}

export const CollectionWorkspace: React.FC<CollectionWorkspaceProps> = ({
  sources,
  currentRun,
  isRunning,
  onRunCollection,
  onCancelCollection,
  onNavigate,
  onTestSource
}) => {
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(
    sources.filter(s => s.enabled).map(s => s.id)
  );
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { isValid: boolean; error?: string }>>({});

  const terminalRef = useRef<HTMLDivElement>(null);

  // Keep selectedSourceIds synchronized if sources list changes
  useEffect(() => {
    if (selectedSourceIds.length === 0 && sources.length > 0) {
      setSelectedSourceIds(sources.filter(s => s.enabled).map(s => s.id));
    }
  }, [sources]);

  // Auto scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [currentRun?.log]);

  const toggleSelectAll = () => {
    if (selectedSourceIds.length === sources.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(sources.map(s => s.id));
    }
  };

  const toggleSource = (id: string) => {
    setSelectedSourceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleTest = async (sourceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTestingId(sourceId);
    try {
      const res = await onTestSource(sourceId);
      setTestResults(prev => ({ ...prev, [sourceId]: res }));
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [sourceId]: { isValid: false, error: err.message } }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100">
              Job Collection Workspace
            </h2>
            <span className="text-[10px] font-mono uppercase bg-teal-950 border border-teal-800 text-teal-400 px-2 py-0.5 rounded font-medium">
              Execution Control
            </span>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Configure target source connectors, execute live extraction, and monitor real-time deduplication.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isRunning ? (
            <button
              onClick={onCancelCollection}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 transition"
              aria-label="Cancel Collection"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Cancel Run</span>
            </button>
          ) : (
            <button
              onClick={() => onRunCollection(selectedSourceIds)}
              disabled={selectedSourceIds.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold tracking-wide transition shadow-lg ${
                selectedSourceIds.length === 0
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                  : 'bg-teal-500 hover:bg-teal-400 text-zinc-950 shadow-teal-950/50 hover:shadow-teal-500/20 active:scale-[0.98]'
              }`}
              aria-label="Run Collection Now"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Collection ({selectedSourceIds.length} Sources)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Source Selector & Live Execution Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Source Selection (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Select Sources to Run
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  ({selectedSourceIds.length} of {sources.length} chosen)
                </span>
              </div>
              <button
                onClick={toggleSelectAll}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              >
                {selectedSourceIds.length === sources.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {sources.map(source => {
                const isSelected = selectedSourceIds.includes(source.id);
                const testState = testResults[source.id];
                const isTestingThis = testingId === source.id;

                return (
                  <div
                    key={source.id}
                    onClick={() => toggleSource(source.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-zinc-800/60 border-cyan-800/80 text-zinc-200'
                        : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent click
                        className="w-4 h-4 rounded border-zinc-700 text-teal-500 focus:ring-0 focus:ring-offset-0 bg-zinc-900"
                      />
                      <div>
                        <div className="text-xs font-semibold flex items-center gap-2">
                          <span className={isSelected ? 'text-zinc-100' : 'text-zinc-400'}>
                            {source.name}
                          </span>
                          <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-zinc-800 border border-zinc-700 rounded text-zinc-400">
                            {source.type}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          Identifier: {source.identifier}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {testState && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            testState.isValid
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                          title={testState.error || 'Connection verified'}
                        >
                          {testState.isValid ? 'OK' : 'FAIL'}
                        </span>
                      )}
                      <button
                        onClick={e => handleTest(source.id, e)}
                        disabled={isTestingThis || isRunning}
                        className="text-[10px] px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-zinc-300 font-medium transition"
                      >
                        {isTestingThis ? 'Testing...' : 'Test'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/60">
              <span>Looking for more companies?</span>
              <button
                onClick={() => onNavigate('sources')}
                className="text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Add Custom Source &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Execution Terminal & Telemetry (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Live Execution Telemetry
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Active Collector Run</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded">
                    Idle / Ready
                  </span>
                )}
              </div>
            </div>

            {/* Run Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 font-mono text-center">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">Discovered</div>
                <div className="text-base font-bold text-zinc-200">
                  {currentRun?.total_discovered || 0}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">Passed US/CA</div>
                <div className="text-base font-bold text-cyan-400">
                  {currentRun?.total_valid || 0}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">Genuinely New</div>
                <div className="text-base font-bold text-teal-400">
                  {currentRun?.total_new || 0}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">Dups Blocked</div>
                <div className="text-base font-bold text-zinc-400">
                  {currentRun?.total_duplicates || 0}
                </div>
              </div>
            </div>

            {/* Terminal Window */}
            <div
              ref={terminalRef}
              className="bg-zinc-950 p-4 rounded-lg border border-zinc-850 font-mono text-xs text-zinc-300 h-64 overflow-y-auto space-y-1.5 scrollbar-thin select-text"
            >
              {currentRun && currentRun.log && currentRun.log.length > 0 ? (
                currentRun.log.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-zinc-600 text-[10px] shrink-0 pt-0.5">
                      [{entry.timestamp.slice(11, 19)}]
                    </span>
                    {entry.source && (
                      <span className="text-teal-400 font-semibold shrink-0">
                        [{entry.source}]
                      </span>
                    )}
                    <span
                      className={
                        entry.level === 'error' ? 'text-red-400' :
                        entry.level === 'warn' ? 'text-amber-400' :
                        entry.message.includes('complete') || entry.message.includes('saved') ? 'text-emerald-300' :
                        'text-zinc-300'
                      }
                    >
                      {entry.message}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-1">
                  <div>Terminal ready. Click "Run Collection" to begin.</div>
                  <div className="text-[11px] text-zinc-700">
                    Execution logs, normalization, and deduplication results will appear here.
                  </div>
                </div>
              )}
            </div>

            {/* Outcome Actions */}
            {currentRun && !isRunning && currentRun.total_new > 0 && (
              <div className="p-3 bg-teal-950/40 border border-teal-800/80 rounded-lg flex items-center justify-between">
                <div className="text-xs text-teal-300">
                  🎉 <span className="font-semibold">{currentRun.total_new}</span> new unique vacancies ready for review and Google Sheets export!
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('jobs')}
                    className="px-3 py-1.5 rounded bg-teal-500 hover:bg-teal-400 text-zinc-950 text-xs font-bold transition flex items-center gap-1"
                  >
                    <span>View Jobs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onNavigate('sheets')}
                    className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
                  >
                    Sync to Sheets
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
