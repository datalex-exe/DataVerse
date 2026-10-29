import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search as SearchIcon, Loader2, UserPlus, X } from 'lucide-react';
import { VerifiedBadge } from '../components/VerifiedBadge';

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
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim() === '') {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
          headers
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
    <div className="w-full max-w-[640px] mx-auto self-center px-4 pt-3 sm:pt-6 pb-24 md:pb-12 space-y-5 animate-fade-in select-none">
      
      {/* Centralized Search Bar (Pill with leading icon) */}
      <div className="relative w-full">
        <label htmlFor="explore-search-input" className="sr-only">
          Search creators, posts, topics
        </label>
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--muted)] stroke-[1.8]" aria-hidden="true" />
        <input
          id="explore-search-input"
          type="search"
          placeholder="Search creators, posts, topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[var(--input)] border border-[var(--card-border)] focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/20 rounded-full py-3 pl-11 pr-11 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all shadow-sm"
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
            <X className="w-4 h-4 stroke-[1.8]" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Conditional View */}
      {searchQuery.trim() !== '' ? (
        // Search Results view
        <div className="w-full space-y-3 animate-fade-in">
          <div className="flex justify-between items-center pl-1 border-b border-[var(--card-border)] pb-2">
            <h2 className="text-xs font-semibold text-[var(--muted)]">
              Search Results ({results.length})
            </h2>
          </div>
          
          {results.length === 0 && !loading ? (
            <div className="text-center py-16 bg-[var(--card)] rounded-[20px] border border-[var(--card-border)] text-[var(--muted)] text-xs">
              No users matching "{searchQuery}" found.
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((item) => (
                <div 
                  key={item.id} 
                  className="p-3 sm:p-4 rounded-[18px] bg-[var(--card)] flex items-center justify-between border border-[var(--card-border)] shadow-sm hover:border-[var(--accent-2)]/40 transition-colors"
                >
                  <div 
                    onClick={() => onNavigate('profile', item.username)}
                    className="flex items-center gap-3 cursor-pointer group min-w-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--input)] border border-[var(--card-border)] flex items-center justify-center text-xs font-bold text-[var(--accent-2)] uppercase select-none overflow-hidden shadow-sm flex-shrink-0">
                      {item.avatar_url ? (
                        <img src={`/api/media/file/${item.avatar_url}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                      ) : (
                        item.username.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
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
                    className="text-xs font-semibold text-[var(--accent-2)] hover:bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] border border-[var(--card-border)] px-3.5 py-1.5 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] cursor-pointer flex-shrink-0 ml-2"
                  >
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Empty Search State Page (Search Guidance)
        <div className="w-full py-16 text-center space-y-3 bg-[var(--card)] rounded-[20px] border border-[var(--card-border)] shadow-sm p-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] flex items-center justify-center mx-auto text-[var(--muted)]">
            <UserPlus className="w-5 h-5 stroke-[1.8]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Discover Creators</h2>
            <p className="text-xs text-[var(--muted)] max-w-xs mx-auto mt-1.5 leading-relaxed font-normal">
              Search by username or display name to find friends, creators, and start conversations.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default Explore;
