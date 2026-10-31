import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { 
  Heart, 
  MessageCircle, 
  PlusSquare, 
  Send, 
  X, 
  Loader2, 
  Smile, 
  Bookmark, 
  Share2, 
  Trash, 
  Check, 
  Search,
  MoreHorizontal,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Compass,
  Lock,
  SlidersHorizontal
} from 'lucide-react';

export type FeedStatus = 
  | 'idle'
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'slow'
  | 'session_expired';

interface Media {
  id: string;
  r2_key: string;
  media_type: string;
  position: number;
}

interface Post {
  id: string;
  caption: string | null;
  created_at: number;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  media: Media[];
  is_private?: boolean;
}

interface Comment {
  id: string;
  body: string;
  created_at: number;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
}

interface FeedProps {
  onNavigate: (view: string, targetUsername?: string) => void;
  onToggleBottomNav?: (hide: boolean) => void;
  targetPostId?: string;
}

export const Feed: React.FC<FeedProps> = ({ onNavigate, onToggleBottomNav, targetPostId }) => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  
  // Feed posts state with instant sessionStorage cache
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const cached = sessionStorage.getItem('dv_cached_feed');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [status, setStatus] = useState<FeedStatus>(() => {
    try {
      return sessionStorage.getItem('dv_cached_feed') ? 'idle' : 'loading';
    } catch {
      return 'loading';
    }
  });
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isSlowNetwork, setIsSlowNetwork] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [previewState, setPreviewState] = useState<FeedStatus | null>(null);
  const [showPreviewToolbar, setShowPreviewToolbar] = useState<boolean>(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [commentValidationErrors, setCommentValidationErrors] = useState<Record<string, string>>({});
  const [drawerCommentError, setDrawerCommentError] = useState<string | null>(null);
  const [isLiteMode, setIsLiteMode] = useState<boolean>(false);
  const slowTimerRef = useRef<any>(null);

  const [isSinglePostFiltered, setIsSinglePostFiltered] = useState<boolean>(false);
  
  // Comments drawer state
  const [activePostComments, setActivePostComments] = useState<string | null>(null); // postId
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [loadingComments, setLoadingComments] = useState<boolean>(false);

  /* UI UPDATE START - More menu state & click outside handler */
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuPostId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchFeed(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      if (posts.length === 0) setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, []);
  /* UI UPDATE END */

  // Fetch feed posts with explicit 10-state lifecycle
  const fetchFeed = async (showLoading = false) => {
    if (!token) {
      setStatus('session_expired');
      return;
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setStatus(posts.length === 0 ? 'offline' : 'idle');
      return;
    }

    if (showLoading && posts.length === 0) {
      setStatus('loading');
    }
    setIsSlowNetwork(false);

    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      setIsSlowNetwork(true);
      if (posts.length === 0) setStatus('slow');
    }, 3500);

    try {
      const res = await fetch('/api/posts/feed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);

      if (res.status === 401) {
        try {
          if (newCommentText) {
            sessionStorage.setItem('dv_pending_comment', JSON.stringify({ postId: activePostComments, text: newCommentText }));
          }
        } catch {}
        setStatus('session_expired');
        return;
      }

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const incoming: Post[] = data.posts || [];
      setPosts(incoming);
      try {
        sessionStorage.setItem('dv_cached_feed', JSON.stringify(incoming.slice(0, 25)));
      } catch {}

      setStatus(incoming.length === 0 ? 'empty' : 'idle');
      setIsSlowNetwork(false);
    } catch (err: any) {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      console.error('Error fetching feed:', err);
      if (!navigator.onLine) {
        setIsOffline(true);
        setStatus(posts.length === 0 ? 'offline' : 'idle');
      } else {
        setErrorMessage(err.message || 'Unable to connect to feed stream');
        setStatus(posts.length === 0 ? 'error' : 'idle');
      }
    }
  };

  // Delete Post API
  const handleDeletePost = async (postId: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to delete post');
      }

      // Optimistically remove from feed state
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete post');
    }
  };

  const [savedPostIds, setSavedPostIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`dataverse_saved_posts_${user?.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [sharingConversations, setSharingConversations] = useState<any[]>([]);
  const [loadingSharingConvos, setLoadingSharingConvos] = useState<boolean>(false);
  const [searchConvoQuery, setSearchConvoQuery] = useState<string>('');
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});

  const openShareModal = async (post: Post) => {
    setSharingPost(post);
    setSentStatus({});
    setSearchConvoQuery('');
    
    if (!token) return;
    setLoadingSharingConvos(true);
    try {
      const res = await fetch('/api/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSharingConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingSharingConvos(false);
    }
  };

  const handleSendToConvo = async (convoId: string, post: Post) => {
    if (!token) return;
    const messageBody = `[Shared Post] @${post.username}: ${post.caption || 'Photo'} | post_id: ${post.id}`;
    
    try {
      const res = await fetch(`/api/conversations/${convoId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ body: messageBody })
      });
      
      if (res.ok) {
        setSentStatus(prev => ({ ...prev, [convoId]: true }));
      } else {
        alert('Failed to send post.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send post.');
    }
  };

  const handleShareExternally = async (post: Post) => {
    const isPublic = !post.is_private;
    const shareUrl = isPublic
      ? `${window.location.origin}/?post=${post.id}`
      : `${window.location.origin}/profile/${post.username}`;
      
    const shareText = isPublic
      ? `Check out this post on DataVerse!`
      : `Check out ${post.display_name || post.username}'s profile on DataVerse!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DataVerse Post',
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      } catch {
        toast.error('Failed to copy link to clipboard.');
      }
    }
  };

  const handleToggleSave = (postId: string) => {
    if (!user) return;
    setSavedPostIds((prev) => {
      const isSaved = prev.includes(postId);
      const next = isSaved ? prev.filter((id) => id !== postId) : [...prev, postId];
      localStorage.setItem(`dataverse_saved_posts_${user.id}`, JSON.stringify(next));
      return next;
    });
  };

  // Lock body scroll and hide bottom nav when comments drawer is active/open
  useEffect(() => {
    if (activePostComments) {
      // Hide bottom navigation
      if (onToggleBottomNav) {
        onToggleBottomNav(true);
      }
      
      // Fixed body scroll lock to support all mobile touch browsers
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore bottom navigation
      if (onToggleBottomNav) {
        onToggleBottomNav(false);
      }

      // Restore body style and scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY) * -1);
      }
    }
    return () => {
      if (onToggleBottomNav) {
        onToggleBottomNav(false);
      }
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [activePostComments, onToggleBottomNav]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resolvedPostId = targetPostId || urlParams.get('post');
    if (resolvedPostId && token) {
      setStatus('loading');
      fetch(`/api/posts/${resolvedPostId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to load post');
        })
        .then(data => {
          if (data.post) {
            setPosts([data.post]);
            setIsSinglePostFiltered(true);
            setStatus('idle');
          } else {
            fetchFeed();
          }
        })
        .catch(err => {
          console.error(err);
          fetchFeed();
        });
    } else {
      setIsSinglePostFiltered(false);
      fetchFeed();
    }
  }, [token, targetPostId]);

  // Clean captions
  const getCleanCaptionAndRoom = (rawCaption: string | null) => {
    if (!rawCaption) return { caption: '', room: null };
    if (rawCaption.startsWith('[Design] ')) return { caption: rawCaption.substring(9), room: 'Design' };
    if (rawCaption.startsWith('[Music] ')) return { caption: rawCaption.substring(8), room: 'Music Lab' };
    if (rawCaption.startsWith('[Founders] ')) return { caption: rawCaption.substring(11), room: 'Founders' };
    return { caption: rawCaption, room: null };
  };

  // Handle Likes
  const handleLike = async (postId: string, alreadyLiked: boolean) => {
    if (!token) return;

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          is_liked: !alreadyLiked,
          likes_count: p.likes_count + (alreadyLiked ? -1 : 1)
        };
      }
      return p;
    }));

    try {
      const method = alreadyLiked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/posts/${postId}/like`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) fetchFeed();
    } catch (err) {
      console.error(err);
      fetchFeed();
    }
  };

  // Open Comments Drawer
  const handleOpenComments = async (postId: string) => {
    setActivePostComments(postId);
    setLoadingComments(true);
    setComments([]);
    if (!token) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Submit comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) {
      setDrawerCommentError('Please enter a comment before submitting.');
      return;
    }
    if (newCommentText.length > 500) {
      setDrawerCommentError('Comment exceeds 500 characters.');
      return;
    }
    setDrawerCommentError(null);
    if (!activePostComments || !token) return;

    const text = newCommentText.trim();
    setNewCommentText('');

    try {
      const res = await fetch(`/api/posts/${activePostComments}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ body: text })
      });

      if (res.status === 401) {
        setStatus('session_expired');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setComments(prev => [...prev, data.comment]);
        setPosts(prev => prev.map(p => {
          if (p.id === activePostComments) {
            return { ...p, comments_count: p.comments_count + 1 };
          }
          return p;
        }));
        toast.success('Comment added');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to post comment. Check connection.');
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 60) return `${mins <= 0 ? 'just now' : mins + 'm'}`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const effectiveStatus: FeedStatus = previewState || status;

  // ─────────────────────────────────────────────────────────────────────────────
  // 10-STATE RENDERERS (State 1, 2, 3, 4, 5, 8, 10)
  // ─────────────────────────────────────────────────────────────────────────────

  // State 2: Loading Skeletons matching exact feed post card layout
  const renderFeedSkeleton = () => (
    <div className="space-y-4 px-0 sm:px-3 pt-2" aria-busy="true" aria-label="Loading feed posts">
      {[1, 2].map((idx) => (
        <div 
          key={idx}
          className="sm:bg-[var(--card)] sm:border sm:border-[var(--card-border)] sm:rounded-[20px] bg-transparent border-b border-[var(--card-border)] p-4 sm:p-5 animate-pulse"
        >
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--input)]" />
              <div className="space-y-1.5">
                <div className="w-28 h-3.5 bg-[var(--input)] rounded-md" />
                <div className="w-16 h-2.5 bg-[var(--input)]/60 rounded-md" />
              </div>
            </div>
            <div className="w-6 h-6 rounded-md bg-[var(--input)]/40" />
          </div>

          {/* Media box skeleton (4:3 aspect ratio) */}
          <div className="w-full aspect-[4/3] rounded-2xl bg-[var(--input)] flex items-center justify-center my-3 relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-white/5" />
          </div>

          {/* Actions row skeleton */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <div className="w-7 h-7 rounded-full bg-[var(--input)]" />
              <div className="w-7 h-7 rounded-full bg-[var(--input)]" />
              <div className="w-7 h-7 rounded-full bg-[var(--input)]" />
            </div>
            <div className="w-7 h-7 rounded-full bg-[var(--input)]" />
          </div>

          {/* Caption skeleton */}
          <div className="space-y-2 mt-3 pt-1">
            <div className="w-3/4 h-3 bg-[var(--input)] rounded-md" />
            <div className="w-1/2 h-3 bg-[var(--input)]/70 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );

  // State 1: Empty Feed with Dual Next-Step Actions
  const renderEmptyState = () => (
    <div className="sm:bg-[var(--card)] sm:border sm:border-[var(--card-border)] sm:rounded-[20px] bg-transparent border-b border-[var(--card-border)] p-8 sm:p-12 text-center text-[var(--muted)] flex flex-col items-center gap-4 my-2">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent-2)]/15 border border-[var(--accent-2)]/30 flex items-center justify-center text-[var(--accent-2)] shadow-inner">
        <Smile className="w-7 h-7" aria-hidden="true" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h2 className="font-extrabold text-base text-[var(--text)]">Your Feed is Quiet</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          You haven't followed any creators yet, and no one has posted in your network. Explore trending voices or share your own first moment!
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 w-full max-w-xs">
        <button 
          type="button"
          onClick={() => onNavigate('explore')}
          aria-label="Discover creators on explore page"
          className="w-full min-h-[44px] py-2.5 px-5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-bold rounded-full shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
        >
          <Compass className="w-4 h-4" />
          <span>Explore Creators</span>
        </button>
        <button 
          type="button"
          onClick={() => onNavigate('create')}
          aria-label="Create your first post"
          className="w-full min-h-[44px] py-2.5 px-5 bg-[var(--input)] border border-[var(--card-border)] hover:bg-[var(--hover)] text-[var(--text)] text-xs font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <PlusSquare className="w-4 h-4 text-[var(--accent-2)]" />
          <span>Create Post</span>
        </button>
      </div>
    </div>
  );

  // State 3: Error State with Cause & Remediation
  const renderErrorState = () => (
    <div className="sm:bg-[var(--card)] sm:border sm:border-[var(--card-border)] sm:rounded-[20px] bg-transparent border-b border-[var(--card-border)] p-8 sm:p-10 text-center flex flex-col items-center gap-4 my-2">
      <div className="w-14 h-14 rounded-full bg-[var(--danger)]/15 border border-[var(--danger)]/30 flex items-center justify-center text-[var(--danger)] shadow-inner">
        <AlertTriangle className="w-7 h-7" aria-hidden="true" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h2 className="font-extrabold text-base text-[var(--text)]">Feed Stream Unavailable</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          {errorMessage ? `Error: ${errorMessage}. ` : ''}We had trouble connecting to the DataVerse feed servers. This is on our end, not yours.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 w-full max-w-xs">
        <button 
          type="button"
          onClick={() => fetchFeed(true)}
          className="w-full min-h-[44px] py-2.5 px-5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-bold rounded-full shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
        {savedPostIds.length > 0 && (
          <button 
            type="button"
            onClick={() => onNavigate('profile', user?.username)}
            className="w-full min-h-[44px] py-2.5 px-5 bg-[var(--input)] border border-[var(--card-border)] hover:bg-[var(--hover)] text-[var(--text)] text-xs font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Bookmark className="w-4 h-4 text-[var(--accent-2)]" />
            <span>Saved Posts ({savedPostIds.length})</span>
          </button>
        )}
      </div>
    </div>
  );

  // State 4: Offline State when cache is empty
  const renderOfflineZeroState = () => (
    <div className="sm:bg-[var(--card)] sm:border sm:border-[var(--card-border)] sm:rounded-[20px] bg-transparent border-b border-[var(--card-border)] p-8 sm:p-10 text-center flex flex-col items-center gap-4 my-2">
      <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
        <WifiOff className="w-7 h-7" aria-hidden="true" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h2 className="font-extrabold text-base text-[var(--text)]">You're Currently Offline</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          No cached feed posts are stored on this device yet. Once you reconnect to the internet, your feed will update automatically.
        </p>
      </div>
      <button 
        type="button"
        onClick={() => fetchFeed(false)}
        className="min-h-[44px] py-2.5 px-6 bg-[var(--input)] border border-[var(--card-border)] hover:bg-[var(--hover)] text-[var(--text)] text-xs font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-4 h-4 text-amber-400" />
        <span>Check Internet Connection</span>
      </button>
    </div>
  );

  // State 8: Session Expired Modal with Draft Preservation
  const renderSessionExpiredModal = () => (
    <div 
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-desc"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="w-full max-w-sm rounded-[24px] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-2xl space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="text-center space-y-1.5">
          <h2 id="session-expired-title" className="text-base font-bold text-[var(--text)]">Session Expired</h2>
          <p id="session-expired-desc" className="text-xs text-[var(--muted)] leading-relaxed">
            Your login session timed out. Any comments or drafts you've written have been saved locally so you won't lose your work.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="min-h-[44px] w-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-semibold text-xs shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            Log In Again
          </button>
        </div>
      </div>
    </div>
  );

  // State 10: In-App Post Deletion Safe Confirmation Dialog
  const renderDeleteDialog = () => {
    if (!postToDelete) return null;
    return (
      <div 
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      >
        <div className="w-full max-w-sm rounded-[24px] border border-[var(--card-border)] bg-[var(--card)] p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--danger)]/15 border border-[var(--danger)]/30 flex items-center justify-center text-[var(--danger)] mx-auto">
            <Trash className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1.5">
            <h2 id="delete-dialog-title" className="text-base font-bold text-[var(--text)]">Delete This Post?</h2>
            <p id="delete-dialog-desc" className="text-xs text-[var(--muted)] leading-relaxed">
              This will permanently remove the post, images, likes, and comments from DataVerse. This action cannot be undone.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPostToDelete(null)}
              className="min-h-[44px] flex-1 rounded-full bg-[var(--input)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const id = postToDelete.id;
                setPostToDelete(null);
                handleDeletePost(id);
              }}
              className="min-h-[44px] flex-1 rounded-full bg-[var(--danger)] text-white text-xs font-bold hover:brightness-110 shadow-md shadow-[var(--danger)]/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Delete Post</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // State Preview Toolbar (Only shown in local dev or via ?debug_states=1)
  const renderStatePreviewToolbar = () => {
    if (!import.meta.env.DEV && !(typeof window !== 'undefined' && window.location.search.includes('debug_states=1'))) {
      return null;
    }
    return (
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end">
        {showPreviewToolbar && (
          <div className="mb-2 p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl space-y-2 text-xs w-60 animate-fade-in backdrop-blur-md">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--card-border)]">
              <span className="font-bold text-[var(--accent-2)]">Feed 10-State Preview</span>
              <button 
                type="button" 
                onClick={() => setPreviewState(null)} 
                className="text-[10px] text-[var(--muted)] hover:text-[var(--text)]"
              >
                Reset Live
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['loading', 'empty', 'error', 'offline', 'slow', 'session_expired'] as FeedStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPreviewState(st)}
                  className={`py-1 px-2 rounded-lg text-[10px] font-semibold text-left transition-colors ${
                    previewState === st 
                      ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)]' 
                      : 'bg-[var(--input)] text-[var(--text)] hover:bg-[var(--hover)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowPreviewToolbar(prev => !prev)}
          aria-label="Toggle Feed State Preview Toolbar"
          className="h-9 px-3 rounded-full bg-[var(--card)] border border-[var(--card-border)] text-[var(--accent-2)] shadow-xl hover:bg-[var(--hover)] transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>States</span>
        </button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[620px] mx-auto min-h-screen py-0 pb-28 sm:pb-16 select-none border-x border-[#1c1c2b]/60 relative">
      {/* Dynamic Keyframes and Motion Styles */}
      <style>{`
        .post-enter {
          animation: postSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes postSlideUp {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes heartPop {
          0% { transform: scale(1); }
          35% { transform: scale(1.35); }
          65% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }

        @keyframes bookmarkBounce {
          0% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-4px) scale(1.2); }
          75% { transform: translateY(1px) scale(0.95); }
          100% { transform: translateY(0) scale(1); }
        }

        .heart-pop {
          animation: heartPop 0.35s cubic-bezier(0.17, 0.89, 0.32, 1.49);
        }

        .bookmark-bounce {
          animation: bookmarkBounce 0.35s cubic-bezier(0.17, 0.89, 0.32, 1.49);
        }

        @media (hover: hover) {
          .post-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 28px -6px rgba(0, 0, 0, 0.45);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .post-enter,
          .heart-pop,
          .bookmark-bounce,
          .post-card {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Primary Page Heading for Screen Readers and Landmarks */}
      <h1 className="sr-only">Home Feed</h1>

      <div className="px-0 sm:px-3 pt-2 sm:pt-4">
        {/* COMPOSER - Single clean row on phone, themed card on desktop */}
        <div 
          onClick={() => onNavigate('create')}
          className="sm:bg-[var(--card)] sm:border sm:border-[var(--card-border)] sm:rounded-[20px] bg-transparent border-b border-[var(--card-border)] p-4 sm:mb-4 cursor-pointer group select-none transition-all duration-200 hover:border-[var(--accent-2)]/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--input)] border border-[var(--card-border)] overflow-hidden flex items-center justify-center text-xs font-bold text-[var(--accent-2)] shadow-inner flex-shrink-0">
              {user?.avatar_url ? (
                <img src={`/api/media/file/${user.avatar_url}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
              ) : (
                user?.username ? user.username.substring(0, 2).toUpperCase() : 'Me'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[var(--muted)] text-sm font-medium">What's happening?</span>
            </div>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onNavigate('create'); }}
              aria-label="Create a post"
              className="min-h-[40px] px-4 py-2 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-bold rounded-full shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusSquare className="w-4 h-4" aria-hidden="true" />
              <span>Post</span>
            </button>
          </div>
        </div>

        {/* State 4: Pinned Offline Notice Banner */}
        {isOffline && (
          <div className="p-3 bg-[var(--card)] border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs max-w-md mx-auto mb-4 mx-4 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-[11px] text-[var(--text)] truncate">
                <span className="font-semibold text-amber-400">Offline: </span>
                Showing cached feed posts. Likes and comments will sync when reconnected.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => fetchFeed(false)}
              className="px-2.5 py-1 bg-[var(--input)] hover:bg-[var(--hover)] text-[var(--text)] text-[10px] font-bold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Refresh
            </button>
          </div>
        )}

        {/* State 5: Slow Network Notice Banner */}
        {isSlowNetwork && !isOffline && (
          <div className="p-3 bg-[var(--card)] border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs max-w-md mx-auto mb-4 mx-4 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <p className="text-[11px] text-[var(--text)]">
                <span className="font-semibold text-amber-400">Slow Connection: </span>
                Feed is taking longer to load.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setIsLiteMode(prev => !prev)}
              className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              {isLiteMode ? 'Normal View' : 'Lite View'}
            </button>
          </div>
        )}

        {/* Shared Post Filter Notice Banner */}
        {isSinglePostFiltered && (
          <div className="p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl flex items-center justify-between text-xs max-w-md mx-auto mb-4 mx-4">
            <span className="font-semibold text-[var(--text)]">Viewing a shared post</span>
            <button 
              type="button"
              onClick={() => {
                setIsSinglePostFiltered(false);
                window.history.replaceState({}, document.title, window.location.pathname);
                fetchFeed(true);
              }}
              aria-label="View full feed"
              className="px-3 py-1 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-bold rounded-lg transition-colors uppercase tracking-wider text-[10px] cursor-pointer"
            >
              View Full Feed
            </button>
          </div>
        )}

        {/* Main Feed Content Switcher */}
        {effectiveStatus === 'loading' ? (
          renderFeedSkeleton()
        ) : effectiveStatus === 'error' ? (
          renderErrorState()
        ) : effectiveStatus === 'empty' ? (
          renderEmptyState()
        ) : effectiveStatus === 'offline' && posts.length === 0 ? (
          renderOfflineZeroState()
        ) : effectiveStatus === 'slow' && posts.length === 0 ? (
          renderFeedSkeleton()
        ) : posts.length === 0 ? (
          renderEmptyState()
        ) : (
          posts.map((post, index) => {
            const { caption: cleanCaption, room: postRoom } = getCleanCaptionAndRoom(post.caption);
            return (
              <article 
                key={post.id} 
                aria-labelledby={`post-${post.id}-title`}
                className="post-card sm:bg-[var(--card)] sm:border sm:border-[var(--card-border)] sm:rounded-[20px] bg-transparent border-b border-[var(--card-border)] px-4 sm:p-5 py-4 sm:mb-4 sm:shadow-lg sm:shadow-[var(--shadow-card)] transition-all duration-200 relative lazy-content gpu post-enter"
                style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
              >
                {/* Header Line: 40px avatar, name + verified badge, time + visibility, 3-dots menu on right */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button 
                      type="button"
                      onClick={() => onNavigate('profile', post.username)}
                      aria-label={`View ${post.username}'s profile`}
                      className="w-10 h-10 rounded-full bg-[var(--input)] border border-[var(--card-border)] overflow-hidden flex items-center justify-center text-xs font-bold text-[var(--accent-2)] select-none shadow-sm flex-shrink-0 cursor-pointer hover:border-[var(--accent-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
                    >
                      {post.avatar_url ? (
                        <img src={`/api/media/file/${post.avatar_url}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                      ) : (
                        post.username.substring(0, 2).toUpperCase()
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 
                          id={`post-${post.id}-title`}
                          onClick={() => onNavigate('profile', post.username)}
                          className="font-semibold text-[15px] text-[var(--text)] hover:text-[var(--accent-2)] cursor-pointer truncate flex items-center gap-1"
                        >
                          <span>{post.display_name || post.username}</span>
                          {!!post.is_verified && <VerifiedBadge size={15} />}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium mt-0.5">
                        <span>{formatTime(post.created_at)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.is_private ? 'Private' : 'Public'}</span>
                        {postRoom && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[var(--accent-2)] font-semibold">{postRoom}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Header: More (three dots) menu for Delete / Share */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuPostId(prev => prev === post.id ? null : post.id);
                      }}
                      aria-label={`Options for post by ${post.username}`}
                      aria-haspopup="true"
                      aria-expanded={openMenuPostId === post.id}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] cursor-pointer"
                    >
                      <MoreHorizontal className="w-5 h-5 stroke-[1.8]" aria-hidden="true" />
                    </button>

                    {openMenuPostId === post.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-11 z-30 w-44 rounded-xl bg-[var(--card)] border border-[var(--card-border)] shadow-2xl p-1.5 select-none"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuPostId(null);
                            handleShareExternally(post);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--hover)] rounded-lg transition-colors min-h-[38px] cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 text-[var(--accent-2)]" aria-hidden="true" />
                          Share Link
                        </button>
                        
                        {(post.user_id === user?.id || user?.is_admin || user?.is_top_admin) && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuPostId(null);
                              setPostToDelete(post);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] rounded-lg transition-colors min-h-[38px] cursor-pointer"
                          >
                            <Trash className="w-4 h-4" aria-hidden="true" />
                            Delete Post
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Media Image or Video: full width on phone, 20px radius on desktop, max-height 560px */}
                {post.media && post.media[0] && (
                  <div className="relative w-full -mx-4 sm:mx-0 sm:w-full max-h-[560px] overflow-hidden sm:rounded-[20px] bg-[var(--card)] flex items-center justify-center my-2 sm:border sm:border-[var(--card-border)]" style={{ width: 'calc(100% + 2rem)', marginInline: '-1rem' }}>
                    {post.media[0].media_type && post.media[0].media_type.startsWith('video/') ? (
                      <video 
                        src={`/api/media/file/${post.media[0].r2_key}`} 
                        controls 
                        className="relative z-10 w-full h-auto max-h-[560px] object-contain select-none"
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <>
                        <img 
                          src={`/api/media/file/${post.media[0].r2_key}`} 
                          alt="" 
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover scale-125 select-none pointer-events-none post-backdrop"
                          style={{ filter: 'blur(28px) brightness(var(--img-dim)) saturate(1.3)' }}
                        />
                        <img 
                          src={`/api/media/file/${post.media[0].r2_key}`} 
                          alt={cleanCaption ? `Photo: ${cleanCaption}` : `Photo shared by ${post.username}`} 
                          className="relative z-10 w-full h-auto max-h-[560px] object-contain select-none cursor-pointer"
                          loading="lazy"
                          onDoubleClick={() => handleLike(post.id, post.is_liked)}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* Action Row: Like with count, Comment with count, Share on left; Bookmark on right */}
                <div className="flex items-center justify-between text-[var(--muted)] pt-1.5 mt-1">
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Like with Heart Pop Animation */}
                    <button 
                      type="button"
                      onClick={() => handleLike(post.id, post.is_liked)}
                      className={`min-w-[40px] min-h-[40px] flex items-center gap-1.5 transition-colors p-2 rounded-full hover:bg-[color-mix(in_srgb,var(--like)_12%,transparent)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--like)] cursor-pointer ${
                        post.is_liked ? 'text-[var(--like)]' : 'text-[var(--muted)] hover:text-[var(--like)]'
                      }`}
                      aria-label={post.is_liked ? `Unlike post, ${post.likes_count} likes` : `Like post, ${post.likes_count} likes`}
                      aria-pressed={post.is_liked}
                    >
                      <Heart className={`w-5 h-5 stroke-[1.8] transition-transform ${post.is_liked ? 'fill-[var(--like)] text-[var(--like)] heart-pop' : ''}`} aria-hidden="true" />
                      <span className="text-xs font-semibold">{post.likes_count}</span>
                    </button>

                    {/* Comment */}
                    <button 
                      type="button"
                      onClick={() => handleOpenComments(post.id)}
                      className="min-w-[40px] min-h-[40px] flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--accent-2)] transition-colors p-2 rounded-full hover:bg-[var(--hover)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] cursor-pointer"
                      aria-label={`View comments, ${post.comments_count} comments`}
                    >
                      <MessageCircle className="w-5 h-5 stroke-[1.8]" aria-hidden="true" />
                      <span className="text-xs font-semibold">{post.comments_count}</span>
                    </button>

                    {/* Share */}
                    <button 
                      type="button"
                      onClick={() => openShareModal(post)}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--accent-2)] transition-colors p-2 rounded-full hover:bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] cursor-pointer"
                      aria-label="Share post"
                    >
                      <Share2 className="w-5 h-5 stroke-[1.8]" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Bookmark with Bounce Animation on right */}
                  <div>
                    <button 
                      type="button"
                      onClick={() => handleToggleSave(post.id)}
                      className={`min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors p-2 rounded-full hover:bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--gold)] cursor-pointer ${
                        savedPostIds.includes(post.id) ? 'text-[var(--gold)]' : 'text-[var(--muted)] hover:text-[var(--gold)]'
                      }`}
                      aria-label={savedPostIds.includes(post.id) ? "Remove bookmark" : "Bookmark post"}
                      aria-pressed={savedPostIds.includes(post.id)}
                    >
                      <Bookmark className={`w-5 h-5 stroke-[1.8] ${savedPostIds.includes(post.id) ? 'fill-[var(--gold)] text-[var(--gold)] bookmark-bounce' : ''}`} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Caption below: Bold username then text, hashtags as var(--accent-2) links */}
                {cleanCaption && (
                  <div className="mt-2 text-[14px] text-[var(--text)] leading-relaxed">
                    <span 
                      onClick={() => onNavigate('profile', post.username)}
                      className="font-bold text-[var(--text)] hover:text-[var(--accent-2)] mr-2 cursor-pointer transition-colors"
                    >
                      {post.username}
                    </span>
                    <span>
                      {cleanCaption.split(/(#[a-zA-Z0-9_]+)/g).map((part, i) => {
                        if (part.startsWith('#')) {
                          return (
                            <span key={i} className="text-[var(--accent-2)] font-medium cursor-pointer hover:underline">
                              {part}
                            </span>
                          );
                        }
                        return part;
                      })}
                    </span>
                  </div>
                )}

                {/* State 9: Inline Comment Box with Field Validation */}
                <div className="mt-3">
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const input = form.querySelector('input') as HTMLInputElement;
                      if (!input || !token) return;
                      const text = input.value.trim();
                      if (!text) {
                        setCommentValidationErrors(prev => ({ ...prev, [post.id]: 'Please enter a comment before posting' }));
                        return;
                      }
                      if (text.length > 500) {
                        setCommentValidationErrors(prev => ({ ...prev, [post.id]: 'Comment cannot exceed 500 characters' }));
                        return;
                      }
                      setCommentValidationErrors(prev => {
                        const next = { ...prev };
                        delete next[post.id];
                        return next;
                      });
                      input.value = '';
                      try {
                        const res = await fetch(`/api/posts/${post.id}/comment`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ body: text })
                        });
                        if (res.status === 401) {
                          setStatus('session_expired');
                          return;
                        }
                        if (res.ok) {
                          const data = await res.json();
                          if (activePostComments === post.id) {
                            setComments(prev => [...prev, data.comment]);
                          }
                          setPosts(prev => prev.map(p => {
                            if (p.id === post.id) {
                              return { ...p, comments_count: p.comments_count + 1 };
                            }
                            return p;
                          }));
                          toast.success('Comment posted');
                        }
                      } catch (err) {
                        console.error(err);
                        toast.error('Failed to post comment. Check connection.');
                      }
                    }}
                    className="relative flex items-center"
                  >
                    <label htmlFor={`inline-comment-${post.id}`} className="sr-only">
                      Add a comment to post by {post.username}
                    </label>
                    <input
                      id={`inline-comment-${post.id}`}
                      type="text"
                      placeholder="Add a comment..."
                      onChange={() => {
                        if (commentValidationErrors[post.id]) {
                          setCommentValidationErrors(prev => {
                            const next = { ...prev };
                            delete next[post.id];
                            return next;
                          });
                        }
                      }}
                      className="w-full bg-[var(--input)] border border-[var(--line)] focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/20 rounded-full pl-4 pr-16 py-2.5 text-[16px] sm:text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all"
                    />
                    <button 
                      type="submit" 
                      aria-label={`Post comment to ${post.username}'s post`}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center min-h-[32px] focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] cursor-pointer"
                    >
                      Post
                    </button>
                  </form>
                  {commentValidationErrors[post.id] && (
                    <p className="text-[11px] text-[var(--danger)] font-medium mt-1 pl-4 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{commentValidationErrors[post.id]}</span>
                    </p>
                  )}
                </div>

              </article>
            );
            /* THEME END */
          })
        )}

        {/* End of Feed Catch-up */}
        {posts.length > 0 && (
          <div className="py-8 text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--line)] text-xs font-semibold text-[var(--muted)] shadow-sm">
              <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>You're all caught up!</span>
            </div>
          </div>
        )}
      </div>
      {/* UI UPDATE END */}

      {/* COMMENTS DRAWER / MODAL */}
      {/* THEME START */}
      {activePostComments && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="comments-drawer-title"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end sm:flex-row sm:justify-end sm:items-center"
        >
          <div className="glass-card w-full h-[85vh] h-[85dvh] sm:h-full sm:max-w-md rounded-t-3xl sm:rounded-t-none border-t sm:border-t-0 sm:border-l border-[var(--line)] flex flex-col bg-[var(--card)] shadow-2xl animate-slide-up sm:animate-slide-left overflow-hidden">
            
            {/* Mobile Drag Indicator / Handle Bar */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 sm:hidden flex-shrink-0" />

            {/* Drawer Header */}
            <div className="p-4 border-b border-[var(--line)] flex items-center justify-between">
              <h3 id="comments-drawer-title" className="font-extrabold text-sm text-[var(--text)] uppercase tracking-wider pl-1">Comments</h3>
              <button 
                type="button"
                onClick={() => setActivePostComments(null)}
                aria-label="Close comments dialog"
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1.5 rounded-full hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {loadingComments ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-2)]" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10 text-[var(--muted)] text-xs font-medium">
                  No comments yet.
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div 
                      onClick={() => {
                        setActivePostComments(null);
                        onNavigate('profile', comment.username);
                      }}
                      className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex-shrink-0 cursor-pointer overflow-hidden flex items-center justify-center text-[10px] font-bold text-brand-400 select-none shadow"
                    >
                      {comment.avatar_url ? (
                        <img src={`/api/media/file/${comment.avatar_url}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                      ) : (
                        comment.username.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="bg-[var(--input)] border border-[var(--line)] rounded-2xl p-3 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span 
                          onClick={() => {
                            setActivePostComments(null);
                            onNavigate('profile', comment.username);
                          }}
                          className="text-xs font-extrabold text-[var(--text)] hover:text-[var(--accent-2)] cursor-pointer flex items-center inline-flex gap-1"
                        >
                          {comment.display_name || comment.username}
                          {!!comment.is_verified && <VerifiedBadge />}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] font-bold">{formatTime(comment.created_at)}</span>
                      </div>
                      <p className="text-xs text-[var(--text)] leading-relaxed">{comment.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleAddComment} className="p-4 pb-8 sm:pb-4 border-t border-[var(--line)] flex flex-col gap-1.5 bg-[var(--card)]">
              <div className="flex gap-2">
                <label htmlFor="comments-drawer-input" className="sr-only">
                  Add a comment
                </label>
                <input
                  id="comments-drawer-input"
                  type="text"
                  placeholder="Add a comment..."
                  value={newCommentText}
                  onChange={(e) => {
                    setNewCommentText(e.target.value);
                    if (drawerCommentError) setDrawerCommentError(null);
                  }}
                  className="flex-1 bg-[var(--input)] border border-[var(--line)] rounded-xl px-4 py-2.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/20 transition-colors"
                />
                <button 
                  type="submit" 
                  disabled={!newCommentText.trim()}
                  aria-label="Send comment"
                  className="p-2.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center shadow-md active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] cursor-pointer"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              {drawerCommentError && (
                <p className="text-[11px] text-[var(--danger)] font-medium pl-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{drawerCommentError}</span>
                </p>
              )}
            </form>

          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {sharingPost && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="share-modal-title"
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="glass-card w-full max-w-sm border border-[var(--line)] rounded-3xl flex flex-col bg-[var(--card)] shadow-2xl overflow-hidden animate-zoom-in max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--line)] flex items-center justify-between">
              <h3 id="share-modal-title" className="font-extrabold text-sm text-[var(--text)] uppercase tracking-wider pl-1">Share Post</h3>
              <button 
                type="button"
                onClick={() => setSharingPost(null)}
                aria-label="Close share dialog"
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1.5 rounded-full hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Conversation Search Bar */}
            <div className="p-4 border-b border-[var(--line)] bg-[var(--input)] flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--muted)]" aria-hidden="true" />
              <label htmlFor="share-search-chats-input" className="sr-only">
                Search chats
              </label>
              <input
                id="share-search-chats-input"
                type="text"
                placeholder="Search chats..."
                value={searchConvoQuery}
                onChange={(e) => setSearchConvoQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none"
              />
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin min-h-[160px] max-h-[300px]">
              {loadingSharingConvos ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-2)]" />
                </div>
              ) : sharingConversations.length === 0 ? (
                <div className="text-center py-8 text-[var(--muted)] text-xs font-semibold">
                  No chats found.
                </div>
              ) : (() => {
                const filtered = sharingConversations.filter(convo => {
                  if (convo.is_group) {
                    return (convo.group_name || '').toLowerCase().includes(searchConvoQuery.toLowerCase());
                  }
                  const partner = convo.members.find((m: any) => m.id !== user?.id) || convo.members[0];
                  const pName = partner?.display_name || partner?.username || '';
                  return pName.toLowerCase().includes(searchConvoQuery.toLowerCase());
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-[var(--muted)] space-y-2">
                      <p className="text-xs font-semibold text-[var(--text)]">No chats matching "{searchConvoQuery}"</p>
                      <p className="text-[11px] text-[var(--muted)]">Check for typos or start a direct conversation in Messages.</p>
                      <button
                        type="button"
                        onClick={() => setSearchConvoQuery('')}
                        className="px-3 py-1 bg-[var(--input)] text-[var(--accent-2)] rounded-lg text-[10px] font-bold border border-[var(--line)] cursor-pointer"
                      >
                        Clear Search
                      </button>
                    </div>
                  );
                }

                return filtered.map((convo) => {
                  const partner = convo.is_group ? null : (convo.members.find((m: any) => m.id !== user?.id) || convo.members[0]);
                  const convoTitle = convo.is_group ? (convo.group_name || 'Group Chat') : (partner?.display_name || partner?.username || 'Chat');
                  const avatarUrl = convo.is_group ? null : partner?.avatar_url;
                  const isSent = !!sentStatus[convo.id];

                  return (
                    <div key={convo.id} className="flex items-center justify-between p-2 rounded-2xl bg-[var(--input)] border border-[var(--line)] hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 select-none overflow-hidden flex-shrink-0">
                          {avatarUrl ? (
                            <img src={`/api/media/file/${avatarUrl}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                          ) : (
                            convoTitle.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[var(--text)] truncate block">{convoTitle}</span>
                          {!convo.is_group && partner && (
                            <span className="text-[10px] text-[var(--muted)] truncate block">@{partner.username}</span>
                          )}
                          {convo.is_group && (
                            <span className="text-[9px] text-[var(--accent-2)] font-extrabold uppercase tracking-wider block">Group</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendToConvo(convo.id, sharingPost)}
                        disabled={isSent}
                        aria-label={isSent ? `Already sent to ${convoTitle}` : `Send post to ${convoTitle}`}
                        className={`py-1.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] ${
                          isSent 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)]'
                        }`}
                      >
                        {isSent ? (
                          <>
                            <Check className="w-3 h-3" aria-hidden="true" />
                            Sent
                          </>
                        ) : (
                          'Send'
                        )}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>

            {/* External Share Option */}
            <div className="p-4 border-t border-[var(--line)] bg-[var(--card)]">
              <button
                type="button"
                onClick={() => {
                  handleShareExternally(sharingPost);
                  setSharingPost(null);
                }}
                aria-label="Share post externally"
                className="w-full py-2.5 bg-[var(--input)] border border-[var(--line)] hover:bg-[var(--hover)] text-[var(--text)] text-xs font-bold rounded-2xl transition-colors shadow flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
              >
                <Share2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                Share Externally
              </button>
            </div>

          </div>
        </div>
      )}
      {/* THEME END */}

      {/* State 10: In-App Delete Post Dialog */}
      {renderDeleteDialog()}

      {/* State 8: Session Expired Modal */}
      {effectiveStatus === 'session_expired' && renderSessionExpiredModal()}

      {/* State Preview Toolbar */}
      {renderStatePreviewToolbar()}

    </div>
  );
};
