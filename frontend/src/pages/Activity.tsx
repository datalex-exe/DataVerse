import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  ArrowRight, 
  Loader2,
  Sparkles,
  Shield,
  AlertTriangle
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'welcome' | 'follow' | 'follow_request' | 'follow_accept' | 'like' | 'comment' | 'verification_request' | 'restriction';
  post_id: string | null;
  body: string | null;
  created_at: number;
  is_read: boolean;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  notifier_id: string | null;
}

interface ActivityProps {
  onNavigate: (view: string, targetUsername?: string) => void;
}

export const Activity: React.FC<ActivityProps> = ({ onNavigate }) => {
  const { token } = useAuth();
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch real notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mark all unread notifications as read
  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/users/notifications/read', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Optimistically mark all as read in UI
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Mark as read when tab is opened
  useEffect(() => {
    if (!loading && notifications.some(n => !n.is_read)) {
      // Small delay so user sees the dots first, then they fade
      const timer = setTimeout(markAllRead, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [loading]);

  // Clean time formatting
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 60) return `${mins <= 0 ? 'now' : mins + 'm'}`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'welcome': return <Sparkles className="w-3.5 h-3.5 text-brand-400" />;
      case 'follow': return <UserPlus className="w-3.5 h-3.5 text-indigo-400" />;
      case 'follow_request': return <UserPlus className="w-3.5 h-3.5 text-yellow-500" />;
      case 'follow_accept': return <UserPlus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'like': return <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle className="w-3.5 h-3.5 text-sky-400" />;
      case 'verification_request': return <Shield className="w-3.5 h-3.5 text-brand-400" />;
      case 'restriction': return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
      default: return <ArrowRight className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const renderItem = (item: NotificationItem) => {
    const isWelcome = item.type === 'welcome';
    const notifierName = item.display_name || item.username || 'System';
    const isUnread = !item.is_read;

    return (
      <div 
        key={item.id} 
        className={`flex items-start justify-between py-4 border-b border-white/[0.02] last:border-0 px-3 -mx-3 rounded-2xl transition-all select-none ${
          isUnread ? 'bg-blue-950/20 hover:bg-blue-950/30' : 'hover:bg-white/[0.01]'
        }`}
      >
        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
          
          {/* Avatar / Icon Container */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-350 overflow-hidden shadow">
              {!item.notifier_id ? (
                <img src="/logo.png?v=2" alt="System Logo" className="w-full h-full object-cover" />
              ) : isWelcome ? (
                <div className="w-full h-full bg-brand-600/10 flex items-center justify-center text-brand-400">A</div>
              ) : item.avatar_url ? (
                <img src={`/api/media/file/${item.avatar_url}`} alt={notifierName} className="w-full h-full object-cover" />
              ) : (
                notifierName.substring(0, 2).toUpperCase()
              )}
            </div>
            
            <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center shadow">
              {getIcon(item.type)}
            </div>
          </div>

          {/* Details Label */}
          <div className="min-w-0 flex-1 pt-0.5">
            {isWelcome ? (
              <p className="text-xs text-slate-300 leading-relaxed break-words">
                {item.body ? (
                  <span>
                    {item.notifier_id ? (
                      <span 
                        onClick={() => item.username && onNavigate('profile', item.username)}
                        className="font-extrabold text-white mr-1.5 hover:text-brand-400 cursor-pointer"
                      >
                        {notifierName}:
                      </span>
                    ) : (
                      <span className="font-extrabold text-brand-400 mr-1.5">
                        System:
                      </span>
                    )}
                    {item.body}
                  </span>
                ) : (
                  <span>
                    <span className="font-extrabold text-white">Welcome to DataVerse!</span> Explore your feed, share reels, and connect with other creators.
                  </span>
                )}
              </p>
            ) : item.type === 'restriction' ? (
              <p className="text-xs text-slate-300 leading-relaxed break-words">
                {item.notifier_id ? (
                  <span>
                    <span 
                      onClick={() => item.username && onNavigate('profile', item.username)}
                      className="font-extrabold text-white mr-1.5 hover:text-brand-400 cursor-pointer"
                    >
                      {notifierName}
                    </span>
                    restricted your chat access for {item.body?.replace("You can't chat for ", "")}
                  </span>
                ) : (
                  <span>
                    <span className="font-extrabold text-red-500 mr-1.5">System Alert:</span>
                    {item.body}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed break-words">
                <span 
                  onClick={() => item.username && onNavigate('profile', item.username)}
                  className="font-extrabold text-white mr-1.5 hover:text-brand-400 cursor-pointer"
                >
                  {notifierName}
                </span>
                {item.type === 'follow' && 'started following you'}
                {item.type === 'follow_request' && 'requested to follow you'}
                {item.type === 'follow_accept' && 'accepted your request'}
                {item.type === 'like' && 'liked your post'}
                {item.type === 'comment' && `commented: "${item.body}"`}
                {item.type === 'verification_request' && 'submitted a verification request'}
              </p>
            )}
            <span className="text-[10px] text-slate-655 font-bold block mt-1">{formatTime(item.created_at)}</span>
          </div>

        </div>

        {/* Right side: unread dot + optional profile button */}
        <div className="flex flex-col items-end justify-center gap-1.5 ml-3 flex-shrink-0 self-center">
          {/* Dark blue unread indicator dot */}
          {isUnread && item.type !== 'follow_request' && (
            <span className="w-2 h-2 rounded-full bg-blue-600 shadow shadow-blue-600/50 flex-shrink-0 animate-pulse" />
          )}

          {item.type === 'follow_request' ? (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/users/follow-requests/${item.id}/accept`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, type: 'follow', is_read: true } : n));
                    } else {
                      alert('Failed to accept follow request');
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="py-1 px-2.5 bg-brand-600 hover:bg-brand-500 text-white text-[9px] font-black rounded-lg transition-all uppercase tracking-wider shadow shadow-brand-600/20"
              >
                Accept
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/users/follow-requests/${item.id}/reject`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                      setNotifications(prev => prev.filter(n => n.id !== item.id));
                    } else {
                      alert('Failed to reject follow request');
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider"
              >
                Reject
              </button>
            </div>
          ) : (
            <>
              {/* Profile link button */}
              {!isWelcome && item.username && (
                <button
                  onClick={() => {
                    if (item.type === 'verification_request') {
                      onNavigate('admin');
                    } else {
                      onNavigate('profile', item.username!);
                    }
                  }}
                  className="py-1 px-3 bg-slate-955 border border-slate-900 text-slate-400 hover:text-white text-[9px] font-black rounded-lg transition-all uppercase tracking-wider"
                >
                  {item.type === 'verification_request' ? 'Admin' : 'Profile'}
                </button>
              )}
            </>
          )}
        </div>

      </div>
    );
  };

  // Categorize notifications based on time (New within 24h, Earlier older)
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const newActivities = notifications.filter(n => now - n.created_at < oneDay);
  const earlierActivities = notifications.filter(n => now - n.created_at >= oneDay);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-32 text-slate-500 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        <p className="text-xs">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto self-center px-4 py-8 animate-fade-in space-y-10">

      {/* Header with unread count badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Notifications</h2>
          {unreadCount > 0 && (
            <span className="text-[9px] font-black text-white bg-blue-600 px-2 py-0.5 rounded-full shadow shadow-blue-600/30 animate-pulse">
              {unreadCount} new
            </span>
          )}
        </div>
      </div>
      
      {notifications.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 border border-white/5 shadow-xl text-center space-y-4 flex flex-col items-center justify-center py-20 select-none">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-500">
            <Heart className="w-5.5 h-5.5 text-slate-605" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-350 uppercase tracking-widest">No Notifications Yet</h4>
            <p className="text-[11px] text-slate-600 max-w-xs mx-auto mt-2 leading-relaxed font-medium">
              When people follow your account, like your posts, or comment on updates, they will appear here in real-time.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* New (within 24 hours) */}
          {newActivities.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">New</h3>
              <div className="glass-card rounded-3xl p-5 border border-white/5 shadow-xl divide-y divide-white/[0.02]">
                {newActivities.map(renderItem)}
              </div>
            </div>
          )}

          {/* Earlier (older than 24 hours) */}
          {earlierActivities.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Earlier</h3>
              <div className="glass-card rounded-3xl p-5 border border-white/5 shadow-xl divide-y divide-white/[0.02]">
                {earlierActivities.map(renderItem)}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default Activity;
