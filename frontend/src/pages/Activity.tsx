import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DataVerseLogo } from '../components/DataVerseLogo';
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  ArrowRight, 
  Sparkles, 
  Shield, 
  AlertTriangle,
  WifiOff,
  RefreshCw,
  Clock,
  Compass,
  BellOff,
  Lock,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';

export type ActivityStatus = 
  | 'idle'
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'slow'
  | 'session_expired';

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
  const { token, logout } = useAuth();
  const { toast } = useToast();
  
  // Explicit Status Modeling
  const [status, setStatus] = useState<ActivityStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSlowNetwork, setIsSlowNetwork] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [showPushBanner, setShowPushBanner] = useState<boolean>(false);
  const [acceptedRequests, setAcceptedRequests] = useState<Record<string, string>>({});
  
  // State Preview Mode (for UI/UX Engineering validation)
  const [previewState, setPreviewState] = useState<ActivityStatus | null>(null);
  const [showPreviewToolbar, setShowPreviewToolbar] = useState<boolean>(false);

  // Cached notifications for zero-data loss
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const cached = sessionStorage.getItem('dv_cached_notifications');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor online / offline network state
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchNotifications();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check push permission status
    if ('Notification' in window && Notification.permission === 'denied') {
      const dismissed = sessionStorage.getItem('dv_dismiss_push_banner');
      if (!dismissed) setShowPushBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch real notifications with timeout and explicit state handling
  const fetchNotifications = async () => {
    if (!token) {
      setStatus('session_expired');
      return;
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setStatus(notifications.length === 0 ? 'offline' : 'idle');
      return;
    }

    // Begin loading & start slow network timer (3500ms)
    setStatus(notifications.length === 0 ? 'loading' : 'idle');
    setIsSlowNetwork(false);

    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      setIsSlowNetwork(true);
      setStatus('slow');
    }, 3500);

    try {
      const res = await fetch('/api/users/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);

      if (res.status === 401) {
        setStatus('session_expired');
        return;
      }

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const list: NotificationItem[] = data.notifications || [];
      
      setNotifications(list);
      try {
        sessionStorage.setItem('dv_cached_notifications', JSON.stringify(list.slice(0, 50)));
      } catch {}

      setStatus(list.length === 0 ? 'empty' : 'idle');
      setIsSlowNetwork(false);
    } catch (err: any) {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      console.error('Error fetching notifications:', err);
      
      if (!navigator.onLine) {
        setIsOffline(true);
        setStatus('offline');
      } else {
        setErrorMessage(err.message || 'Connection timed out');
        setStatus(notifications.length === 0 ? 'error' : 'idle');
        toast.error('Could not refresh notifications. Showing saved copy.');
      }
    }
  };

  // Mark all unread notifications as read
  const markAllRead = async () => {
    if (!token || !navigator.onLine) return;
    try {
      await fetch('/api/users/notifications/read', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      clearInterval(interval);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [token]);

  // Mark as read after user views the screen
  useEffect(() => {
    if (status !== 'loading' && notifications.some(n => !n.is_read)) {
      const timer = setTimeout(markAllRead, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status]);

  // Format time relative string
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 60) return `${mins <= 0 ? 'now' : mins + 'm'}`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

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

  // ─────────────────────────────────────────────────────────────────────────────
  // 10-STATE SUB-COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────────

  // STATE 2: LOADING SKELETON (Matching exact real item layout)
  const renderLoadingSkeleton = () => (
    <div 
      role="status" 
      aria-live="polite" 
      aria-label="Loading your recent notifications" 
      className="space-y-6 animate-pulse select-none"
    >
      <div className="flex items-center gap-3 py-1">
        <div className="w-16 h-3 bg-[var(--card-border)] rounded-full" />
        <div className="flex-1 h-[1px] bg-[var(--card-border)]" />
      </div>

      <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-[20px] shadow-lg shadow-[var(--shadow-card)] overflow-hidden divide-y divide-[var(--card-border)]">
        {[1, 2, 3, 4].map(key => (
          <div key={key} className="flex items-center justify-between p-3.5 sm:p-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1">
              {/* Avatar Skeleton */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[var(--input)] flex-shrink-0" />
              {/* Text Lines */}
              <div className="flex-1 space-y-2 py-1">
                <div className="w-3/4 h-3.5 bg-[var(--input)] rounded-md" />
                <div className="w-1/4 h-2.5 bg-[var(--input)] rounded-md opacity-70" />
              </div>
            </div>
            {/* Action Pill Skeleton */}
            <div className="w-16 h-8 rounded-full bg-[var(--input)] ml-3 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );

  // STATE 1: EMPTY STATE
  const renderEmptyState = () => (
    <div 
      role="region" 
      aria-label="No notifications" 
      className="rounded-[20px] p-8 sm:p-12 border border-[var(--card-border)] bg-[var(--card)] shadow-lg shadow-[var(--shadow-card)] text-center space-y-5 flex flex-col items-center justify-center py-16 select-none animate-fade-in"
    >
      <div className="w-16 h-16 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] flex items-center justify-center text-[var(--accent-2)] shadow-inner">
        <Heart className="w-7 h-7 stroke-[1.8]" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--text)]">No activity yet</h2>
        <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed font-normal">
          When people follow your profile, like your posts, or comment on updates, they will appear here in real time.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className="w-full sm:w-auto min-h-[44px] px-6 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-semibold text-xs tracking-wide shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          Explore Creators
        </button>
        <button
          type="button"
          onClick={() => onNavigate('create')}
          className="w-full sm:w-auto min-h-[44px] px-5 rounded-full border border-[var(--card-border)] bg-[var(--input)] hover:bg-[var(--hover)] text-[var(--text)] text-xs font-medium active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          Create First Post
        </button>
      </div>
    </div>
  );

  // STATE 3: ERROR STATE
  const renderErrorState = () => (
    <div 
      role="alert" 
      aria-live="assertive" 
      className="rounded-[20px] p-8 border border-[var(--card-border)] bg-[var(--card)] shadow-lg shadow-[var(--shadow-card)] text-center space-y-4 flex flex-col items-center justify-center py-14 select-none animate-fade-in"
    >
      <div className="w-14 h-14 rounded-2xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] flex items-center justify-center text-[var(--danger)]">
        <AlertTriangle className="w-6 h-6 stroke-[2]" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-base font-semibold text-[var(--text)]">Couldn't refresh notifications</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed font-normal">
          {errorMessage ? `Error: ${errorMessage}. ` : ''}Our servers didn't respond in time. It's on our side, and your saved notifications remain intact.
        </p>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => fetchNotifications()}
          className="min-h-[44px] px-6 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-semibold text-xs shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );

  // STATE 4: NO INTERNET (OFFLINE) BANNER
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
          Showing saved notifications. Actions you take will sync automatically once reconnected.
        </p>
      </div>
      <button
        type="button"
        onClick={() => fetchNotifications()}
        className="min-h-[36px] px-3.5 bg-[var(--card)] hover:bg-[var(--hover)] border border-[var(--card-border)] text-[var(--text)] text-xs font-semibold rounded-full active:scale-95 transition-all flex-shrink-0 cursor-pointer"
      >
        Retry
      </button>
    </div>
  );

  // STATE 5: SLOW NETWORK BANNER
  const renderSlowNetworkBanner = () => (
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
          <span className="font-semibold text-[var(--accent-2)] mr-1">Slow connection.</span>
          We're fetching your updates with lightweight compression to preserve your data.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          setIsSlowNetwork(false);
          setStatus('idle');
        }}
        className="min-h-[36px] px-3.5 bg-[var(--card)] hover:bg-[var(--hover)] border border-[var(--card-border)] text-[var(--text)] text-xs font-semibold rounded-full active:scale-95 transition-all flex-shrink-0 cursor-pointer"
      >
        Keep Saved
      </button>
    </div>
  );

  // STATE 7: PERMISSION DENIED (PUSH NOTIFICATIONS)
  const renderPushPermissionBanner = () => (
    <div 
      role="region" 
      aria-label="Browser notification settings" 
      className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-between gap-3 text-xs select-none shadow-sm animate-fade-in"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-[var(--input)] flex items-center justify-center flex-shrink-0 text-[var(--muted)]">
          <BellOff className="w-4 h-4" />
        </div>
        <p className="text-[var(--muted)] leading-snug">
          <span className="font-semibold text-[var(--text)] mr-1">Alerts muted:</span>
          Push notifications are blocked in your browser. Enable them in site settings to get real-time badges.
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            setShowPushBanner(false);
            sessionStorage.setItem('dv_dismiss_push_banner', '1');
          }}
          className="min-h-[34px] px-3 text-[var(--muted)] hover:text-[var(--text)] text-xs rounded-full transition-colors cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );

  // STATE 8: SESSION EXPIRED MODAL
  const renderSessionExpired = () => (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="session-expired-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in"
    >
      <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-6 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--gold)_15%,transparent)] border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] flex items-center justify-center text-[var(--gold)] mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 id="session-expired-title" className="text-base font-semibold text-[var(--text)]">Session Expired</h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            For your security, your session timed out. Your current notification list and read states have been saved locally.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
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

  // ─────────────────────────────────────────────────────────────────────────────
  // NOTIFICATION ROW RENDERER (With State 10 Success Handlers)
  // ─────────────────────────────────────────────────────────────────────────────

  const renderItem = (item: NotificationItem, idx: number) => {
    const isWelcome = item.type === 'welcome';
    const notifierName = item.display_name || item.username || 'System';
    const isUnread = !item.is_read;
    const isAccepted = Boolean(acceptedRequests[item.id]);

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
            <div 
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold overflow-hidden shadow-sm ${
                !item.notifier_id || isWelcome
                  ? 'border border-[color-mix(in_srgb,var(--accent-2)_40%,transparent)] shadow-[0_0_12px_rgba(45,212,191,0.18),inset_0_0_6px_rgba(45,212,191,0.1)]'
                  : 'bg-[var(--card)] border border-[var(--card-border)]'
              }`}
              style={(!item.notifier_id || isWelcome) ? { background: 'radial-gradient(circle at 45% 45%, #0b343d 0%, #031317 80%)' } : undefined}
            >
              {!item.notifier_id || isWelcome ? (
                <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shrink-0">
                  <DataVerseLogo 
                    size={28} 
                    rounded="full" 
                    className="w-full h-full object-contain select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" 
                  />
                </div>
              ) : item.avatar_url ? (
                <img src={`/api/media/file/${item.avatar_url}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
              ) : (
                notifierName.substring(0, 2).toUpperCase()
              )}
            </div>
            {renderTypeBadge(item.type)}
          </div>

          {/* Details Column */}
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

            <span className="text-xs text-[var(--muted)] font-normal block mt-1">
              {formatTime(item.created_at)}
            </span>
          </div>
        </div>

        {/* Right side: unread indicator & Action buttons */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {isUnread && item.type !== 'follow_request' && !isAccepted && (
            <span className="w-2 h-2 rounded-full bg-[var(--accent-2)] shadow-[0_0_8px_var(--shadow-accent)] flex-shrink-0 animate-pulse mr-1" />
          )}

          {/* STATE 10: SUCCESS STATE FOR FOLLOW REQUESTS */}
          {isAccepted ? (
            <div className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] text-xs text-[var(--accent-2)] font-semibold select-none animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Following</span>
            </div>
          ) : item.type === 'follow_request' ? (
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
                      setAcceptedRequests(prev => ({ ...prev, [item.id]: notifierName }));
                      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, type: 'follow', is_read: true } : n));
                      toast.success(`Accepted @${notifierName}'s follow request. They can now view your private updates.`);
                    } else {
                      toast.error('Failed to accept follow request. Please try again.');
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error('Network error. Check connection and retry.');
                  }
                }}
                className="min-h-[38px] px-4 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-semibold rounded-full shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
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
                      toast.info(`Declined follow request`);
                    } else {
                      toast.error('Failed to decline follow request');
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error('Network error declining follow request');
                  }
                }}
                className="min-h-[38px] px-4 bg-[var(--input)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--card-border)] text-xs font-medium rounded-full active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              >
                Decline
              </button>
            </div>
          ) : (
            <>
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
                  className="min-h-[36px] px-4 py-1 rounded-full border border-[var(--card-border)] text-[var(--accent-2)] hover:bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] text-xs font-medium transition-all shadow-sm active:scale-95 flex items-center justify-center cursor-pointer"
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

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIVE STATE BRANCHING & PREVIEW CONTROLS
  // ─────────────────────────────────────────────────────────────────────────────

  const effectiveStatus = previewState || status;
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const newActivities = notifications.filter(n => now - n.created_at < oneDay);
  const earlierActivities = notifications.filter(n => now - n.created_at >= oneDay);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="w-full max-w-[640px] mx-auto self-center px-4 sm:px-6 pt-3 sm:pt-6 pb-24 md:pb-12 animate-fade-in relative z-10">
      
      {/* ───────────────────────────────────────────────────────────────────────
          STATE PREVIEW TOOLBAR (Only shown in local dev or via ?debug_states=1)
      ──────────────────────────────────────────────────────────────────────── */}
      {(import.meta.env.DEV || (typeof window !== 'undefined' && window.location.search.includes('debug_states=1'))) && (
        <div className="mb-4">
          <div className="flex items-center justify-between pb-2">
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
            <div className="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--card-border)] flex flex-wrap gap-1.5 text-[11px] animate-fade-in">
              {(['idle', 'loading', 'empty', 'error', 'offline', 'slow', 'session_expired'] as ActivityStatus[]).map(st => (
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

      <div className="space-y-4 sm:space-y-6">
        {/* Main Heading Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--card-border)]">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl md:text-[28px] font-semibold text-[var(--text)] tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && effectiveStatus !== 'empty' && (
              <span className="text-xs font-semibold text-[var(--on-accent)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-2.5 py-0.5 rounded-full shadow-md shadow-[var(--shadow-accent)]">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="Refresh notifications"
            onClick={() => fetchNotifications()}
            className="p-2 text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--hover)] transition-all min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${effectiveStatus === 'loading' ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Banners: Offline, Slow Network, Push Permission */}
        {isOffline && renderOfflineBanner()}
        {isSlowNetwork && effectiveStatus !== 'loading' && renderSlowNetworkBanner()}
        {showPushBanner && renderPushPermissionBanner()}

        {/* ───────────────────────────────────────────────────────────────────
            VIEW RENDERING BASED ON EXPLICIT STATUS
        ──────────────────────────────────────────────────────────────────── */}
        {effectiveStatus === 'loading' && renderLoadingSkeleton()}
        
        {effectiveStatus === 'empty' && renderEmptyState()}

        {effectiveStatus === 'error' && renderErrorState()}

        {effectiveStatus === 'session_expired' && renderSessionExpired()}

        {/* Happy Path / Cached Items view (active for idle, offline, or slow when items exist) */}
        {(effectiveStatus === 'idle' || ((effectiveStatus === 'offline' || effectiveStatus === 'slow') && notifications.length > 0)) && (
          <>
            {notifications.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="space-y-6">
                {/* Today Section */}
                {newActivities.length > 0 && (
                  <section aria-labelledby="heading-new-notifications" className="space-y-2.5">
                    <div className="flex items-center gap-3 py-1">
                      <h2 id="heading-new-notifications" className="text-xs font-semibold text-[var(--muted)]">
                        Today
                      </h2>
                      <div className="flex-1 h-[1px] bg-[var(--card-border)]" />
                    </div>
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-[20px] shadow-lg shadow-[var(--shadow-card)] overflow-hidden divide-y divide-[var(--card-border)]">
                      {newActivities.map((item, idx) => renderItem(item, idx))}
                    </div>
                  </section>
                )}

                {/* Earlier Section */}
                {earlierActivities.length > 0 && (
                  <section aria-labelledby="heading-earlier-notifications" className="space-y-2.5">
                    <div className="flex items-center gap-3 py-1">
                      <h2 id="heading-earlier-notifications" className="text-xs font-semibold text-[var(--muted)]">
                        Earlier
                      </h2>
                      <div className="flex-1 h-[1px] bg-[var(--card-border)]" />
                    </div>
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-[20px] shadow-lg shadow-[var(--shadow-card)] overflow-hidden divide-y divide-[var(--card-border)]">
                      {earlierActivities.map((item, idx) => renderItem(item, idx))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Activity;
