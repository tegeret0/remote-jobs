import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Briefcase,
  SlidersHorizontal,
  Table,
  History,
  Settings as SettingsIcon,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalJobs: number;
  activeSourcesCount: number;
  pendingSyncCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  totalJobs,
  activeSourcesCount,
  pendingSyncCount,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'collection',
      label: 'Job Collection',
      icon: Cpu,
      badge: 'Live'
    },
    {
      id: 'jobs',
      label: 'Collected Jobs',
      icon: Briefcase,
      badge: totalJobs > 0 ? String(totalJobs) : null
    },
    {
      id: 'sources',
      label: 'Sources',
      icon: SlidersHorizontal,
      badge: `${activeSourcesCount} active`
    },
    {
      id: 'sheets',
      label: 'Google Sheets',
      icon: Table,
      badge: pendingSyncCount > 0 ? `${pendingSyncCount} new` : null,
      badgeColor: pendingSyncCount > 0 ? 'bg-amber-950/80 text-amber-400 border-amber-800' : undefined
    },
    {
      id: 'history',
      label: 'Collection History',
      icon: History,
      badge: null
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      badge: null
    }
  ];

  const content = (
    <div className="flex flex-col h-full select-none">
      <div className="p-4 space-y-1">
        <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase px-3 py-1">
          Workspaces
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-zinc-800/90 text-cyan-300 font-semibold border border-zinc-700/80 shadow-sm shadow-cyan-950/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
              aria-label={`Navigate to ${item.label}`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    item.badgeColor || (isActive
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800')
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto p-4 border-t border-zinc-900 space-y-3">
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Target Market</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Targeting US & Canada remote software engineering positions with multi-tier deduplication.
          </p>
        </div>
        <div className="text-[10px] text-zinc-600 font-mono text-center">
          Phase 1: Discovery & Sheets
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    if (!isMobileOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex">
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onCloseMobile}
        />
        <aside className="relative w-64 max-w-[80%] bg-zinc-950 border-r border-zinc-800 z-10 shadow-2xl">
          {content}
        </aside>
      </div>
    );
  }

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 shrink-0">
      {content}
    </aside>
  );
};
