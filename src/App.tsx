import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { CanonicalJob, CollectionRun, JobSourceConfig, SearchPreferences, SheetConfig } from './types/job.ts';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { OverviewView } from './components/overview/OverviewView.tsx';
import { CollectionWorkspace } from './components/collection/CollectionWorkspace.tsx';
import { JobsView } from './components/jobs/JobsView.tsx';
import { SourcesView } from './components/sources/SourcesView.tsx';
import { SheetsView } from './components/sheets/SheetsView.tsx';
import { HistoryView } from './components/history/HistoryView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { initAuth, googleSignIn, googleSignOut, getCachedAccessToken } from './services/auth.ts';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data State
  const [jobs, setJobs] = useState<CanonicalJob[]>([]);
  const [sources, setSources] = useState<JobSourceConfig[]>([]);
  const [runs, setRuns] = useState<CollectionRun[]>([]);
  const [currentRun, setCurrentRun] = useState<CollectionRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [preferences, setPreferences] = useState<SearchPreferences>({
    target_countries: ['US', 'Canada'],
    remote_only: true,
    included_keywords: ['Software Engineer', 'Full-Stack', 'Frontend', 'Backend'],
    excluded_keywords: ['intern', 'unpaid', 'sales'],
    seniority_levels: ['Junior', 'Mid', 'Senior'],
    employment_types: ['Full-time'],
    min_salary: 0,
    max_freshness_days: 30,
    auto_sync: false,
    review_mode: false
  });
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>({
    spreadsheet_id: '',
    spreadsheet_url: '',
    sheet_name: 'Remote Jobs',
    total_rows_synced: 0,
    auto_sync_enabled: false
  });

  // Google Auth State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all initial data
  const loadData = useCallback(async () => {
    try {
      const [jobsRes, sourcesRes, runsRes, statusRes, prefsRes, sheetsRes] = await Promise.all([
        fetch('/api/jobs').then(r => r.json()).catch(() => ({ jobs: [] })),
        fetch('/api/sources').then(r => r.json()).catch(() => ({ sources: [] })),
        fetch('/api/collection/runs').then(r => r.json()).catch(() => ({ runs: [] })),
        fetch('/api/collection/status').then(r => r.json()).catch(() => ({ isRunning: false, currentRun: null })),
        fetch('/api/preferences').then(r => r.json()).catch(() => ({ preferences: null })),
        fetch('/api/sheets/config').then(r => r.json()).catch(() => ({ config: null }))
      ]);

      if (jobsRes?.jobs) setJobs(jobsRes.jobs);
      if (sourcesRes?.sources) setSources(sourcesRes.sources);
      if (runsRes?.runs) setRuns(runsRes.runs);
      if (statusRes) {
        setIsRunning(statusRes.isRunning);
        if (statusRes.currentRun) setCurrentRun(statusRes.currentRun);
        else if (runsRes?.runs?.length) setCurrentRun(runsRes.runs[0]);
      }
      if (prefsRes?.preferences) setPreferences(prefsRes.preferences);
      if (sheetsRes?.config) setSheetConfig(sheetsRes.config);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auth setup listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        showToast('Google account connected with Sheets permissions');
      }
    } catch (err: any) {
      showToast(err.message || 'Google Sign-in failed', 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await googleSignOut();
    setUser(null);
    setAccessToken(null);
    showToast('Signed out of Google');
  };

  // Polling for collection run status when active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/collection/status').then(r => r.json());
          setIsRunning(res.isRunning);
          if (res.currentRun) {
            setCurrentRun(res.currentRun);
          }
          if (!res.isRunning) {
            // Run just completed! Reload jobs, sources, and runs
            loadData();
            showToast('Collection completed successfully!');
          }
        } catch (err) {
          console.error('Error polling collection status:', err);
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, loadData]);

  // Actions
  const handleRunCollection = async (sourceIds?: string[]) => {
    try {
      setIsRunning(true);
      const res = await fetch('/api/collection/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start collection run');
      }
      setActiveTab('collection');
      showToast('Collection initiated across selected sources');
    } catch (err: any) {
      setIsRunning(false);
      showToast(err.message, 'error');
    }
  };

  const handleCancelCollection = async () => {
    try {
      await fetch('/api/collection/cancel', { method: 'POST' });
      setIsRunning(false);
      showToast('Collection run cancelled');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleSource = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      setSources(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      setSources(prev => prev.filter(s => s.id !== id));
      showToast('Source removed');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddSource = async (sourceData: any) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceData)
      });
      const data = await res.json();
      if (data.source) {
        setSources(prev => [...prev, data.source]);
        showToast(`Added source: ${data.source.name}`);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleTestSource = async (id: string) => {
    const res = await fetch(`/api/sources/${id}/test`, { method: 'POST' });
    const data = await res.json();
    return data;
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      setJobs(prev => prev.filter(j => j.job_id !== jobId));
      showToast('Job removed from database');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSyncJobs = async (jobIds: string[]) => {
    const token = accessToken || getCachedAccessToken();
    if (!token) {
      setActiveTab('sheets');
      showToast('Please sign in with Google to synchronize to Sheets', 'error');
      return;
    }
    if (!sheetConfig.spreadsheet_id) {
      setActiveTab('sheets');
      showToast('Please configure or create a Google Sheet first', 'error');
      return;
    }

    try {
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          spreadsheetId: sheetConfig.spreadsheet_id,
          sheetName: sheetConfig.sheet_name || 'Remote Jobs',
          jobIds
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Exported ${data.syncedCount} jobs to Google Sheet! (${data.skippedDuplicatesCount} existing skipped)`);
        loadData();
      } else {
        showToast(data.error || 'Failed to export jobs', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSyncPending = async () => {
    const token = accessToken || getCachedAccessToken();
    if (!token) throw new Error('Please sign in with Google');
    if (!sheetConfig.spreadsheet_id) throw new Error('Please enter or create a destination spreadsheet');

    const res = await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: token,
        spreadsheetId: sheetConfig.spreadsheet_id,
        sheetName: sheetConfig.sheet_name || 'Remote Jobs'
      })
    });
    const data = await res.json();
    if (data.success) {
      loadData();
    }
    return data;
  };

  const handleSavePreferences = async (newPrefs: SearchPreferences) => {
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs)
      });
      setPreferences(newPrefs);
      showToast('Preferences updated');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateSheetConfig = async (newConfig: SheetConfig) => {
    try {
      await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      setSheetConfig(newConfig);
      showToast('Google Sheets configuration saved');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const pendingSyncCount = jobs.filter(j => j.sync_status === 'pending').length;
  const activeSourcesCount = sources.filter(s => s.enabled).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-teal-500 selection:text-zinc-950">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRunning={isRunning}
        onRunCollection={() => handleRunCollection()}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isSigningIn={isSigningIn}
        pendingSyncCount={pendingSyncCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Body with Sidebar + Content View */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          totalJobs={jobs.length}
          activeSourcesCount={activeSourcesCount}
          pendingSyncCount={pendingSyncCount}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-y-auto bg-zinc-950/50">
          {activeTab === 'overview' && (
            <OverviewView
              jobs={jobs}
              sources={sources}
              runs={runs}
              sheetConfig={sheetConfig}
              onNavigate={setActiveTab}
              onRunCollection={() => handleRunCollection()}
              isRunning={isRunning}
            />
          )}

          {activeTab === 'collection' && (
            <CollectionWorkspace
              sources={sources}
              currentRun={currentRun}
              isRunning={isRunning}
              onRunCollection={handleRunCollection}
              onCancelCollection={handleCancelCollection}
              onNavigate={setActiveTab}
              onTestSource={handleTestSource}
            />
          )}

          {activeTab === 'jobs' && (
            <JobsView
              jobs={jobs}
              onDeleteJob={handleDeleteJob}
              onSyncJobs={handleSyncJobs}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'sources' && (
            <SourcesView
              sources={sources}
              onToggleSource={handleToggleSource}
              onDeleteSource={handleDeleteSource}
              onAddSource={handleAddSource}
              onTestSource={handleTestSource}
            />
          )}

          {activeTab === 'sheets' && (
            <SheetsView
              user={user}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              isSigningIn={isSigningIn}
              accessToken={accessToken}
              sheetConfig={sheetConfig}
              onUpdateConfig={handleUpdateSheetConfig}
              jobs={jobs}
              onSyncPending={handleSyncPending}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              runs={runs}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              preferences={preferences}
              onSavePreferences={handleSavePreferences}
            />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-3">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-zinc-200">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-zinc-500 hover:text-zinc-300 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
