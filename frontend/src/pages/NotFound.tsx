import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Home, 
  Search, 
  ArrowRight, 
  MessageSquare, 
  Mail, 
  WifiOff, 
  AlertTriangle, 
  Sparkles, 
  SlidersHorizontal 
} from 'lucide-react';

export type NotFoundStatus = 
  | 'idle'
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'typo_match';

interface NotFoundProps {
  onNavigate?: (view: string) => void;
}

const KNOWN_ROUTES = [
  'feed',
  'explore',
  'messages',
  'activity',
  'profile',
  'settings',
  'admin',
  'contact',
  'terms',
  'privacy',
  'cookies',
  'refund'
];

// Levenshtein typo suggestion algorithm
const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

export const NotFound: React.FC<NotFoundProps> = ({ onNavigate }) => {
  const [jumpInput, setJumpInput] = useState<string>('');
  const [jumpError, setJumpError] = useState<string | null>(null);

  // 10-State Architecture variables
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [previewState, setPreviewState] = useState<NotFoundStatus | null>(null);
  const [showPreviewToolbar, setShowPreviewToolbar] = useState<boolean>(false);

  // Detect attempted path from window URL
  const currentPath = window.location.hash.replace(/^#\/?/, '') || window.location.pathname.replace(/^\//, '');

  // Calculate typo suggestions
  const findClosestRoute = (input: string): string | null => {
    if (!input || input.length < 2) return null;
    const clean = input.toLowerCase().split('/')[0].trim();
    let closest: string | null = null;
    let minDistance = Infinity;

    for (const route of KNOWN_ROUTES) {
      const dist = getLevenshteinDistance(clean, route);
      if (dist < minDistance && dist <= 3) {
        minDistance = dist;
        closest = route;
      }
    }
    return closest;
  };

  const suggestedRoute = previewState === 'typo_match' 
    ? 'explore' 
    : findClosestRoute(currentPath);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleNavigate = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      window.history.pushState(null, '', route === 'feed' ? '/' : `/${route}/`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleQuickJump = (e: React.FormEvent) => {
    e.preventDefault();
    const query = jumpInput.trim();
    if (!query) {
      setJumpError('Please enter a destination or username');
      return;
    }

    if (query.startsWith('@')) {
      const handle = query.substring(1);
      if (onNavigate) onNavigate(`profile:${handle}`);
      else window.location.hash = `#/profile/${handle}`;
      return;
    }

    const matchedRoute = KNOWN_ROUTES.find(r => r.toLowerCase() === query.toLowerCase());
    if (matchedRoute) {
      handleNavigate(matchedRoute);
    } else {
      const typo = findClosestRoute(query);
      if (typo) {
        setJumpError(`Route not found. Did you mean "${typo}"?`);
      } else {
        setJumpError(`Unknown destination. Try "feed", "explore", or "@username"`);
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between py-12 px-4 select-none">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto space-y-6 animate-fade-in w-full">
        
        {/* Glow Ring Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-[var(--card)] border border-[var(--line)] shadow-2xl flex items-center justify-center text-[var(--accent-2)] relative z-10">
            <Compass className="w-12 h-12 animate-pulse" aria-hidden="true" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-2)] blur-2xl opacity-25 rounded-3xl pointer-events-none" />
        </div>

        {/* State 4: Offline Alert */}
        {(isOffline || previewState === 'offline') && (
          <div 
            role="status"
            aria-live="polite"
            className="w-full p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl flex items-center justify-between text-xs animate-fade-in"
          >
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Offline: Route lookups are paused. Cached pages (Feed, Explore) still work.</span>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate('feed')}
              className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-bold shrink-0"
            >
              Go to Feed
            </button>
          </div>
        )}

        {/* State 3: Error Warning */}
        {previewState === 'error' && (
          <div 
            role="alert"
            aria-live="assertive"
            className="w-full p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center gap-2 text-xs animate-fade-in text-left"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Routing Exception</p>
              <p className="text-red-300/80 text-[11px] mt-0.5">The URI scheme contains unsupported symbols or malformed character encoding.</p>
            </div>
          </div>
        )}

        {/* State 1 / Main Copy: Empty Destination Explanation */}
        <div className="space-y-2">
          <span className="text-xs font-black tracking-widest text-[var(--accent-2)] uppercase bg-[var(--input)] px-3 py-1 rounded-full border border-[var(--line)]">
            Error 404
          </span>
          <h1 className="text-3xl font-black text-[var(--text)] tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs text-[var(--muted)] leading-relaxed max-w-sm mx-auto">
            The page, post, or creator profile at <code className="text-[var(--accent-2)] font-mono text-[11px]">/{currentPath || 'unknown'}</code> doesn't exist, was deleted, or the address was mistyped.
          </p>
        </div>

        {/* State 6: Typo Correction & Did You Mean Suggestion */}
        {(suggestedRoute || previewState === 'typo_match') && (
          <div className="w-full p-3.5 bg-[var(--accent)]/10 border border-[var(--accent-2)]/30 rounded-2xl flex items-center justify-between text-xs animate-fade-in text-left">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-[var(--accent-2)] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Did you mean?</span>
                <span className="font-bold text-[var(--text)] truncate block">/{suggestedRoute}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate(suggestedRoute!)}
              className="px-3 py-1.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>Take Me There</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* State 9: Quick Route Jump Bar */}
        <form onSubmit={handleQuickJump} className="w-full space-y-1.5">
          <div className="relative">
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => {
                setJumpInput(e.target.value);
                if (jumpError) setJumpError(null);
              }}
              placeholder="Jump to route or @username..."
              className={`w-full min-h-[44px] bg-[var(--input)] border rounded-2xl pl-4 pr-20 py-2.5 text-xs text-[var(--text)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 transition-all ${
                jumpError ? 'border-[var(--danger)]' : 'border-[var(--line)] focus:border-[var(--accent-2)]'
              }`}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[var(--card)] hover:bg-[var(--hover)] border border-[var(--line)] text-xs font-bold text-[var(--accent-2)] rounded-xl transition-colors cursor-pointer"
            >
              Jump
            </button>
          </div>
          {jumpError && (
            <p className="text-[11px] text-[var(--danger)] text-left pl-2">{jumpError}</p>
          )}
        </form>

        {/* Navigation Quick Actions */}
        <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
          <button
            type="button"
            onClick={() => handleNavigate('feed')}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-bold shadow-lg shadow-[var(--shadow-accent)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Feed</span>
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('explore')}
            className="w-full py-3 px-4 rounded-xl bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--hover)] text-[var(--text)] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <Search className="w-4 h-4 text-[var(--accent-2)]" aria-hidden="true" />
            <span>Explore</span>
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('messages')}
            className="w-full py-2.5 px-3 rounded-xl bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--hover)] text-[var(--text)] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[var(--muted)]" aria-hidden="true" />
            <span>Messages</span>
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('contact')}
            className="w-full py-2.5 px-3 rounded-xl bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--hover)] text-[var(--text)] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <Mail className="w-3.5 h-3.5 text-[var(--muted)]" aria-hidden="true" />
            <span>Support</span>
          </button>
        </div>
      </div>

      {/* State Preview Toolbar */}
      <aside 
        aria-label="UI State Inspector"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[var(--card)]/95 backdrop-blur-md border border-[var(--card-border)] rounded-full shadow-2xl px-3 py-1.5 flex items-center gap-1.5 text-xs text-[var(--muted)] select-none"
      >
        <button
          type="button"
          onClick={() => setShowPreviewToolbar(!showPreviewToolbar)}
          className="flex items-center gap-1.5 font-bold text-[var(--text)] px-2 py-1 hover:text-[var(--accent-2)] transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent-2)]" />
          <span className="text-[11px]">States</span>
        </button>
        {showPreviewToolbar && (
          <div className="flex items-center gap-1 border-l border-[var(--line)] pl-2 overflow-x-auto max-w-[80vw]">
            {(['idle', 'typo_match', 'error', 'offline'] as NotFoundStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  if (st === 'idle') {
                    setPreviewState(null);
                    setIsOffline(false);
                    setJumpError(null);
                  } else if (st === 'typo_match') {
                    setPreviewState('typo_match');
                  } else if (st === 'error') {
                    setPreviewState('error');
                  } else if (st === 'offline') {
                    setPreviewState('offline');
                    setIsOffline(true);
                  }
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                  previewState === st || (st === 'idle' && !previewState && !isOffline)
                    ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                    : 'hover:bg-[var(--hover)] text-[var(--muted)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
};

export default NotFound;
