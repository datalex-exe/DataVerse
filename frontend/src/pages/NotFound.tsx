import React from 'react';
import { Compass, Home, Search } from 'lucide-react';

interface NotFoundProps {
  onNavigate?: (view: string) => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onNavigate }) => {
  const handleNavigate = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      window.location.hash = `#/${route}`;
    }
  };

  return (
    <div className="w-full min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between py-12 px-4 select-none">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto space-y-6 animate-fade-in">
        {/* Glow Ring Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-[var(--card)] border border-[var(--line)] shadow-2xl flex items-center justify-center text-[var(--accent-2)] relative z-10">
            <Compass className="w-12 h-12 animate-pulse" aria-hidden="true" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-2)] blur-2xl opacity-25 rounded-3xl pointer-events-none" />
        </div>

        {/* 404 Text */}
        <div className="space-y-2">
          <span className="text-xs font-black tracking-widest text-[var(--accent-2)] uppercase bg-[var(--input)] px-3 py-1 rounded-full border border-[var(--line)]">
            Error 404
          </span>
          <h1 className="text-3xl font-black text-[var(--text)] tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs text-[var(--muted)] leading-relaxed max-w-sm mx-auto">
            The page, post, or creator profile you are trying to visit doesn't exist, has been removed, or the link may be mistyped.
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <button
            type="button"
            onClick={() => handleNavigate('feed')}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-bold shadow-lg shadow-[var(--shadow-accent)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Back to Feed
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('search')}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--hover)] text-[var(--text)] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <Search className="w-4 h-4 text-[var(--accent-2)]" aria-hidden="true" />
            Explore Network
          </button>
        </div>
      </div>

    </div>
  );
};

export default NotFound;
