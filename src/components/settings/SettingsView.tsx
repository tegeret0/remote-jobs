import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Save,
  CheckCircle2,
  Globe,
  Tag,
  ShieldCheck,
  Zap,
  RotateCcw
} from 'lucide-react';
import type { SearchPreferences } from '../../types/job.ts';

interface SettingsViewProps {
  preferences: SearchPreferences;
  onSavePreferences: (prefs: SearchPreferences) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  preferences,
  onSavePreferences
}) => {
  const [targetCountries, setTargetCountries] = useState<string[]>(preferences.target_countries || ['US', 'Canada']);
  const [remoteOnly, setRemoteOnly] = useState(preferences.remote_only ?? true);
  const [includedInput, setIncludedInput] = useState((preferences.included_keywords || []).join(', '));
  const [excludedInput, setExcludedInput] = useState((preferences.excluded_keywords || []).join(', '));
  const [freshnessDays, setFreshnessDays] = useState(preferences.max_freshness_days || 30);
  const [autoSync, setAutoSync] = useState(preferences.auto_sync ?? false);
  const [reviewMode, setReviewMode] = useState(preferences.review_mode ?? false);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleCountryToggle = (country: string) => {
    setTargetCountries(prev =>
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SearchPreferences = {
      ...preferences,
      target_countries: targetCountries,
      remote_only: remoteOnly,
      included_keywords: includedInput.split(',').map(s => s.trim()).filter(Boolean),
      excluded_keywords: excludedInput.split(',').map(s => s.trim()).filter(Boolean),
      max_freshness_days: Number(freshnessDays),
      auto_sync: autoSync,
      review_mode: reviewMode
    };
    onSavePreferences(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Discovery & Filtering Preferences</span>
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Persisted search configuration, target market rules, and pipeline automation controls.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-lg text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Preferences Saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Geographic Market */}
        <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Target Geographic Market</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={targetCountries.includes('US')}
                  onChange={() => handleCountryToggle('US')}
                  className="w-4 h-4 rounded border-zinc-700 text-teal-500 bg-zinc-900 focus:ring-0"
                />
                <span className="text-zinc-200 font-medium">United States</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={targetCountries.includes('Canada')}
                  onChange={() => handleCountryToggle('Canada')}
                  className="w-4 h-4 rounded border-zinc-700 text-teal-500 bg-zinc-900 focus:ring-0"
                />
                <span className="text-zinc-200 font-medium">Canada</span>
              </label>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remoteOnly}
                  onChange={e => setRemoteOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 text-teal-500 bg-zinc-900 focus:ring-0"
                />
                <span className="text-zinc-200 font-semibold">Strict Remote-Only Filter</span>
              </label>
              <p className="text-[11px] text-zinc-500 ml-6 mt-0.5">
                Automatically discards on-site positions and vacancies that do not explicitly permit remote work.
              </p>
            </div>
          </div>
        </div>

        {/* Roles & Keywords */}
        <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Tag className="w-4 h-4 text-teal-400" />
            <span>Engineering Keywords & Filtering</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Included Roles & Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={includedInput}
                onChange={e => setIncludedInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500"
                placeholder="Software Engineer, Full-Stack, Frontend, Backend, Web Developer, DevOps"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Only job titles matching at least one software engineering keyword are accepted into the canonical database.
              </p>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Excluded Negative Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={excludedInput}
                onChange={e => setExcludedInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500"
                placeholder="intern, internship, unpaid, tutor, sales, marketing"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Any vacancy containing these words in the title or summary is rejected immediately.
              </p>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Posting Freshness Window (Days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={freshnessDays}
                onChange={e => setFreshnessDays(Number(e.target.value))}
                className="w-32 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Automation Modes */}
        <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Workflow & Pipeline Automation</span>
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={e => setAutoSync(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 text-teal-500 bg-zinc-900 focus:ring-0"
              />
              <div>
                <span className="text-zinc-200 font-semibold">Automatic Google Sheets Synchronization</span>
                <p className="text-[11px] text-zinc-500">
                  Automatically export new validated jobs to Google Sheets right after each successful collection run.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={reviewMode}
                onChange={e => setReviewMode(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 text-teal-500 bg-zinc-900 focus:ring-0"
              />
              <div>
                <span className="text-zinc-200 font-semibold">Enforce Manual Review Before Export</span>
                <p className="text-[11px] text-zinc-500">
                  Require user review and approval in the Collected Jobs table prior to pushing rows to Google Sheets.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs rounded-lg transition shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
