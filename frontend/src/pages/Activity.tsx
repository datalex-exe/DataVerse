import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const cached = sessionStorage.getItem('dv_cached_notifications');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('dv_cached_notifications');
    } catch {
      return true;
    }
  });

  // Fetch real notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.notifications || [];
        setNotifications(list);
        try {
          sessionStorage.setItem('dv_cached_notifications', JSON.stringify(list.slice(0, 50)));
        } catch {}
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
    let bgColor = 'bg-[var(--accent)]';
    let icon = <UserPlus className="w-3 h-3 text-[var(--on-accent)] stroke-[2]" />;

    switch (type) {
      case 'welcome':
        bgColor = 'bg-[var(--accent)]';
        icon = <Sparkles className="w-3 h-3 text-[var(--on-accent)] stroke-[2]" />;
        break;
      case 'follow':
        bgColor = 'bg-[var(--accent)]';
        icon = <UserPlus className="w-3 h-3 text-[var(--on-accent)] stroke-[2]" />;
        break;
      case 'follow_request':
        bgColor = 'bg-[var(--gold)]';
        icon = <UserPlus className="w-3 h-3 text-[var(--bg)] stroke-[2]" />;
        break;
      case 'follow_accept':
        bgColor = 'bg-[var(--accent-2)]';
        icon = <UserPlus className="w-3 h-3 text-[var(--bg)] stroke-[2]" />;
        break;
      case 'like':
        bgColor = 'bg-[var(--like)]';
        icon = <Heart className="w-3 h-3 text-white fill-white stroke-[1.5]" />;
        break;
      case 'comment':
        bgColor = 'bg-[var(--accent-2)]';
        icon = <MessageCircle className="w-3 h-3 text-[var(--bg)] stroke-[2]" />;
        break;
      case 'verification_request':
        bgColor = 'bg-[var(--accent)]';
        icon = <Shield className="w-3 h-3 text-[var(--on-accent)] stroke-[2]" />;
        break;
      case 'restriction':
        bgColor = 'bg-[var(--danger)]';
        icon = <AlertTriangle className="w-3 h-3 text-white stroke-[2]" />;
        break;
      default:
        bgColor = 'bg-[var(--muted)]';
        icon = <ArrowRight className="w-3 h-3 text-[var(--bg)] stroke-[2]" />;
        break;
    }

    return (
      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${bgColor} border-2 border-[var(--card)] flex items-center justify-center shadow-md flex-shrink-0 z-10`}>
        {icon}
      </div>
    );
  };

  const renderItem = (item: NotificationItem, idx: number) => {
    const isWelcome = item.type === 'welcome';
    const notifierName = item.display_name || item.username || 'System';
    const isUnread = !item.is_read;

    return (
      <div 
        key={item.id} 
        style={{ animationDelay: `${Math.min(idx, 10) * 35}ms` }}
        className={`flex items-center justify-between p-3.5 sm:p-4 hover:bg-[var(--hover)] transition-colors duration-200 select-none relative group animate-fade-in ${
          isUnread ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]' : ''
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          
          {/* Avatar (40px mobile, 44px desktop) with 20px badge on bottom-right */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[var(--input)] border border-[var(--card-border)] flex items-center justify-center text-xs sm:text-sm font-bold text-[var(--accent-2)] overflow-hidden shadow-sm">
              {!item.notifier_id ? (
                <img src="/logo.png?v=3" alt="" aria-hidden="true" className="w-full h-full object-cover" />
              ) : isWelcome ? (
                <div className="w-full h-full bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] flex items-center justify-center text-[var(--accent-2)] font-bold text-sm sm:text-base">D</div>
              ) : item.avatar_url ? (
                <img src={`/api/media/file/${item.avatar_url}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
              ) : (
                notifierName.substring(0, 2).toUpperCase()
              )}
            </div>
            
            {/* Type Badge */}
            {renderTypeBadge(item.type)}
          </div>

          {/* Details Column: Username + Action on same line, Muted regular time on second line */}
          <div className="min-w-0 flex-1 pt-0.5">
            {isWelcome ? (
              <p className="text-sm text-[var(--text)] leading-snug break-words">
                {item.body ? (
                  <span>
                    {item.notifier_id ? (
                      <span 
                        onClick={() => item.username && onNavigate('profile', item.username)}
                        className="font-bold text-[var(--text)] mr-1.5 hover:text-[var(--accent-2)] cursor-pointer transition-colors"
                      >
                        {notifierName}:
                      </span>
                    ) : (
                      <span className="font-bold text-[var(--accent-2)] mr-1.5">
                        System:
                      </span>
                    )}
                    <span className="text-[var(--muted)] font-normal">{item.body}</span>
                  </span>
                ) : (
                  <span>
                    <span className="font-bold text-[var(--text)] mr-1.5">Welcome to DataVerse!</span>
                    <span className="text-[var(--muted)] font-normal">Explore your feed, share reels, and connect with other creators.</span>
                  </span>
                )}
              </p>
            ) : item.type === 'restriction' ? (
              <p className="text-sm text-[var(--text)] leading-snug break-words">
                {item.notifier_id ? (
                  <span>
                    <span 
                      onClick={() => item.username && onNavigate('profile', item.username)}
                      className="font-bold text-[var(--text)] mr-1.5 hover:text-[var(--accent-2)] cursor-pointer transition-colors"
                    >
                      {notifierName}
                    </span>
                    <span className="text-[var(--muted)] font-normal">restricted your chat access for {item.body?.replace("You can't chat for ", "")}</span>
                  </span>
                ) : (
                  <span>
                    <span className="font-bold text-[var(--danger)] mr-1.5">System Alert:</span>
                    <span className="text-[var(--muted)] font-normal">{item.body}</span>
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm leading-snug break-words">
                <span 
                  onClick={() => item.username && onNavigate('profile', item.username)}
                  className="font-bold text-[var(--text)] hover:text-[var(--accent-2)] cursor-pointer transition-colors mr-1.5 inline"
                >
                  {notifierName}
                </span>
                <span className="text-[var(--muted)] font-normal text-sm inline">
                  {item.type === 'follow' && 'started following you'}
                  {item.type === 'follow_request' && 'requested to follow you'}
                  {item.type === 'follow_accept' && 'accepted your request'}
                  {item.type === 'like' && 'liked your post'}
                  {item.type === 'comment' && `commented: "${item.body}"`}
                  {item.type === 'verification_request' && 'submitted a verification request'}
                </span>
              </p>
            )}

            {/* Time on second line: muted */}
            <span className="text-xs text-[var(--muted)] font-normal block mt-1">
              {formatTime(item.created_at)}
            </span>
          </div>

        </div>

        {/* Right side: unread dot + Outlined Profile pill button */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* Unread indicator dot */}
          {isUnread && item.type !== 'follow_request' && (
            <span className="w-2 h-2 rounded-full bg-[var(--accent-2)] shadow-[0_0_8px_var(--shadow-accent)] flex-shrink-0 animate-pulse mr-1" />
          )}

          {item.type === 'follow_request' ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                aria-label={`Accept follow request from ${notifierName}`}
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/users/follow-requests/${item.id}/accept`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, type: 'follow', is_read: true } : n));
                      toast.success(`Accepted @${notifierName}'s follow request`);
                    } else {
                      toast.error('Failed to accept follow request');
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error('Network error accepting follow request');
                  }
                }}
                className="min-h-[36px] px-4 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-semibold rounded-full shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              >
                Accept
              </button>
              <button
                type="button"
                aria-label={`Reject follow request from ${notifierName}`}
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/users/follow-requests/${item.id}/reject`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                      setNotifications(prev => prev.filter(n => n.id !== item.id));
                      toast.info(`Rejected follow request`);
                    } else {
                      toast.error('Failed to reject follow request');
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error('Network error rejecting follow request');
                  }
                }}
                className="min-h-[36px] px-4 bg-[var(--input)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--card-border)] text-xs font-medium rounded-full active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              >
                Reject
              </button>
            </div>
          ) : (
            <>
              {/* Profile link button - Outlined pill filling with accent on hover */}
              {!isWelcome && item.username && (
                <button
                  type="button"
                  aria-label={`View ${item.type === 'verification_request' ? 'admin verification' : `${notifierName}'s profile`}`}
                  onClick={() => {
                    if (item.type === 'verification_request') {
                      onNavigate('admin');
                    } else {
                      onNavigate('profile', item.username!);
                    }
                  }}
                  className="min-h-[34px] px-3.5 py-1 rounded-full border border-[var(--card-border)] text-[var(--accent-2)] hover:bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] text-xs font-medium transition-all shadow-sm active:scale-95 flex items-center justify-center cursor-pointer"
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

  // Categorize notifications based on time (Today within 24h, Earlier older)
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const newActivities = notifications.filter(n => now - n.created_at < oneDay);
  const earlierActivities = notifications.filter(n => now - n.created_at >= oneDay);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-32 text-[var(--muted)] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-2)]" />
        <p className="text-xs">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[640px] mx-auto self-center px-4 sm:px-6 pt-3 sm:pt-6 pb-24 md:pb-12 animate-fade-in relative z-10">

      <div className="space-y-4 sm:space-y-6">
        {/* Unified Main Heading */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--card-border)]">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl md:text-[28px] font-semibold text-[var(--text)] tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold text-[var(--on-accent)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-2.5 py-0.5 rounded-full shadow-md shadow-[var(--shadow-accent)]">
                {unreadCount} new
              </span>
            )}
          </div>
        </div>
      
        {notifications.length === 0 ? (
          <div className="rounded-[20px] p-12 border border-[var(--card-border)] bg-[var(--card)] shadow-lg shadow-[var(--shadow-card)] text-center space-y-4 flex flex-col items-center justify-center py-20 select-none">
            <div className="w-14 h-14 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)]">
              <Heart className="w-6 h-6 stroke-[1.8] text-[var(--muted)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">No notifications yet</h2>
              <p className="text-xs text-[var(--muted)] max-w-xs mx-auto mt-2 leading-relaxed font-normal">
                When people follow your account, like your posts, or comment on updates, they will appear here in real-time.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Today (within 24 hours) */}
            {newActivities.length > 0 && (
              <section aria-labelledby="heading-new-notifications" className="space-y-2.5">
                <div className="flex items-center gap-3 py-1">
                  <h2 id="heading-new-notifications" className="text-xs font-semibold text-[var(--muted)]">Today</h2>
                  <div className="flex-1 h-[1px] bg-[var(--card-border)]" />
                </div>
                <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-[20px] shadow-lg shadow-[var(--shadow-card)] overflow-hidden divide-y divide-[var(--card-border)]">
                  {newActivities.map((item, idx) => renderItem(item, idx))}
                </div>
              </section>
            )}

            {/* Earlier (older than 24 hours) */}
            {earlierActivities.length > 0 && (
              <section aria-labelledby="heading-earlier-notifications" className="space-y-2.5">
                <div className="flex items-center gap-3 py-1">
                  <h2 id="heading-earlier-notifications" className="text-xs font-semibold text-[var(--muted)]">Earlier</h2>
                  <div className="flex-1 h-[1px] bg-[var(--card-border)]" />
                </div>
                <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-[20px] shadow-lg shadow-[var(--shadow-card)] overflow-hidden divide-y divide-[var(--card-border)]">
                  {earlierActivities.map((item, idx) => renderItem(item, idx))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

    </div>
  );
  /* UI UPDATE END */
};

export default Activity;
