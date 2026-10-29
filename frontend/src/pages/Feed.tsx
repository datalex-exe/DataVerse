import React, { useState, useEffect } from 'react';
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
  /* UI UPDATE START - Added MoreHorizontal icon for post options */
  MoreHorizontal
  /* UI UPDATE END */
} from 'lucide-react';

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
}

export const Feed: React.FC<FeedProps> = ({ onNavigate, onToggleBottomNav }) => {
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
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('dv_cached_feed');
    } catch {
      return true;
    }
  });
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
  /* UI UPDATE END */

  // Fetch feed posts in background
  const fetchFeed = async (showLoading = false) => {
    if (!token) return;
    if (showLoading && posts.length === 0) setLoading(true);
    try {
      const res = await fetch('/api/posts/feed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const incoming = data.posts || [];
        setPosts(incoming);
        try {
          sessionStorage.setItem('dv_cached_feed', JSON.stringify(incoming.slice(0, 25)));
        } catch {}
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
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
    const targetPostId = urlParams.get('post');
    if (targetPostId && token) {
      setLoading(true);
      fetch(`/api/posts/${targetPostId}`, {
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
            setLoading(false);
          } else {
            fetchFeed();
          }
        })
        .catch(err => {
          console.error(err);
          fetchFeed();
        });
    } else {
      fetchFeed();
    }
  }, [token]);

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
    if (!newCommentText.trim() || !activePostComments || !token) return;

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

      if (res.ok) {
        const data = await res.json();
        setComments(prev => [...prev, data.comment]);
        setPosts(prev => prev.map(p => {
          if (p.id === activePostComments) {
            return { ...p, comments_count: p.comments_count + 1 };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error(err);
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

  return (
    <div className="w-full max-w-[620px] mx-auto min-h-screen py-0 pb-28 sm:pb-16 select-none border-x border-[#1c1c2b]/60 relative">
      {/* UI UPDATE START - Feed column ~620px wide with subtle borders and spacing */}
      
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

        {/* Shared Post Filter Notice Banner */}
        {isSinglePostFiltered && (
          <div className="p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl flex items-center justify-between text-xs max-w-md mx-auto mb-4 mx-4">
            <span className="font-semibold text-[var(--text)]">Viewing a shared post</span>
            <button 
              type="button"
              onClick={() => {
                setIsSinglePostFiltered(false);
                window.history.replaceState({}, document.title, window.location.pathname);
                setLoading(true);
                fetchFeed();
              }}
              aria-label="View full feed"
              className="px-3 py-1 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-bold rounded-lg transition-colors uppercase tracking-wider text-[10px] cursor-pointer"
            >
              View Full Feed
            </button>
          </div>
        )}

        {/* Feed Posts */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)] gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-2)]" />
            <p className="text-xs">Loading feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center gap-4">
            <Smile className="w-12 h-12 text-[var(--muted)]" aria-hidden="true" />
            <h2 className="font-extrabold text-sm text-[var(--text)]">Your Feed is Empty</h2>
            <p className="text-xs text-[var(--muted)] max-w-xs leading-relaxed">Follow creators or upload your first photo to begin!</p>
            <button 
              type="button"
              onClick={() => onNavigate('create')}
              aria-label="Upload photo to start feed"
              className="mt-2 py-2.5 px-5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-bold rounded-full shadow-md transition-all uppercase tracking-wider cursor-pointer"
            >
              Upload Photo
            </button>
          </div>
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
                              handleDeletePost(post.id);
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

                {/* Comment Box: Pill input with Post button inside */}
                {/* THEME START */}
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.querySelector('input') as HTMLInputElement;
                    const text = input.value.trim();
                    if (!text || !token) return;
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
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="mt-3 relative flex items-center"
                >
                  <label htmlFor={`inline-comment-${post.id}`} className="sr-only">
                    Add a comment to post by {post.username}
                  </label>
                  <input
                    id={`inline-comment-${post.id}`}
                    type="text"
                    placeholder="Add a comment..."
                    className="w-full bg-[var(--input)] border border-[var(--line)] focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/20 rounded-full pl-4 pr-16 py-2.5 text-[16px] sm:text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all"
                  />
                  <button 
                    type="submit" 
                    aria-label={`Post comment to ${post.username}'s post`}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center min-h-[32px] focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
                  >
                    Post
                  </button>
                </form>

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
            <form onSubmit={handleAddComment} className="p-4 pb-8 sm:pb-4 border-t border-[var(--line)] flex gap-2 bg-[var(--card)]">
              <label htmlFor="comments-drawer-input" className="sr-only">
                Add a comment
              </label>
              <input
                id="comments-drawer-input"
                type="text"
                placeholder="Add a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 bg-[var(--input)] border border-[var(--line)] rounded-xl px-4 py-2.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/20 transition-colors"
              />
              <button 
                type="submit" 
                disabled={!newCommentText.trim()}
                aria-label="Send comment"
                className="p-2.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center shadow-md active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
              </button>
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
                    <div className="text-center py-8 text-[var(--muted)] text-xs font-semibold">
                      No matching chats.
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

    </div>
  );
};
