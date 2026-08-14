import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Search
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
  
  // Feed posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSinglePostFiltered, setIsSinglePostFiltered] = useState<boolean>(false);
  
  // Comments drawer state
  const [activePostComments, setActivePostComments] = useState<string | null>(null); // postId
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [loadingComments, setLoadingComments] = useState<boolean>(false);

  // Fetch feed posts
  const fetchFeed = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/posts/feed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
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
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete post');
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
        alert('Link copied to clipboard!');
      } catch {
        alert('Failed to copy link.');
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
            handleOpenComments(targetPostId);
          } else {
            fetchFeed();
          }
        })
        .catch(err => {
          console.error(err);
          fetchFeed();
        })
        .finally(() => {
          setLoading(false);
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
    <div className="w-full max-w-2xl mx-auto self-center py-4 pb-20 select-none animate-fade-in divide-y divide-white/[0.04] border-x border-white/[0.04]">
      
      {/* Twitter-style Composer */}
      <div 
        onClick={() => onNavigate('create')}
        className="px-4 pb-4 flex gap-3 cursor-pointer group select-none"
      >
        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center text-xs font-bold text-brand-400 shadow flex-shrink-0">
          Me
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <div className="text-slate-500 text-sm py-2 font-medium">What's happening?</div>
          <div className="flex justify-between items-center border-t border-white/[0.02] pt-3">
            <div className="flex gap-2 text-brand-400">
              <PlusSquare className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onNavigate('create'); }}
              className="py-1.5 px-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-full shadow transition-all"
            >
              Post
            </button>
          </div>
        </div>
      </div>

      {/* Shared Post Filter Notice Banner */}
      {isSinglePostFiltered && (
        <div className="p-3 bg-brand-950/20 border border-brand-900/30 rounded-2xl flex items-center justify-between text-xs max-w-md mx-auto mb-6">
          <span className="font-bold text-slate-350">Viewing a shared post</span>
          <button 
            onClick={() => {
              setIsSinglePostFiltered(false);
              window.history.replaceState({}, document.title, window.location.pathname);
              setLoading(true);
              fetchFeed();
            }}
            className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white font-extrabold rounded-lg transition-colors uppercase tracking-wider text-[10px]"
          >
            View Full Feed
          </button>
        </div>
      )}

      {/* Feed Posts */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          <p className="text-xs">Loading feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-4">
          <Smile className="w-12 h-12 text-slate-700" />
          <h3 className="font-extrabold text-sm text-slate-200">Your Feed is Empty</h3>
          <p className="text-xs text-slate-555 max-w-xs leading-relaxed">Follow creators or upload your first photo to begin!</p>
          <button 
            onClick={() => onNavigate('create')}
            className="mt-2 py-2 px-5 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-bold rounded-xl shadow transition-all uppercase tracking-wider"
          >
            Upload Photo
          </button>
        </div>
      ) : (
        posts.map((post) => {
          const { caption: cleanCaption, room: postRoom } = getCleanCaptionAndRoom(post.caption);
          return (
            <article 
              key={post.id} 
              className="p-4 hover:bg-white/[0.01] transition-colors flex gap-3"
            >
              {/* Left Side: Avatar */}
              <div 
                onClick={() => onNavigate('profile', post.username)}
                className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center text-xs font-bold text-brand-400 select-none shadow flex-shrink-0 cursor-pointer"
              >
                {post.avatar_url ? (
                  <img src={`/api/media/file/${post.avatar_url}`} alt={post.username} className="w-full h-full object-cover" />
                ) : (
                  post.username.substring(0, 2).toUpperCase()
                )}
              </div>

              {/* Right Side: Content */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                
                {/* Header Line */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span 
                      onClick={() => onNavigate('profile', post.username)}
                      className="font-extrabold text-[13px] text-white hover:text-brand-400 cursor-pointer flex items-center"
                    >
                      {post.display_name || post.username}
                      {!!post.is_verified && <VerifiedBadge />}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">@{post.username}</span>
                    <span className="text-slate-650 text-[11px] font-bold">·</span>
                    <span className="text-[11px] text-slate-500 font-semibold">{formatTime(post.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {postRoom && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400">
                        {postRoom}
                      </span>
                    )}
                    {(post.user_id === user?.id || user?.is_admin || user?.is_top_admin) && (
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="text-slate-500 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-all flex items-center justify-center cursor-pointer"
                        title="Delete Post"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Caption / Text */}
                {cleanCaption && (
                  <p className="text-[13px] text-slate-200 leading-normal whitespace-pre-wrap">
                    {cleanCaption}
                  </p>
                )}

                {/* Media Image */}
                {post.media && post.media[0] && (
                  <div 
                    className="mt-2 rounded-2xl overflow-hidden border border-white/[0.06] bg-[#020202] max-h-[380px] relative flex items-center justify-center shadow-md cursor-pointer"
                    onDoubleClick={() => handleLike(post.id, post.is_liked)}
                  >
                    <img 
                      src={`/api/media/file/${post.media[0].r2_key}`} 
                      alt="Post media" 
                      className="w-full h-full object-contain select-none max-h-[380px]"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Action Buttons Panel */}
                <div className="flex items-center justify-between text-slate-500 max-w-md mt-2">
                  <button 
                    onClick={() => handleOpenComments(post.id)}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-brand-400 transition-colors p-1.5 rounded-full hover:bg-brand-500/5 group"
                  >
                    <MessageCircle className="w-4.5 h-4.5" />
                    <span className="text-[11px] font-bold">{post.comments_count}</span>
                  </button>

                  <button 
                    onClick={() => handleLike(post.id, post.is_liked)}
                    className={`flex items-center gap-1.5 transition-colors p-1.5 rounded-full hover:bg-red-500/5 group ${
                      post.is_liked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-4.5 h-4.5 transition-transform group-active:scale-125 ${post.is_liked ? 'fill-red-500' : ''}`} />
                    <span className="text-[11px] font-bold">{post.likes_count}</span>
                  </button>

                  <button 
                    onClick={() => openShareModal(post)}
                    className="text-slate-500 hover:text-emerald-400 transition-colors p-1.5 rounded-full hover:bg-emerald-500/5"
                    title="Share Post"
                  >
                    <Share2 className="w-4.5 h-4.5" />
                  </button>

                  <button 
                    onClick={() => handleToggleSave(post.id)}
                    className={`transition-colors p-1.5 rounded-full hover:bg-amber-500/5 ${
                      savedPostIds.includes(post.id) ? 'text-amber-500' : 'text-slate-550 hover:text-amber-400'
                    }`}
                    title="Save Post"
                  >
                    <Bookmark className={`w-4.5 h-4.5 ${savedPostIds.includes(post.id) ? 'fill-amber-500' : ''}`} />
                  </button>
                </div>

                {/* Inline Comment Input */}
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
                  className="mt-3 flex gap-2 border-t border-white/[0.02] pt-3"
                >
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 bg-slate-950/40 border border-white/[0.04] focus:border-brand-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-colors"
                  />
                  <button 
                    type="submit" 
                    className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow"
                  >
                    Post
                  </button>
                </form>

              </div>
            </article>
          );
        })
      )}

      {/* COMMENTS DRAWER / MODAL */}
      {activePostComments && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end sm:flex-row sm:justify-end sm:items-center">
          <div className="glass-card w-full h-[85vh] h-[85dvh] sm:h-full sm:max-w-md rounded-t-3xl sm:rounded-t-none border-t sm:border-t-0 sm:border-l border-white/[0.04] flex flex-col bg-[#060608] sm:bg-[#060608]/75 shadow-2xl animate-slide-up sm:animate-slide-left overflow-hidden">
            
            {/* Mobile Drag Indicator / Handle Bar */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 sm:hidden flex-shrink-0" />

            {/* Drawer Header */}
            <div className="p-4 border-b border-white/[0.03] flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider pl-1">Comments</h3>
              <button 
                onClick={() => setActivePostComments(null)}
                className="text-slate-500 hover:text-slate-200 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {loadingComments ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10 text-slate-600 text-xs font-medium">
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
                      className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex-shrink-0 cursor-pointer overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-400 select-none shadow"
                    >
                      {comment.avatar_url ? (
                        <img src={`/api/media/file/${comment.avatar_url}`} alt={comment.username} className="w-full h-full object-cover" />
                      ) : (
                        comment.username.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="bg-slate-950/40 border border-white/[0.02] rounded-2xl p-3 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span 
                          onClick={() => {
                            setActivePostComments(null);
                            onNavigate('profile', comment.username);
                          }}
                          className="text-xs font-extrabold text-slate-200 hover:text-brand-400 cursor-pointer flex items-center inline-flex"
                        >
                          {comment.display_name || comment.username}
                          {!!comment.is_verified && <VerifiedBadge />}
                        </span>
                        <span className="text-[9px] text-slate-655 font-bold">{formatTime(comment.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-350 leading-relaxed">{comment.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleAddComment} className="p-4 pb-8 sm:pb-4 border-t border-white/[0.03] flex gap-2 bg-slate-950/20">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-brand-500 transition-colors"
              />
              <button 
                type="submit" 
                disabled={!newCommentText.trim()}
                className="p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center shadow"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {sharingPost && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm border border-white/[0.04] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-zoom-in max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-white/[0.03] flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider pl-1">Share Post</h3>
              <button 
                onClick={() => setSharingPost(null)}
                className="text-slate-500 hover:text-slate-200 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Search Bar */}
            <div className="p-4 border-b border-white/[0.03] bg-slate-950/20 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchConvoQuery}
                onChange={(e) => setSearchConvoQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-700 outline-none"
              />
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin min-h-[160px] max-h-[300px]">
              {loadingSharingConvos ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                </div>
              ) : sharingConversations.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-xs font-semibold">
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
                    <div className="text-center py-8 text-slate-655 text-xs font-semibold">
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
                    <div key={convo.id} className="flex items-center justify-between p-2 rounded-2xl bg-white/[0.01] border border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 select-none overflow-hidden">
                          {avatarUrl ? (
                            <img src={`/api/media/file/${avatarUrl}`} alt={convoTitle} className="w-full h-full object-cover" />
                          ) : (
                            convoTitle.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white truncate block">{convoTitle}</span>
                          {!convo.is_group && partner && (
                            <span className="text-[9px] text-slate-500 truncate block">@{partner.username}</span>
                          )}
                          {convo.is_group && (
                            <span className="text-[9px] text-brand-400 font-extrabold uppercase tracking-wider block">Group</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendToConvo(convo.id, sharingPost)}
                        disabled={isSent}
                        className={`py-1.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow active:scale-95 ${
                          isSent 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-brand-600 hover:bg-brand-500 text-white'
                        }`}
                      >
                        {isSent ? (
                          <>
                            <Check className="w-3 h-3" />
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
            <div className="p-4 border-t border-white/[0.03] bg-slate-950/40">
              <button
                onClick={() => {
                  handleShareExternally(sharingPost);
                  setSharingPost(null);
                }}
                className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-slate-200 text-xs font-bold rounded-2xl transition-colors shadow flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                Share Externally
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
