import React from 'react';
import { Play, Sparkles, Database, Layers, CheckCircle, RefreshCw, LogIn, LogOut } from 'lucide-react';
import type { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRunning: boolean;
  onRunCollection: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isSigningIn: boolean;
  pendingSyncCount: number;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isRunning,
  onRunCollection,
  user,
  onSignIn,
  onSignOut,
  isSigningIn,
  pendingSyncCount,
  isMobileMenuOpen,
  onToggleMobileMenu
}) => {
  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
          aria-label="Toggle navigation menu"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
        </button>

        <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-400 hidden sm:flex items-center justify-center shadow-lg shadow-cyan-950/50">
          <Layers className="w-5 h-5 text-zinc-950 font-bold" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold tracking-tight text-zinc-100 text-xs sm:text-sm md:text-base truncate max-w-[170px] sm:max-w-none">
              Remote Job Intelligence
            </h1>
            <span className="text-[9px] sm:text-[10px] font-mono uppercase bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 px-1.5 py-0.5 rounded font-medium">
              US & CA
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Run Collection Action */}
        <button
          onClick={onRunCollection}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition shadow-sm ${
            isRunning
              ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-700'
              : 'bg-teal-500 hover:bg-teal-400 text-zinc-950 shadow-teal-950/40 hover:shadow-teal-500/20 active:scale-[0.98]'
          }`}
          aria-label="Run Collection"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
              <span>Running Run...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Collection</span>
            </>
          )}
        </button>

        {/* Google Workspace Account status */}
        {user ? (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-lg text-xs">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-cyan-800 text-cyan-200 flex items-center justify-center text-[10px]">
                {user.email?.[0].toUpperCase()}
              </div>
            )}
            <span className="text-zinc-200 hidden md:inline truncate max-w-[120px]">
              {user.email}
            </span>
            <button
              onClick={onSignOut}
              title="Sign out of Google"
              className="text-zinc-400 hover:text-red-400 p-1 transition"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            disabled={isSigningIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition"
            aria-label="Sign in with Google"
          >
            <LogIn className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isSigningIn ? 'Connecting...' : 'Connect Sheets'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
