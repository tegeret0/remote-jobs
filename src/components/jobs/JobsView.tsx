import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  Table as TableIcon,
  Trash2,
  X,
  FileSpreadsheet,
  Globe,
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  Info
} from 'lucide-react';
import type { CanonicalJob } from '../../types/job.ts';

interface JobsViewProps {
  jobs: CanonicalJob[];
  onDeleteJob: (jobId: string) => void;
  onSyncJobs: (jobIds: string[]) => void;
  onNavigate: (tab: string) => void;
}

export const JobsView: React.FC<JobsViewProps> = ({
  jobs,
  onDeleteJob,
  onSyncJobs,
  onNavigate
}) => {
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedRemote, setSelectedRemote] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedSync, setSelectedSync] = useState('all');
  const [reviewMode, setReviewMode] = useState(false);

  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [activeJobModal, setActiveJobModal] = useState<CanonicalJob | null>(null);

  // Keyboard accessibility: Escape closes modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeJobModal) {
        setActiveJobModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeJobModal]);

  // AI analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch =
          job.job_title.toLowerCase().includes(q) ||
          job.company_name.toLowerCase().includes(q) ||
          job.location.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (selectedCountry !== 'all' && job.country_eligibility !== selectedCountry) {
        return false;
      }
      if (selectedRemote !== 'all' && job.remote_type !== selectedRemote) {
        return false;
      }
      if (selectedSource !== 'all' && !job.source_name.toLowerCase().includes(selectedSource.toLowerCase())) {
        return false;
      }
      if (selectedSync !== 'all' && job.sync_status !== selectedSync) {
        return false;
      }
      if (reviewMode && !job.review_required) {
        return false;
      }
      return true;
    });
  }, [jobs, search, selectedCountry, selectedRemote, selectedSource, selectedSync, reviewMode]);

  const uniqueSources = useMemo(() => {
    return Array.from(new Set(jobs.map(j => j.source_name)));
  }, [jobs]);

  const handleSelectAll = () => {
    if (selectedJobIds.length === filteredJobs.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(filteredJobs.map(j => j.job_id));
    }
  };

  const toggleSelectJob = (id: string) => {
    setSelectedJobIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleOpenModal = (job: CanonicalJob) => {
    setActiveJobModal(job);
    setAiAnalysis(null);
    setAiError(null);
  };

  const handleRunAiAnalysis = async (job: CanonicalJob) => {
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/analyze-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.job_title,
          company: job.company_name,
          location: job.location,
          description: job.job_description
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'AI analysis request failed');
      }
      setAiAnalysis(data.analysis);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Collected Vacancies</span>
            <span className="text-xs font-mono font-normal text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {filteredJobs.length} of {jobs.length} total
            </span>
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Validated remote engineering opportunities normalized for US & Canada residency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedJobIds.length > 0 && (
            <button
              onClick={() => onSyncJobs(selectedJobIds)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-zinc-950 transition shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 fill-current" />
              <span>Export {selectedJobIds.length} to Sheets</span>
            </button>
          )}

          <button
            onClick={() => setReviewMode(!reviewMode)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
              reviewMode
                ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            {reviewMode ? 'Review Mode Active' : 'Toggle Review Mode'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search title, company, or keywords..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Country Filter */}
        <div>
          <select
            value={selectedCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Countries</option>
            <option value="US">United States</option>
            <option value="Canada">Canada</option>
            <option value="US & Canada">US & Canada (Dual)</option>
            <option value="Worldwide">Worldwide Remote</option>
          </select>
        </div>

        {/* Source Filter */}
        <div>
          <select
            value={selectedSource}
            onChange={e => setSelectedSource(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Sources</option>
            {uniqueSources.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Sync Status Filter */}
        <div>
          <select
            value={selectedSync}
            onChange={e => setSelectedSync(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Sync States</option>
            <option value="pending">Pending Sync</option>
            <option value="synced">Synced to Sheets</option>
          </select>
        </div>
      </div>

      {/* High Density Job Table */}
      <div className="bg-zinc-900/60 rounded-xl border border-zinc-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] font-mono border-b border-zinc-800 select-none">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={filteredJobs.length > 0 && selectedJobIds.length === filteredJobs.length}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-zinc-700 text-teal-500 bg-zinc-900 focus:ring-0"
                  />
                </th>
                <th className="py-3 px-3">Role & Company</th>
                <th className="py-3 px-3">Location & Eligibility</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3">Salary</th>
                <th className="py-3 px-3">Sync Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {filteredJobs.length > 0 ? (
                filteredJobs.map(job => {
                  const isSelected = selectedJobIds.includes(job.job_id);
                  return (
                    <tr
                      key={job.job_id}
                      className={`hover:bg-zinc-850/50 transition cursor-pointer ${
                        isSelected ? 'bg-cyan-950/20' : ''
                      }`}
                      onClick={() => handleOpenModal(job)}
                    >
                      <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectJob(job.job_id)}
                          className="w-3.5 h-3.5 rounded border-zinc-700 text-teal-500 bg-zinc-900 focus:ring-0"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-zinc-100 hover:text-cyan-400 transition">
                          {job.job_title}
                        </div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                          <Building2 className="w-3 h-3 text-zinc-500" />
                          <span>{job.company_name}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-500 text-[10px]">
                            {job.original_posting_date ? new Date(job.original_posting_date).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {job.country_eligibility}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {job.remote_type}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1 truncate max-w-xs" title={job.location}>
                          {job.location}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[11px] text-zinc-300 font-mono">
                          {job.source_name}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-300">
                        {job.salary_formatted || <span className="text-zinc-600">—</span>}
                      </td>

                      <td className="py-3 px-3">
                        {job.sync_status === 'synced' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-900 px-2 py-0.5 rounded font-mono">
                            <CheckCircle className="w-3 h-3" />
                            <span>In Sheet</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/70 border border-amber-900 px-2 py-0.5 rounded font-mono">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={job.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-zinc-400 hover:text-cyan-400 transition"
                            title="Open original job posting"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => onDeleteJob(job.job_id)}
                            className="p-1.5 text-zinc-400 hover:text-red-400 transition"
                            title="Remove job"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 space-y-2">
                    <TableIcon className="w-8 h-8 text-zinc-600 mx-auto" />
                    <div className="text-sm font-medium text-zinc-400">No jobs match your filter criteria</div>
                    <p className="text-xs text-zinc-600">
                      Try widening keywords, switching countries, or running a collection from the console.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Detail & AI Intelligence Modal */}
      {activeJobModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  {activeJobModal.source_name}
                </span>
                <h3 className="text-lg font-bold text-zinc-100 mt-2">
                  {activeJobModal.job_title}
                </h3>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  {activeJobModal.company_name} • {activeJobModal.location}
                </p>
              </div>
              <button
                onClick={() => setActiveJobModal(null)}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              <div>
                <div className="text-[10px] text-zinc-500">Eligibility</div>
                <div className="font-semibold text-cyan-400 mt-0.5">{activeJobModal.country_eligibility}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">Work Model</div>
                <div className="font-semibold text-zinc-200 mt-0.5">{activeJobModal.remote_type}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">Compensation</div>
                <div className="font-semibold text-teal-400 mt-0.5 font-mono">
                  {activeJobModal.salary_formatted || 'Not Disclosed'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">Deduplication Key</div>
                <div className="font-mono text-[9px] text-zinc-400 mt-0.5 truncate" title={activeJobModal.duplicate_key}>
                  {activeJobModal.duplicate_key}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3">
              <a
                href={activeJobModal.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-zinc-950 text-xs font-bold rounded-lg transition"
              >
                <span>Open Application</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => handleRunAiAnalysis(activeJobModal)}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 text-xs font-semibold rounded-lg border border-cyan-800/60 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isAnalyzing ? 'Analyzing with Thinking Mode...' : 'Deep Fit Analysis (Gemini 4 Argon)'}</span>
              </button>
            </div>

            {/* Optional AI Analysis Output */}
            {aiAnalysis && (
              <div className="p-4 bg-cyan-950/20 border border-cyan-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Eligibility & Fit Intelligence</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-900/60 px-2 py-0.5 rounded">
                    {aiAnalysis.eligibilityVerdict}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-zinc-300">
                  <p><strong className="text-zinc-100">US Candidate Fit:</strong> {aiAnalysis.usCandidateFit}</p>
                  <p><strong className="text-zinc-100">Canada Candidate Fit:</strong> {aiAnalysis.canadaCandidateFit}</p>
                  {aiAnalysis.techStackHighlights && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-zinc-400 text-[11px]">Core Skills:</span>
                      {aiAnalysis.techStackHighlights.map((tech: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-zinc-800 text-teal-300 rounded font-mono text-[10px]">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {aiAnalysis.keyWatchouts?.length > 0 && (
                    <div className="pt-2 text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded border border-amber-900/60 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        {aiAnalysis.keyWatchouts.join(' • ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {aiError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-lg">
                AI Analysis notice: {aiError}
              </div>
            )}

            {/* Description Snippet */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Job Overview & Requirements
              </h4>
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
                {activeJobModal.job_description || 'No detailed text was attached from source feed.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
