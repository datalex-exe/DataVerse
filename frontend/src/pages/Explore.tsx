import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search as SearchIcon, Loader2, UserPlus } from 'lucide-react';
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
          <h3 className="text-lg font-black text-white text-center">Search Explore</h3>
          <p className="text-xs text-slate-500 mt-1 text-center">Search for creators, friends, and other registered users in the network.</p>
        </div>
        
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Type a username or display name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 focus:border-brand-500 rounded-2xl py-3.5 pl-12 pr-12 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-all"
            autoFocus
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            </div>
          )}
        </div>
      </div>

      {/* Conditional View */}
      {searchQuery.trim() !== '' ? (
        // Search Results view
        <div className="max-w-xl mx-auto space-y-4 animate-fade-in">
          <div className="flex justify-between items-center pl-1 border-b border-white/[0.02] pb-2">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Search Results ({results.length})
            </h4>
          </div>
          
          {results.length === 0 && !loading ? (
            <div className="text-center py-16 bg-[#09090d]/30 rounded-3xl border border-white/5 text-slate-600 text-xs">
              No users matching "{searchQuery}" found.
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((item) => (
                <div 
                  key={item.id} 
                  className="glass-card p-4 rounded-2xl flex items-center justify-between border border-white/[0.03] hover:border-slate-850 transition-colors"
                >
                  <div 
                    onClick={() => onNavigate('profile', item.username)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 uppercase select-none overflow-hidden shadow">
                      {item.avatar_url ? (
                        <img src={`/api/media/file/${item.avatar_url}`} alt={item.username} className="w-full h-full object-cover" />
                      ) : (
                        item.username.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-brand-400 transition-colors flex items-center">
                        {item.display_name || item.username}
                        {!!item.is_verified && <VerifiedBadge />}
                      </h4>
                      <p className="text-[10px] text-slate-505 mt-0.5">@{item.username}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onNavigate('profile', item.username)}
                    className="text-[10px] font-black text-brand-500 hover:text-brand-400 bg-brand-500/10 px-4 py-2 rounded-xl transition-all"
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
        <div className="max-w-xl mx-auto py-16 text-center space-y-4 bg-[#09090d]/10 rounded-3xl border border-white/[0.01]">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-900 flex items-center justify-center mx-auto text-slate-500">
            <UserPlus className="w-5.5 h-5.5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Find Friends</h4>
            <p className="text-[11px] text-slate-600 max-w-xs mx-auto mt-2 leading-relaxed font-medium">
              Start typing a username in the search input above to discover other creators, view their profiles, or send messages!
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default Explore;
