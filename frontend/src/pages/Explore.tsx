import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search as SearchIcon, Loader2, UserPlus, X } from 'lucide-react';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { Footer } from '../components/Footer';

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

export const Explore: React.FC<ExploreProps> = ({ onNavigate }) => {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [results, setResults] = useState<ExploreUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Search trigger with 300ms debounce
  useEffect(() => {
    if (!token) return;

    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim() === '') {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setResults(data.users || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, token]);

  return (
    <div className="w-full max-w-4xl mx-auto self-center px-4 py-8 space-y-8 animate-fade-in select-none">
      
      {/* Centralized Search Bar */}
      <div className="relative max-w-xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-black text-[var(--text)] text-center">Search Explore</h1>
          <p className="text-xs text-[var(--muted)] mt-1 text-center">Search for creators, friends, and other registered users in the network.</p>
        </div>
        
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--muted)]" aria-hidden="true" />
          <label htmlFor="explore-search-input" className="sr-only">
            Search for creators and friends
          </label>
          <input
            id="explore-search-input"
            type="search"
            placeholder="Type a username or display name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--input)] border border-[var(--line)] focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/20 rounded-2xl py-3.5 pl-12 pr-12 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all"
            autoFocus
          />
          {loading ? (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-2)]" />
            </div>
          ) : searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search input"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Conditional View */}
      {searchQuery.trim() !== '' ? (
        // Search Results view
        <div className="max-w-xl mx-auto space-y-4 animate-fade-in">
          <div className="flex justify-between items-center pl-1 border-b border-[var(--line)] pb-2">
            <h2 className="text-xs font-black text-[var(--muted)] uppercase tracking-widest">
              Search Results ({results.length})
            </h2>
          </div>
          
          {/* THEME START */}
          {results.length === 0 && !loading ? (
            <div className="text-center py-16 bg-[var(--card)] rounded-3xl border border-[var(--line)] text-[var(--muted)] text-xs">
              No users matching "{searchQuery}" found.
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((item) => (
                <div 
                  key={item.id} 
                  className="glass-card p-4 rounded-2xl flex items-center justify-between border border-[var(--line)] transition-colors"
                >
                  <div 
                    onClick={() => onNavigate('profile', item.username)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--input)] border border-[var(--line)] flex items-center justify-center text-xs font-bold text-[var(--accent-2)] uppercase select-none overflow-hidden shadow flex-shrink-0">
                      {item.avatar_url ? (
                        <img src={`/api/media/file/${item.avatar_url}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                      ) : (
                        item.username.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text)] group-hover:text-[var(--accent-2)] transition-colors flex items-center gap-1">
                        {item.display_name || item.username}
                        {!!item.is_verified && <VerifiedBadge />}
                      </h3>
                      <p className="text-[10px] text-[var(--muted)] mt-0.5">@{item.username}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => onNavigate('profile', item.username)}
                    aria-label={`View ${item.username}'s profile`}
                    className="text-xs font-bold text-[var(--accent-2)] hover:text-[var(--on-accent)] hover:bg-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border border-[var(--line)] px-4 py-2 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
                  >
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Empty Search State Page (Search Guidance & Discover Tips)
        <div className="max-w-xl mx-auto py-16 text-center space-y-4 bg-[var(--card)] rounded-3xl border border-[var(--line)] shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[var(--input)] border border-[var(--line)] flex items-center justify-center mx-auto text-[var(--muted)]">
            <UserPlus className="w-5.5 h-5.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest">Find Friends</h2>
            <p className="text-[11px] text-[var(--muted)] max-w-xs mx-auto mt-2 leading-relaxed font-medium">
              Start typing a username in the search input above to discover other creators, view their profiles, or send messages!
            </p>
          </div>
        </div>
      )}
      {/* THEME END */}

      <Footer onNavigate={onNavigate} className="border-t-0 mt-8" />
    </div>
  );
};

export default Explore;
