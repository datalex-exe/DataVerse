import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search as SearchIcon, 
  X, 
  WifiOff, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Lock, 
  Sparkles,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { VerifiedBadge } from '../components/VerifiedBadge';

export type ExploreStatus = 
  | 'empty'
  | 'loading'
  | 'no_results'
  | 'error'
  | 'offline'
  | 'slow'
  | 'session_expired'
  | 'success';

interface ExploreUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
}

interface ExploreProps {
  activeRoom?: string;
  onNavigate: (view: string, targetUsername?: string) => void;
}

// Common dictionary for typo auto-corrector in social search
const POPULAR_SEARCH_TERMS = [
  'pranjal', 'datalex', 'admin', 'verified', 'design', 'creator', 'tech',
  'developer', 'community', 'photography', 'reels', 'music', 'art'
];

export const Explore: React.FC<ExploreProps> = ({ onNavigate }) => {
  const { token, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState<string>(() => {
    return sessionStorage.getItem('dv_saved_search_query') || '';
  });
  const [results, setResults] = useState<ExploreUser[]>([]);
  const [status, setStatus] = useState<ExploreStatus>('empty');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [validationError, setValidationError] = useState<string | null>(null);

  // State Preview Inspector (for testing & UX auditing)
  const [previewState, setPreviewState] = useState<ExploreStatus | null>(null);
  const [showPreviewToolbar, setShowPreviewToolbar] = useState<boolean>(false);

  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Monitor network online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (searchQuery.trim()) triggerSearch(searchQuery);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [searchQuery]);

  // Simple Typo Suggester (Levenshtein distance <= 2)
  const typoSuggestion = useMemo(() => {
    const clean = searchQuery.trim().toLowerCase().replace(/^@+/, '');
    if (!clean || clean.length < 3) return null;

    // Check if any word is close
    let closestMatch: string | null = null;
    let minDistance = 3;

    for (const term of POPULAR_SEARCH_TERMS) {
      if (term === clean) return null; // exact match, no typo
      // Compute simple edit distance
      let dist = 0;
      const longer = term.length > clean.length ? term : clean;
      const shorter = term.length > clean.length ? clean : term;
      
      if (longer.length - shorter.length > 2) continue;

      let mismatches = 0;
      for (let i = 0; i < shorter.length; i++) {
        if (longer[i] !== shorter[i]) mismatches++;
      }
      dist = mismatches + (longer.length - shorter.length);

      if (dist < minDistance && dist > 0 && dist <= 2) {
        minDistance = dist;
        closestMatch = term;
      }
    }
    return closestMatch;
  }, [searchQuery]);

  // Execute Search API request with explicit state lifecycle
  const triggerSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setStatus('empty');
      return;
    }

    // Input Validation State 9
    if (/^[^a-zA-Z0-9_@\s]+$/.test(trimmed)) {
      setValidationError('Please use letters, numbers, or @ for usernames.');
      return;
    }
    setValidationError(null);

    // Offline check State 4
    if (!navigator.onLine) {
      setIsOffline(true);
      setStatus('offline');
      return;
    }

    // Save query to sessionStorage for session restoration
    try {
      sessionStorage.setItem('dv_saved_search_query', trimmed);
    } catch {}

    // Cancel previous request
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    searchAbortRef.current = new AbortController();

    // Begin Loading State 2
    setStatus('loading');

    // Start Slow Network Timer State 5 (>3000ms)
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      setStatus('slow');
    }, 3000);

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/users/search?q=${encodeURIComponent(trimmed)}`, {
        headers,
        signal: searchAbortRef.current.signal
      });

      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);

      // Session Expired State 8
      if (res.status === 401) {
        setStatus('session_expired');
        return;
      }

      // Server Error State 3
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const userList: ExploreUser[] = data.users || [];
      setResults(userList);

      // State 6 vs State 10
      if (userList.length === 0) {
        setStatus('no_results');
      } else {
        setStatus('success');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User kept typing, ignore
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      console.error('Search error:', err);

      if (!navigator.onLine) {
        setIsOffline(true);
        setStatus('offline');
      } else {
        setErrorMessage(err.message || 'Connection timed out');
        setStatus('error');
      }
    }
  };

  // Debounce user keystrokes by 320ms
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerSearch(searchQuery);
    }, 320);

    return () => {
      clearTimeout(timer);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [searchQuery, token]);

  const effectiveStatus = previewState || status;

  // ─────────────────────────────────────────────────────────────────────────────
  // 10-STATE RENDERERS
  // ─────────────────────────────────────────────────────────────────────────────

  // STATE 1: EMPTY STATE (Discovery prompt)
  const renderEmptyState = () => (
    <div 
      role="region" 
      aria-label="Search suggestions" 
      className="w-full py-12 px-6 text-center space-y-4 bg-[var(--card)] rounded-[20px] border border-[var(--card-border)] shadow-sm animate-fade-in select-none"
    >
      <div className="w-14 h-14 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] flex items-center justify-center mx-auto text-[var(--accent-2)] shadow-inner">
        <Sparkles className="w-6 h-6 stroke-[1.8]" />
      </div>
      <div className="space-y-1.5 max-w-sm mx-auto">
        <h2 className="text-base font-semibold text-[var(--text)]">Discover Creators & Topics</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed font-normal">
          Search by name or handle to find friends and community creators.
        </p>
      </div>
    </div>
  );

  // STATE 2: LOADING SKELETON
  const renderLoadingSkeleton = () => (
    <div 
      role="status" 
      aria-live="polite" 
      aria-label="Searching creators..." 
      className="space-y-3 animate-pulse select-none"
    >
      <div className="w-36 h-3 bg-[var(--card-border)] rounded-full mb-3 ml-1" />
      {[1, 2, 3].map(key => (
        <div 
          key={key} 
          className="p-3 sm:p-4 rounded-[18px] bg-[var(--card)] flex items-center justify-between border border-[var(--card-border)] shadow-sm"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-[var(--input)] flex-shrink-0" />
            <div className="flex-1 space-y-2 py-0.5">
              <div className="w-2/5 h-3.5 bg-[var(--input)] rounded-md" />
              <div className="w-1/4 h-2.5 bg-[var(--input)] rounded-md opacity-70" />
            </div>
          </div>
          <div className="w-20 h-8 rounded-full bg-[var(--input)] flex-shrink-0 ml-3" />
        </div>
      ))}
    </div>
  );

  // STATE 3: ERROR STATE
  const renderErrorState = () => (
    <div 
      role="alert" 
      aria-live="assertive" 
      className="p-8 sm:p-12 text-center space-y-4 bg-[var(--card)] rounded-[20px] border border-[var(--card-border)] shadow-sm animate-fade-in select-none"
    >
      <div className="w-14 h-14 rounded-2xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] flex items-center justify-center mx-auto text-[var(--danger)]">
        <AlertTriangle className="w-6 h-6 stroke-[2]" />
      </div>
      <div className="space-y-1.5 max-w-sm mx-auto">
        <h2 className="text-base font-semibold text-[var(--text)]">Search temporarily unavailable</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed font-normal">
          {errorMessage ? `${errorMessage}. ` : ''}Our servers took too long to answer. It's on our side, and your search term is saved.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => triggerSearch(searchQuery)}
          className="min-h-[44px] px-6 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-semibold text-xs shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Search
        </button>
        <button
          type="button"
          onClick={() => setSearchQuery('')}
          className="min-h-[44px] px-5 rounded-full border border-[var(--card-border)] bg-[var(--input)] hover:bg-[var(--hover)] text-[var(--muted)] text-xs font-medium active:scale-95 transition-all cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );

  // STATE 4: OFFLINE BANNER
  const renderOfflineBanner = () => (
    <div 
      role="status" 
      aria-live="polite" 
      className="p-3.5 rounded-2xl bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] flex items-center justify-between gap-3 text-xs select-none animate-fade-in"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-[color-mix(in_srgb,var(--gold)_20%,transparent)] flex items-center justify-center flex-shrink-0 text-[var(--gold)]">
          <WifiOff className="w-4 h-4" />
        </div>
        <p className="text-[var(--text)] leading-snug">
          <span className="font-semibold text-[var(--gold)] mr-1">You're offline.</span>
          Live search is paused until your connection is restored.
        </p>
      </div>
      <button
        type="button"
        onClick={() => triggerSearch(searchQuery)}
        className="min-h-[34px] px-3.5 bg-[var(--card)] hover:bg-[var(--hover)] border border-[var(--card-border)] text-[var(--text)] text-xs font-semibold rounded-full active:scale-95 transition-all flex-shrink-0 cursor-pointer"
      >
        Retry
      </button>
    </div>
  );

  // STATE 5: SLOW NETWORK BANNER
  const renderSlowBanner = () => (
    <div 
      role="status" 
      aria-live="polite" 
      className="p-3.5 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] flex items-center justify-between gap-3 text-xs select-none animate-fade-in"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] flex items-center justify-center flex-shrink-0 text-[var(--accent-2)]">
          <Clock className="w-4 h-4 animate-spin" />
        </div>
        <p className="text-[var(--text)] leading-snug">
          <span className="font-semibold text-[var(--accent-2)] mr-1">Slow connection:</span>
          Searching is taking longer than usual on your network.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setStatus('loading')}
        className="min-h-[34px] px-3 text-[var(--muted)] hover:text-[var(--text)] text-xs rounded-full cursor-pointer"
      >
        Waiting...
      </button>
    </div>
  );

  // STATE 6: NO SEARCH RESULTS (With Typo Fix & Alternatives)
  const renderNoResultsState = () => (
    <div 
      role="region" 
      aria-label="No results found" 
      className="p-8 sm:p-12 text-center space-y-5 bg-[var(--card)] rounded-[20px] border border-[var(--card-border)] shadow-sm animate-fade-in select-none"
    >
      <div className="w-14 h-14 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] flex items-center justify-center mx-auto text-[var(--muted)]">
        <SearchIcon className="w-6 h-6 stroke-[1.8]" />
      </div>
      
      <div className="space-y-2 max-w-sm mx-auto">
        <h2 className="text-base font-semibold text-[var(--text)]">
          No creators found for "{searchQuery}"
        </h2>
        
        {/* Typo Correction Prompt */}
        {typoSuggestion ? (
          <div className="pt-1 pb-2">
            <p className="text-xs text-[var(--muted)] mb-2">Did you mean:</p>
            <button
              type="button"
              onClick={() => setSearchQuery(typoSuggestion)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] border border-[var(--accent-2)] text-[var(--accent-2)] font-semibold text-xs hover:bg-[color-mix(in_srgb,var(--accent)_25%,transparent)] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <span>@{typoSuggestion}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)] leading-relaxed font-normal">
            Check the spelling or try searching for a different handle, keyword, or real name.
          </p>
        )}
      </div>

      {/* Suggested Alternative Searches */}
      <div className="pt-2 border-t border-[var(--card-border)] max-w-xs mx-auto">
        <span className="text-[11px] font-semibold text-[var(--muted)] block mb-2 uppercase tracking-wide">
          Popular Searches
        </span>
        <div className="flex flex-wrap justify-center gap-1.5">
          {['admin', 'verified', 'design', 'tech'].map(term => (
            <button
              key={term}
              type="button"
              onClick={() => setSearchQuery(term)}
              className="px-3 py-1 rounded-full bg-[var(--input)] hover:bg-[var(--hover)] border border-[var(--card-border)] text-xs text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
            >
              @{term}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // STATE 8: SESSION EXPIRED MODAL
  const renderSessionExpired = () => (
    <div 
      role="dialog" 
      aria-modal="true" 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in"
    >
      <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-6 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--gold)_15%,transparent)] border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] flex items-center justify-center text-[var(--gold)] mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-[var(--text)]">Session Timed Out</h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Your login session expired. We've saved your search for "{searchQuery}" so you can pick right back up.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              logout();
              onNavigate('auth');
            }}
            className="min-h-[44px] w-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-semibold text-xs shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            Log In Again
          </button>
        </div>
      </div>
    </div>
  );

  // STATE 10: SUCCESS RESULTS LIST
  const renderResultsList = () => (
    <div 
      role="region" 
      aria-live="polite" 
      aria-label={`Search results (${results.length} found)`}
      className="w-full space-y-3 animate-fade-in"
    >
      <div className="flex justify-between items-center pl-1 border-b border-[var(--card-border)] pb-2 select-none">
        <h2 className="text-xs font-semibold text-[var(--muted)]">
          Search Results ({results.length})
        </h2>
        <span className="text-[11px] text-[var(--muted)]">
          Showing matching creators
        </span>
      </div>

      <div className="space-y-2">
        {results.map(item => (
          <div 
            key={item.id} 
            className="p-3 sm:p-4 rounded-[18px] bg-[var(--card)] flex items-center justify-between border border-[var(--card-border)] shadow-sm hover:border-[var(--accent-2)]/40 transition-colors"
          >
            <div 
              onClick={() => onNavigate('profile', item.username)}
              className="flex items-center gap-3 cursor-pointer group min-w-0 flex-1"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--input)] border border-[var(--card-border)] flex items-center justify-center text-xs font-bold text-[var(--accent-2)] uppercase select-none overflow-hidden shadow-sm flex-shrink-0">
                {item.avatar_url ? (
                  <img src={`/api/media/file/${item.avatar_url}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                ) : (
                  item.username.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent-2)] transition-colors flex items-center gap-1 truncate">
                  <span>{item.display_name || item.username}</span>
                  {!!item.is_verified && <VerifiedBadge size={14} />}
                </h3>
                <p className="text-xs text-[var(--muted)] truncate">@{item.username}</p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => onNavigate('profile', item.username)}
              aria-label={`View ${item.username}'s profile`}
              className="min-h-[36px] px-4 rounded-full border border-[var(--card-border)] text-xs font-semibold text-[var(--accent-2)] hover:bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] transition-all active:scale-95 flex-shrink-0 cursor-pointer ml-2"
            >
              View Profile
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[640px] mx-auto self-center px-4 pt-3 sm:pt-6 pb-24 md:pb-12 space-y-5 animate-fade-in select-none">
      
      {/* ───────────────────────────────────────────────────────────────────────
          STATE PREVIEW TOOLBAR (Only shown in local dev or via ?debug_states=1)
      ──────────────────────────────────────────────────────────────────────── */}
      {(import.meta.env.DEV || (typeof window !== 'undefined' && window.location.search.includes('debug_states=1'))) && (
        <div className="border-b border-[var(--card-border)] pb-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowPreviewToolbar(!showPreviewToolbar)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              aria-expanded={showPreviewToolbar}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>State Inspector ({effectiveStatus})</span>
            </button>
            {previewState && (
              <button
                type="button"
                onClick={() => setPreviewState(null)}
                className="text-[10px] text-[var(--accent-2)] hover:underline cursor-pointer"
              >
                Reset to Live
              </button>
            )}
          </div>

          {showPreviewToolbar && (
            <div className="mt-2 p-2 rounded-xl bg-[var(--card)] border border-[var(--card-border)] flex flex-wrap gap-1 text-[11px] animate-fade-in">
              {(['empty', 'loading', 'success', 'no_results', 'error', 'offline', 'slow', 'session_expired'] as ExploreStatus[]).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPreviewState(st)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    effectiveStatus === st
                      ? 'bg-[var(--accent-2)] text-[var(--bg)] border-[var(--accent-2)] font-semibold'
                      : 'bg-[var(--input)] text-[var(--muted)] hover:text-[var(--text)] border-[var(--card-border)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          SEARCH BAR
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="relative w-full">
          <label htmlFor="explore-search-input" className="sr-only">
            Search creators, posts, topics
          </label>
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--muted)] stroke-[1.8]" aria-hidden="true" />
          <input
            id="explore-search-input"
            type="search"
            placeholder="Search creators, topics, or handles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--input)] border border-[var(--card-border)] focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/20 rounded-full py-3.5 pl-11 pr-11 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all shadow-sm"
            autoFocus
          />
          {effectiveStatus === 'loading' ? (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Clock className="w-4 h-4 animate-spin text-[var(--accent-2)]" />
            </div>
          ) : searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setResults([]);
                setStatus('empty');
              }}
              aria-label="Clear search input"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[1.8]" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* STATE 9: INLINE VALIDATION WARNING */}
        {validationError && (
          <p role="alert" className="text-xs text-[var(--danger)] pl-4 font-medium animate-fade-in">
            {validationError}
          </p>
        )}
      </div>

      {/* Network Banners */}
      {isOffline && renderOfflineBanner()}
      {effectiveStatus === 'slow' && renderSlowBanner()}

      {/* ───────────────────────────────────────────────────────────────────────
          VIEW RENDERING BASED ON EXPLICIT STATUS
      ──────────────────────────────────────────────────────────────────────── */}
      {effectiveStatus === 'empty' && renderEmptyState()}

      {effectiveStatus === 'loading' && renderLoadingSkeleton()}

      {effectiveStatus === 'no_results' && renderNoResultsState()}

      {effectiveStatus === 'error' && renderErrorState()}

      {effectiveStatus === 'session_expired' && renderSessionExpired()}

      {effectiveStatus === 'success' && renderResultsList()}

      {effectiveStatus === 'offline' && results.length === 0 && renderEmptyState()}

    </div>
  );
};

export default Explore;
