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

  /* UI UPDATE START - Notifications Page UI Redesign (Desktop & Phone responsive) */
  const renderTypeBadge = (type: string) => {
    let bgColor = 'bg-brand-600';
    let icon = <UserPlus className="w-3 h-3 text-white" />;

    switch (type) {
      case 'welcome':
        bgColor = 'bg-brand-600';
        icon = <Sparkles className="w-3 h-3 text-white" />;
        break;
/* THEME START */
      case 'follow':
        bgColor = 'bg-[var(--accent)]';
        icon = <UserPlus className="w-3 h-3 text-[var(--on-accent)]" />;
        break;
      case 'follow_request':
        bgColor = 'bg-amber-500';
        icon = <UserPlus className="w-3 h-3 text-white" />;
        break;
      case 'follow_accept':
        bgColor = 'bg-emerald-500';
        icon = <UserPlus className="w-3 h-3 text-white" />;
        break;
      case 'like':
        bgColor = 'bg-[var(--like)]';
        icon = <Heart className="w-3 h-3 text-white fill-white" />;
        break;
      case 'comment':
        bgColor = 'bg-sky-500';
        icon = <MessageCircle className="w-3 h-3 text-white" />;
        break;
      case 'verification_request':
        bgColor = 'bg-[var(--accent)]';
        icon = <Shield className="w-3 h-3 text-[var(--on-accent)]" />;
        break;
      case 'restriction':
        bgColor = 'bg-[var(--danger)]';
        icon = <AlertTriangle className="w-3 h-3 text-white" />;
        break;
      default:
        bgColor = 'bg-[var(--muted)]';
        icon = <ArrowRight className="w-3 h-3 text-white" />;
        break;
    }

    return (
      <div className={`absolute -bottom-1 -right-1 w-5 h-5 sm:w-[22px] sm:h-[22px] rounded-full ${bgColor} border-2 border-[var(--card)] group-hover:border-[var(--hover)] transition-colors flex items-center justify-center shadow-md flex-shrink-0 z-10`}>
        {icon}
      </div>
    );
  };
