import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Activity,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  X,
  Play
} from 'lucide-react';
import type { JobSourceConfig } from '../../types/job.ts';

interface SourcesViewProps {
  sources: JobSourceConfig[];
  onToggleSource: (id: string, enabled: boolean) => void;
  onDeleteSource: (id: string) => void;
  onAddSource: (source: { name: string; type: JobSourceConfig['type']; identifier: string; enabled: boolean }) => void;
  onTestSource: (id: string) => Promise<{ isValid: boolean; error?: string }>;
}

export const SourcesView: React.FC<SourcesViewProps> = ({
  sources,
  onToggleSource,
  onDeleteSource,
  onAddSource,
  onTestSource
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { isValid: boolean; error?: string }>>({});

  // Add Source Form
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<JobSourceConfig['type']>('greenhouse');
  const [newIdentifier, setNewIdentifier] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await onTestSource(id);
      setTestResults(prev => ({ ...prev, [id]: res }));
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [id]: { isValid: false, error: err.message } }));
    } finally {
      setTestingId(null);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newIdentifier.trim()) {
      setAddError('Company name and board token / identifier are required');
      return;
    }
    onAddSource({
      name: newName.trim(),
      type: newType,
      identifier: newIdentifier.trim(),
      enabled: true
    });
    setNewName('');
    setNewIdentifier('');
    setIsAddModalOpen(false);
    setAddError(null);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Job Source Connectors</span>
            <span className="text-xs font-mono font-normal text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {sources.length} Configured
            </span>
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Manage public ATS endpoints (Greenhouse, Lever, Ashby, Remotive) with isolated error handling.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs rounded-lg transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Source Connector</span>
        </button>
      </div>

      {/* Grid of Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sources.map(source => {
          const testState = testResults[source.id];
          const isTesting = testingId === source.id;

          return (
            <div
              key={source.id}
              className={`p-5 rounded-xl border flex flex-col justify-between transition ${
                source.enabled
                  ? 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                  : 'bg-zinc-950/40 border-zinc-900 opacity-70'
              }`}
            >
              <div>
                {/* Header & Toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase bg-zinc-800 border border-zinc-700 text-cyan-300 px-1.5 py-0.5 rounded">
                        {source.type}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        source.health === 'healthy' ? 'text-emerald-400 bg-emerald-950 border-emerald-800' :
                        source.health === 'error' ? 'text-red-400 bg-red-950 border-red-800' :
                        'text-zinc-400 bg-zinc-900 border-zinc-800'
                      }`}>
                        {source.health}
                      </span>
                    </div>
                    <h3 className="font-bold text-zinc-100 text-sm mt-2">
                      {source.name}
                    </h3>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={source.enabled}
                      onChange={e => onToggleSource(source.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                  </label>
                </div>

                <div className="text-[11px] font-mono text-zinc-500 mt-2 truncate">
                  Identifier: <span className="text-zinc-300">{source.identifier}</span>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-850 mt-4 text-center font-mono">
                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase">Discovered</div>
                    <div className="text-xs font-bold text-zinc-200 mt-0.5">{source.total_discovered}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase">New Jobs</div>
                    <div className="text-xs font-bold text-teal-400 mt-0.5">{source.total_new}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase">Dups Blocked</div>
                    <div className="text-xs font-bold text-zinc-400 mt-0.5">{source.total_duplicates}</div>
                  </div>
                </div>

                {source.last_error && (
                  <div className="mt-2 text-[10px] text-red-400 bg-red-950/40 p-2 rounded border border-red-900 truncate" title={source.last_error}>
                    Err: {source.last_error}
                  </div>
                )}

                {testState && (
                  <div className={`mt-2 text-[10px] p-2 rounded border ${
                    testState.isValid
                      ? 'text-emerald-300 bg-emerald-950/40 border-emerald-800'
                      : 'text-red-300 bg-red-950/40 border-red-800'
                  }`}>
                    {testState.isValid ? 'Endpoint connection verified & responsive' : `Failed: ${testState.error}`}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800/80 text-xs">
                <span className="text-[10px] text-zinc-500">
                  {source.last_run_at ? `Last run ${new Date(source.last_run_at).toLocaleDateString()}` : 'Never executed'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(source.id)}
                    disabled={isTesting}
                    className="px-2.5 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-medium transition"
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={() => onDeleteSource(source.id)}
                    className="p-1 text-zinc-500 hover:text-red-400 transition"
                    title="Delete source"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Source Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 text-sm">
                Add Job Source Connector
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Company / Source Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cloudflare, Airbnb, Datadog"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">ATS / Platform Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="greenhouse">Greenhouse (boards-api.greenhouse.io)</option>
                  <option value="lever">Lever (api.lever.co/v0/postings)</option>
                  <option value="ashby">Ashby (jobs.ashbyhq.com)</option>
                  <option value="remotive">Remotive Feed (Remote Dev)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Board Identifier / Slug
                </label>
                <input
                  type="text"
                  placeholder="e.g. cloudflare (from boards.greenhouse.io/cloudflare)"
                  value={newIdentifier}
                  onChange={e => setNewIdentifier(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  The company token used in the public career URL.
                </p>
              </div>

              {addError && (
                <div className="p-2 bg-red-950/60 border border-red-800 text-red-300 rounded text-[11px]">
                  {addError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                >
                  Save Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