/* THEME END */

  const renderItem = (item: NotificationItem, idx: number) => {
    const isWelcome = item.type === 'welcome';
    const notifierName = item.display_name || item.username || 'System';
    const isUnread = !item.is_read;

/* THEME START */
    return (
      <div 
        key={item.id} 
        style={{ animationDelay: `${Math.min(idx, 10) * 35}ms` }}
        className={`flex items-center justify-between p-3.5 sm:p-4 hover:bg-[var(--hover)] transition-colors duration-200 select-none relative group animate-fade-in ${
          isUnread ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]' : ''
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          
          {/* Avatar / Icon Container (48px mobile, 52px desktop) with 22px cut-out badge */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full bg-[var(--input)] border border-[var(--line)] flex items-center justify-center text-xs sm:text-sm font-bold text-[var(--accent-2)] overflow-hidden shadow-sm">
              {!item.notifier_id ? (
                <img src="/logo.png?v=2" alt="System Logo" className="w-full h-full object-cover" />
              ) : isWelcome ? (
                <div className="w-full h-full bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] flex items-center justify-center text-[var(--accent-2)] font-extrabold text-sm sm:text-base">D</div>
              ) : item.avatar_url ? (
                <img src={`/api/media/file/${item.avatar_url}`} alt={notifierName} className="w-full h-full object-cover" />
              ) : (
                notifierName.substring(0, 2).toUpperCase()
              )}
            </div>
            
            {/* 22px Solid Type Badge with 2px card-color cut-out border */}
            {renderTypeBadge(item.type)}
          </div>

          {/* Details Column: Username + Action on same line, Muted regular time on second line */}
          <div className="min-w-0 flex-1 pt-0.5">
            {isWelcome ? (
              <p className="text-sm text-slate-300 leading-snug break-words">
                {item.body ? (
                  <span>
                    {item.notifier_id ? (
                      <span 
                        onClick={() => item.username && onNavigate('profile', item.username)}
                        className="font-semibold text-white mr-1.5 hover:text-brand-300 cursor-pointer transition-colors"
                      >
                        {notifierName}:
                      </span>
                    ) : (
                      <span className="font-semibold text-brand-400 mr-1.5">
                        System:
                      </span>
                    )}
                    <span className="text-[#aab0c8] font-normal">{item.body}</span>
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold text-white mr-1.5">Welcome to DataVerse!</span>
                    <span className="text-[#aab0c8] font-normal">Explore your feed, share reels, and connect with other creators.</span>
                  </span>
                )}
              </p>
            ) : item.type === 'restriction' ? (
              <p className="text-sm text-slate-300 leading-snug break-words">
                {item.notifier_id ? (
                  <span>
                    <span 
                      onClick={() => item.username && onNavigate('profile', item.username)}
                      className="font-semibold text-white mr-1.5 hover:text-brand-300 cursor-pointer transition-colors"
                    >
                      {notifierName}
                    </span>
                    <span className="text-[#aab0c8] font-normal">restricted your chat access for {item.body?.replace("You can't chat for ", "")}</span>
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold text-red-400 mr-1.5">System Alert:</span>
                    <span className="text-[#aab0c8] font-normal">{item.body}</span>
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm leading-snug break-words">
                <span 
                  onClick={() => item.username && onNavigate('profile', item.username)}
                  className="font-semibold text-white hover:text-brand-300 cursor-pointer transition-colors mr-1.5 inline"
                >
                  {notifierName}
                </span>
                <span className="text-[#aab0c8] font-normal text-sm inline">
                  {item.type === 'follow' && 'started following you'}
                  {item.type === 'follow_request' && 'requested to follow you'}
                  {item.type === 'follow_accept' && 'accepted your request'}
                  {item.type === 'like' && 'liked your post'}
                  {item.type === 'comment' && `commented: "${item.body}"`}
                  {item.type === 'verification_request' && 'submitted a verification request'}
                </span>
              </p>
            )}

            {/* Time on second line: small muted gray, regular weight */}
            <span className="text-xs text-[#6b7090] font-normal block mt-1">
              {formatTime(item.created_at)}
            </span>
          </div>

        </div>

        {/* Right side: unread dot + Outlined Profile pill button */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* Unread indicator dot */}
          {isUnread && item.type !== 'follow_request' && (
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow shadow-blue-500/50 flex-shrink-0 animate-pulse mr-1" />
          )}

          {item.type === 'follow_request' ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
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
                className="min-h-[44px] sm:min-h-[36px] px-3.5 sm:px-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-full shadow-md shadow-brand-600/20 active:scale-95 transition-all flex items-center justify-center"
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
                className="min-h-[44px] sm:min-h-[36px] px-3.5 sm:px-4 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 text-xs font-medium rounded-full active:scale-95 transition-all flex items-center justify-center"
              >
                Reject
              </button>
            </div>
          ) : (
            <>
              {/* Profile link button - Outlined pill filling with accent on hover */}
              {!isWelcome && item.username && (
                <button
                  onClick={() => {
                    if (item.type === 'verification_request') {
                      onNavigate('admin');
                    } else {
                      onNavigate('profile', item.username!);
                    }
                  }}
                  className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-full border border-[var(--line)] text-[var(--accent-2)] hover:bg-[var(--accent)] hover:text-[var(--on-accent)] text-xs font-medium transition-all shadow-sm active:scale-95 flex items-center justify-center"
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
    <div className="w-full max-w-[720px] mx-auto self-center px-4 sm:px-6 py-6 sm:py-8 animate-fade-in space-y-6 sm:space-y-8 relative z-10 pb-24 md:pb-12">

      {/* THEME START */}
      {/* Faint radial glow behind the header */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,var(--glow),transparent)] blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Phone: Slim sticky top bar with blurred background */}
      <div className="md:hidden sticky top-0 z-30 bg-[color-mix(in_srgb,var(--side)_85%,transparent)] backdrop-blur-md border-b border-[var(--line)] px-4 py-3 -mx-4 -mt-6 mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text)] tracking-tight">Notifications</h1>
        {unreadCount > 0 && (
          <span className="text-[10px] font-semibold text-[var(--on-accent)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-2 py-0.5 rounded-full shadow-sm">
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Desktop Header: 28px semibold title in sentence case */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-semibold text-[var(--text)] tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold text-[var(--on-accent)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-2.5 py-0.5 rounded-full shadow-md shadow-[var(--shadow-accent)]">
              {unreadCount} new
            </span>
          )}
        </div>
      </div>
      
      {notifications.length === 0 ? (
        <div className="rounded-3xl p-12 border border-[var(--line)] bg-[var(--card)] shadow-xl shadow-[var(--shadow-card)] text-center space-y-4 flex flex-col items-center justify-center py-20 select-none">
          <div className="w-14 h-14 rounded-2xl bg-[var(--input)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)]">
            <Heart className="w-6 h-6 text-[var(--muted)]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--text)]">No notifications yet</h4>
            <p className="text-xs text-[var(--muted)] max-w-xs mx-auto mt-2 leading-relaxed font-normal">
              When people follow your account, like your posts, or comment on updates, they will appear here in real-time.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* New (within 24 hours) */}
          {newActivities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 py-1">
                <span className="text-xs font-medium text-[var(--muted)]">New</span>
                <div className="flex-1 h-[1px] bg-[var(--line)]" />
              </div>
              <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl sm:rounded-3xl shadow-xl shadow-[var(--shadow-card)] overflow-hidden divide-y divide-[var(--line)]">
                {newActivities.map((item, idx) => renderItem(item, idx))}
              </div>
            </div>
          )}

          {/* Earlier (older than 24 hours) */}
          {earlierActivities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 py-1">
                <span className="text-xs font-medium text-[var(--muted)]">Earlier</span>
                <div className="flex-1 h-[1px] bg-[var(--line)]" />
              </div>
              <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl sm:rounded-3xl shadow-xl shadow-[var(--shadow-card)] overflow-hidden divide-y divide-[var(--line)]">
                {earlierActivities.map((item, idx) => renderItem(item, idx))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* THEME END */}

    </div>
  );
  /* UI UPDATE END */
};

export default Activity;
