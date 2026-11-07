import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { DataVerseLogo } from '../components/DataVerseLogo';
import { subscribeToPush, checkDevicePushSubscribed } from '../utils/push';
import { 
  Loader2, 
  Shield, 
  UserX, 
  UserCheck, 
  Sparkles, 
  Eye, 
  MessageSquare, 
  Users,
  Lock,
  X,
  Bell,
  AlertTriangle,
  Search,
  Archive,
  ShieldAlert,
  WifiOff,
  RefreshCw,
  SlidersHorizontal,
  ArrowLeft,
  CheckCircle2,
  Radio,
  Send,
  Smartphone,
  Megaphone,
  Clock,
  Target,
  Layers,
  ExternalLink,
  Check,
  Trash2,
  MessageSquareOff,
  Film,
  Image as ImageIcon,
  FileText,
  Mic,
  Download,
  Play,
  Folder
} from 'lucide-react';

export type AdminStatus = 
  | 'idle'
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'slow'
  | 'unauthorized'
  | 'session_expired';

interface AdminProps {
  onNavigate?: (view: string) => void;
}

interface SystemUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_admin: boolean;
  is_top_admin: boolean;
  is_blocked: boolean;
  has_2fa?: boolean;
  chat_restricted_until?: number;
  suspended_until?: number;
  is_verification_paid?: boolean;
  verification_paid_at?: number;
  verification_category?: string | null;
  verification_document_url?: string | null;
  verification_reason?: string | null;
  verification_status?: string;
  email?: string;
  created_at: number;
}

interface ConvoMember {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

interface ConvoLastMsg {
  body: string;
  created_at: number;
  sender_id: string;
}

interface SystemConvo {
  id: string;
  is_group: boolean;
  created_at: number;
  members: ConvoMember[];
  last_message: ConvoLastMsg | null;
  is_deleted?: boolean;
}

interface AuditMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_deleted?: number;
}

/* AVATAR FIX START */
interface AdminAvatarProps {
  avatarUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
  fallbackText?: string;
}

const AdminAvatar: React.FC<AdminAvatarProps> = ({
  avatarUrl,
  name,
  size = 44,
  className = '',
  fallbackText,
}) => {
  const [hasError, setHasError] = useState(false);
  const initials = fallbackText || (name ? name.substring(0, 2).toUpperCase() : 'U');

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const resolvedUrl = avatarUrl
    ? (avatarUrl.startsWith('http') || avatarUrl.startsWith('/api') || avatarUrl.startsWith('/') || avatarUrl.startsWith('data:')
        ? avatarUrl
        : `/api/media/file/${avatarUrl}`)
    : null;

  return (
    <div
      className={`relative select-none flex-none rounded-full overflow-hidden grid place-items-center bg-[var(--input)] border border-[var(--line)] ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        flex: 'none',
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
      }}
    >
      <span
        aria-hidden="true"
        className="font-bold uppercase text-[var(--accent-2)] select-none pointer-events-none"
        style={{ fontSize: `${Math.max(9, Math.round(size * 0.35))}px`, lineHeight: 1 }}
      >
        {initials}
      </span>
      {resolvedUrl && !hasError && (
        <img
          src={resolvedUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            maxWidth: 'none',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}
    </div>
  );
};
/* AVATAR FIX END */

export const Admin: React.FC<AdminProps> = ({ onNavigate }) => {
  const { token, user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'users' | 'chats' | 'restrictions' | 'verifications' | 'reports' | 'push' | 'media'>('users');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [convos, setConvos] = useState<SystemConvo[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // System Media Platform States (All media access from sent to deleted)
  interface AdminMediaItem {
    id: string;
    raw_id: string;
    source: 'chat' | 'post';
    source_name: string;
    source_id: string;
    user: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
    url: string;
    media_type: 'image' | 'video' | 'audio' | 'file';
    file_name: string;
    allow_save: boolean;
    status: 'active' | 'deleted';
    created_at: number;
    context: string;
  }

  interface AdminMediaCounts {
    total: number;
    active: number;
    deleted: number;
    images: number;
    videos: number;
    audio: number;
    files: number;
  }

  const [adminMedia, setAdminMedia] = useState<AdminMediaItem[]>([]);
  const [adminMediaCounts, setAdminMediaCounts] = useState<AdminMediaCounts>({
    total: 0,
    active: 0,
    deleted: 0,
    images: 0,
    videos: 0,
    audio: 0,
    files: 0
  });
  const [mediaLoading, setMediaLoading] = useState<boolean>(false);
  const [mediaUserSearch, setMediaUserSearch] = useState<string>('');
  const [mediaStatusFilter, setMediaStatusFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video' | 'audio' | 'file'>('all');
  const [mediaSourceFilter, setMediaSourceFilter] = useState<'all' | 'chat' | 'post'>('all');
  const [mediaViewMode, setMediaViewMode] = useState<'grid' | 'table'>('grid');
  const [activeMediaPreview, setActiveMediaPreview] = useState<AdminMediaItem | null>(null);

  // Web Push Notifications / Broadcast States (Available to Admin and Super Admin)
  interface PushStatsData {
    totalSubscribers: number;
    active3d: number;
    inactive3d: number;
    inactive7d: number;
    subscribedUserIds?: string[];
    recentCampaigns: Array<{
      id: string;
      title: string;
      body: string;
      url: string;
      target_audience: string;
      sent_count: number;
      success_count: number;
      created_at: number;
    }>;
  }
  const [pushStats, setPushStats] = useState<PushStatsData | null>(null);
  const [loadingPushStats, setLoadingPushStats] = useState<boolean>(false);
  const [pushTitle, setPushTitle] = useState<string>('DataVerse');
  const [pushBody, setPushBody] = useState<string>('');
  const [pushUrl, setPushUrl] = useState<string>('https://dataverse.datalexcloud.tech');
  const [pushAudience, setPushAudience] = useState<'all' | 'inactive_3d' | 'inactive_7d' | 'users'>('all');
  const [pushUserFilter, setPushUserFilter] = useState<string>('');
  const [selectedPushUsers, setSelectedPushUsers] = useState<string[]>([]);
  const [sendingPush, setSendingPush] = useState<boolean>(false);
  const [isThisDeviceSubscribed, setIsThisDeviceSubscribed] = useState<boolean>(false);
  const [subscribingThisDevice, setSubscribingThisDevice] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [diagnosticOpen, setDiagnosticOpen] = useState<boolean>(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<{ step: string; status: 'ok' | 'fail' | 'warn' | 'info'; detail: string }[]>([]);
  const [runningDiagnostic, setRunningDiagnostic] = useState<boolean>(false);

  // 10-State Architecture variables
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isSlowNetwork, setIsSlowNetwork] = useState<boolean>(false);
  const [previewState, setPreviewState] = useState<AdminStatus | null>(null);
  const [showPreviewToolbar, setShowPreviewToolbar] = useState<boolean>(false);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    actionLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Moderation Action Modal States (for resolving reports with enforcement)
  const [reportActionTarget, setReportActionTarget] = useState<any | null>(null);
  const [reportActionType, setReportActionType] = useState<'chat_restrict' | 'suspend' | 'remove_account' | 'resolve'>('chat_restrict');
  const [reportActionDuration, setReportActionDuration] = useState<number>(1440); // 24 hours default
  const [reportActionReason, setReportActionReason] = useState<string>('');
  const [executingReportAction, setExecutingReportAction] = useState<boolean>(false);
  const slowTimerRef = useRef<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, []);

  // Restrictions & Notification Form States
  const [selectedUserForNotif, setSelectedUserForNotif] = useState<string>('all');
  const [notifText, setNotifText] = useState<string>('');
  const [sendingNotif, setSendingNotif] = useState<boolean>(false);
  const [notifSuccess, setNotifSuccess] = useState<boolean>(false);
  const [senderType, setSenderType] = useState<'admin' | 'system'>('admin');

  const [selectedUserForRestrict, setSelectedUserForRestrict] = useState<string>('');
  const [restrictDuration, setRestrictDuration] = useState<number>(60);
  const [restrictSenderType, setRestrictSenderType] = useState<'admin' | 'system'>('admin');
  const [applyingRestriction, setApplyingRestriction] = useState<boolean>(false);
  const [restrictSuccess, setRestrictSuccess] = useState<boolean>(false);

  const [searchNotifUser, setSearchNotifUser] = useState<string>('');
  const [searchRestrictUser, setSearchRestrictUser] = useState<string>('');
  const [searchUserQuery, setSearchUserQuery] = useState<string>('');

  // Audit Chat modal/drawer state
  const [auditingConvo, setAuditingConvo] = useState<SystemConvo | null>(null);
  const [auditMessages, setAuditMessages] = useState<AuditMessage[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  // Fetch all users list
  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to fetch user directory');
      }
    } catch (err) {
      console.error(err);
      setError('Network error loading users');
    }
  };

  // Fetch all conversations list
  const fetchConvos = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/conversations/global/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConvos(data.conversations || []);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to fetch conversations audit');
      }
    } catch (err) {
      console.error(err);
      setError('Network error loading conversations');
    }
  };

  const handleRemoveChatFromAdmin = (convoId: string) => {
    if (!token) return;
    setConfirmDialog({
      title: "Remove Chat from Console?",
      description: "Database records (messages, photos, and videos) will not be deleted, but this conversation will be hidden from the admin audit list.",
      actionLabel: "Hide Chat",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/conversations/global/${convoId}/hide`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setConvos(prev => prev.filter(c => c.id !== convoId));
            toast.success('Chat removed from the Admin Console list (database records preserved).');
          } else {
            const errData = await res.json();
            toast.error(errData.error || 'Failed to remove chat');
          }
        } catch (err) {
          console.error(err);
          toast.error('Network error removing chat');
        }
      }
    });
  };

  const handleRedactMessageText = (messageId: string) => {
    if (!token) return;
    setConfirmDialog({
      title: "Redact Message Text?",
      description: "The underlying data remains intact in the database. This replaces the message preview with [Redacted Text] in your audit view.",
      actionLabel: "Redact Preview",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/conversations/messages/${messageId}/redact`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (res.ok) {
            setAuditMessages(prev => prev.map(m => {
              if (m.id === messageId) {
                return { ...m, body: '[Redacted Text]' };
              }
              return m;
            }));
            toast.success('Message text cleared from your view successfully.');
          } else {
            const errData = await res.json();
            toast.error(errData.error || 'Failed to clear text');
          }
        } catch (err) {
          console.error(err);
          toast.error('Network error clearing message text');
        }
      }
    });
  };

  const fetchReports = async () => {
    if (!token) return;
    setReportsLoading(true);
    try {
      const res = await fetch('/api/users/admin/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to fetch safety reports');
      }
    } catch (err) {
      console.error(err);
      setError('Network error loading reports');
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchAdminMedia = async () => {
    if (!token || !currentUser?.is_top_admin) return;
    setMediaLoading(true);
    try {
      const params = new URLSearchParams();
      if (mediaUserSearch.trim()) params.append('user', mediaUserSearch.trim());
      if (mediaStatusFilter !== 'all') params.append('status', mediaStatusFilter);
      if (mediaTypeFilter !== 'all') params.append('type', mediaTypeFilter);
      if (mediaSourceFilter !== 'all') params.append('source', mediaSourceFilter);

      const res = await fetch(`/api/users/admin/media?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminMedia(data.items || []);
        if (data.counts) setAdminMediaCounts(data.counts);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to fetch media assets');
      }
    } catch (err) {
      console.error(err);
      setError('Network error loading system media');
    } finally {
      setMediaLoading(false);
    }
  };

  const handlePurgeMedia = (item: AdminMediaItem) => {
    setConfirmDialog({
      title: `Purge ${item.media_type.toUpperCase()} Media?`,
      description: `Permanently delete this ${item.source_name} file (${item.file_name}) sent by @${item.user.username}. This cannot be undone.`,
      actionLabel: "Permanently Purge",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/users/admin/media/${item.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            toast.success('Media purged successfully');
            setAdminMedia(prev => prev.filter(m => m.id !== item.id));
            setAdminMediaCounts(prev => ({
              ...prev,
              total: Math.max(0, prev.total - 1),
              [item.status === 'deleted' ? 'deleted' : 'active']: Math.max(0, prev[item.status === 'deleted' ? 'deleted' : 'active'] - 1)
            }));
            if (activeMediaPreview?.id === item.id) {
              setActiveMediaPreview(null);
            }
          } else {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || 'Failed to purge media');
          }
        } catch {
          toast.error('Network error purging media');
        }
      }
    });
  };

  const fetchPushStats = async () => {
    if (!token) return;
    setLoadingPushStats(true);
    try {
      const res = await fetch('/api/push/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPushStats(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn('Failed to fetch push stats:', errData);
      }
    } catch (err) {
      console.error('Network error loading push stats:', err);
    } finally {
      setLoadingPushStats(false);
    }
  };

  const handleBroadcastPush = async () => {
    if (!token) return;
    if (!pushBody.trim()) {
      toast.error('Please enter a notification message.');
      return;
    }
    if (pushAudience === 'users' && selectedPushUsers.length === 0) {
      toast.error('Please select at least one target user.');
      return;
    }

    setSendingPush(true);
    try {
      const res = await fetch('/api/push/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: pushTitle.trim() || 'DataVerse',
          body: pushBody.trim(),
          url: pushUrl.trim() || 'https://dataverse.datalexcloud.tech',
          targetAudience: pushAudience,
          targetUserIds: pushAudience === 'users' ? selectedPushUsers : undefined,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch notification');
      }

      toast.success(data.message || `Push notification dispatched to ${data.successCount} active device(s)!`);
      await fetchPushStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to broadcast push notification');
    } finally {
      setSendingPush(false);
    }
  };

  const handleSubscribeCurrentDevice = async () => {
    setSubscribingThisDevice(true);
    try {
      const res = await subscribeToPush(token);
      if (res.success) {
        setIsThisDeviceSubscribed(true);
        toast.success('Success! This device is registered to receive push alerts.');
        await fetchPushStats();
      } else {
        toast.error(res.error || 'Failed to register this device for push.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error subscribing device');
    } finally {
      setSubscribingThisDevice(false);
    }
  };

  const handleSendTestToThisDevice = async () => {
    if (!currentUser?.id) return;
    setSendingPush(true);
    try {
      // Dispatch remote broadcast through Google FCM to this user's registered device(s)
      const res = await fetch('/api/push/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'DataVerse Alert 🚀',
          body: `Hi @${currentUser.username}, your web push notifications are working perfectly!`,
          url: 'https://dataverse.datalexcloud.tech',
          targetAudience: 'users',
          targetUserIds: [currentUser.id]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch test');
      toast.success(data.message || 'Test push alert dispatched to your device!');
      await fetchPushStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch test notification');
    } finally {
      setSendingPush(false);
    }
  };

  const handleDelayedLockScreenTest = () => {
    let secondsLeft = 5;
    setCountdown(secondsLeft);
    toast.info('Lock your phone or exit Chrome now! Notification will pop in 5 seconds...');

    const timer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft > 0) {
        setCountdown(secondsLeft);
      } else {
        clearInterval(timer);
        setCountdown(null);
        handleSendTestToThisDevice();
      }
    }, 1000);
  };

  const runPushDiagnostic = async () => {
    setRunningDiagnostic(true);
    setDiagnosticOpen(true);
    const logs: { step: string; status: 'ok' | 'fail' | 'warn' | 'info'; detail: string }[] = [];

    const addLog = (step: string, status: 'ok' | 'fail' | 'warn' | 'info', detail: string) => {
      logs.push({ step, status, detail });
      setDiagnosticLogs([...logs]);
    };

    // Step 1: Check browser support
    const hasSW = 'serviceWorker' in navigator;
    const hasNotification = typeof window !== 'undefined' && 'Notification' in window;
    const hasPushManager = typeof window !== 'undefined' && 'PushManager' in window;

    if (!hasSW || !hasNotification || !hasPushManager) {
      addLog('Browser Push API', 'fail', 'This browser does not support Web Push notifications.');
      setRunningDiagnostic(false);
      return;
    }
    addLog('Browser Push API', 'ok', 'ServiceWorker, Notification & PushManager APIs supported.');

    // Step 2: Check Notification Permission
    const perm = Notification.permission;
    if (perm === 'granted') {
      addLog('Browser Permission', 'ok', 'Permission is GRANTED in Chrome.');
    } else if (perm === 'denied') {
      addLog('Browser Permission', 'fail', 'Permission is BLOCKED in Chrome. Tap the lock/tune icon near the URL bar in Chrome to reset permissions.');
      setRunningDiagnostic(false);
      return;
    } else {
      addLog('Browser Permission', 'info', 'Permission is unprompted. Requesting permission now...');
      const requested = await Notification.requestPermission();
      if (requested !== 'granted') {
        addLog('Browser Permission', 'fail', 'Notification permission was denied or dismissed.');
        setRunningDiagnostic(false);
        return;
      }
      addLog('Browser Permission', 'ok', 'Permission successfully GRANTED!');
    }

    // Step 3: Register / Update Service Worker
    let reg: ServiceWorkerRegistration | null | undefined = null;
    try {
      addLog('Service Worker', 'info', 'Checking active service worker registration...');
      reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/arcade-sw.js?v=6', { scope: '/', updateViaCache: 'none' });
      } else {
        await reg.update().catch(() => {});
      }
      reg = await navigator.serviceWorker.ready;
      addLog('Service Worker', 'ok', `Service worker is ready & active (Scope: ${reg.scope}).`);
    } catch (swErr: any) {
      addLog('Service Worker', 'fail', `Service worker error: ${swErr.message}`);
      setRunningDiagnostic(false);
      return;
    }

    // Step 4: Check Subscription State
    try {
      addLog('Device Subscription', 'info', 'Verifying device push subscription in browser...');
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        addLog('Device Subscription', 'warn', 'Device not registered yet. Subscribing now...');
        const subRes = await subscribeToPush(token);
        if (!subRes.success) {
          addLog('Device Subscription', 'fail', `Failed to subscribe: ${subRes.error}`);
          setRunningDiagnostic(false);
          return;
        }
        setIsThisDeviceSubscribed(true);
        addLog('Device Subscription', 'ok', 'Successfully registered device endpoint with DataVerse server!');
      } else {
        setIsThisDeviceSubscribed(true);
        addLog('Device Subscription', 'ok', 'Device is actively registered in push_subscriptions database.');
      }
    } catch (subErr: any) {
      addLog('Device Subscription', 'fail', `Subscription check failed: ${subErr.message}`);
    }

    // Step 5: Direct Local Notification Test
    try {
      addLog('Direct Pop-up Test', 'info', 'Triggering direct on-device notification banner...');
      await reg.showNotification('DataVerse Diagnostic Pop-up 🔔', {
        body: 'If you see this banner, native notifications are fully functional on your phone!',
        icon: '/logo.png',
        tag: 'diag-' + Date.now(),
        requireInteraction: true,
        data: { url: 'https://dataverse.datalexcloud.tech' }
      });
      addLog('Direct Pop-up Test', 'ok', 'Direct showNotification call succeeded! Check top of your phone screen.');
    } catch (directErr: any) {
      addLog('Direct Pop-up Test', 'fail', `Local showNotification failed: ${directErr.message}`);
    }

    // Step 6: Remote FCM Broadcast Test
    if (currentUser?.id) {
      try {
        addLog('Remote FCM Cloud Dispatch', 'info', 'Dispatching live test from Cloudflare API to Google FCM...');
        const res = await fetch('/api/push/admin/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: 'DataVerse Cloud Alert 🚀',
            body: `Hi @${currentUser.username}, remote cloud push dispatched successfully!`,
            url: 'https://dataverse.datalexcloud.tech',
            targetAudience: 'users',
            targetUserIds: [currentUser.id]
          })
        });
        const data = await res.json();
        if (res.ok && data.successCount > 0) {
          addLog('Remote FCM Cloud Dispatch', 'ok', `Google FCM accepted push (Status: 201 Created).`);
        } else {
          addLog('Remote FCM Cloud Dispatch', 'warn', data.message || 'Dispatch completed with 0 devices.');
        }
      } catch (fcmErr: any) {
        addLog('Remote FCM Cloud Dispatch', 'fail', `Remote dispatch error: ${fcmErr.message}`);
      }
    }

    await fetchPushStats();
    setRunningDiagnostic(false);
  };

  const handleResolveReport = (reportId: string) => {
    if (!token) return;
    setConfirmDialog({
      title: "Resolve Safety Report?",
      description: "This report will be marked as resolved and permanently cleared from the moderation queue.",
      actionLabel: "Resolve Report",
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/users/admin/reports/${reportId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setReports(prev => prev.filter(r => r.id !== reportId));
            toast.success('Report resolved and cleared from moderation queue.');
          } else {
            const errData = await res.json();
            toast.error(errData.error || 'Failed to resolve report');
          }
        } catch (err) {
          console.error(err);
          toast.error('Network error resolving report');
        }
      }
    });
  };

  const handleExecuteReportAction = async () => {
    if (!reportActionTarget || !token) return;
    setExecutingReportAction(true);
    try {
      const res = await fetch(`/api/users/admin/reports/${reportActionTarget.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: reportActionType,
          targetUserId: reportActionTarget.reported_user_id,
          durationMinutes: reportActionDuration,
          reason: reportActionReason.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute moderation action');
      }

      toast.success(data.message || 'Moderation action applied and report resolved.');
      setReports(prev => prev.filter(r => r.id !== reportActionTarget.id));
      setReportActionTarget(null);
      fetchUsers().catch(() => {});
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while enforcing action.');
    } finally {
      setExecutingReportAction(false);
    }
  };

  const handleDeleteUser = (targetUser: SystemUser) => {
    if (!token) return;
    if (targetUser.id === currentUser?.id) {
      toast.error('Cannot delete yourself.');
      return;
    }
    setConfirmDialog({
      title: `Delete Account @${targetUser.username}?`,
      description: "Permanently purge this user account, their posts, comments, media, and credentials from the database. This action cannot be undone.",
      actionLabel: "Permanently Delete",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/users/admin/users/${targetUser.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
            setUsers(prev => prev.filter(u => u.id !== targetUser.id));
            toast.success(data.message || 'User account permanently removed.');
          } else {
            toast.error(data.error || 'Failed to remove user account');
          }
        } catch (err) {
          toast.error('Network error removing user');
        }
      }
    });
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !notifText.trim()) return;

    setSendingNotif(true);
    setNotifSuccess(false);
    try {
      const res = await fetch('/api/users/broadcast-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: selectedUserForNotif,
          text: notifText.trim(),
          senderType
        })
      });

      if (res.ok) {
        setNotifSuccess(true);
        setNotifText('');
        toast.success(selectedUserForNotif === 'all' ? 'Broadcast notification dispatched.' : 'Targeted notification sent.');
        setTimeout(() => setNotifSuccess(false), 3000);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to send notification');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to send notification');
    } finally {
      setSendingNotif(false);
    }
  };

  const handleApplyRestriction = async (userId: string, minutes: number) => {
    if (!token) return;

    setApplyingRestriction(true);
    setRestrictSuccess(false);
    try {
      const res = await fetch(`/api/users/${userId}/chat-restrict`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          minutes,
          senderType: restrictSenderType
        })
      });

      if (res.ok) {
        setRestrictSuccess(true);
        await fetchUsers();
        toast.success(`Chat restriction applied for ${minutes} minutes.`);
        setTimeout(() => setRestrictSuccess(false), 3000);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to update chat restriction');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update chat restriction');
    } finally {
      setApplyingRestriction(false);
    }
  };

  const loadDashboardData = async () => {
    if (!token) {
      setSessionExpired(true);
      return;
    }
    setLoading(true);
    setError(null);
    setIsSlowNetwork(false);

    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      setIsSlowNetwork(true);
    }, 3500);

    try {
      if (activeTab === 'users' || activeTab === 'restrictions' || activeTab === 'verifications') {
        await fetchUsers();
        if (currentUser?.is_admin || currentUser?.is_top_admin) {
          fetchReports().catch(() => {});
        }
      } else if (activeTab === 'reports') {
        await fetchReports();
      } else if (activeTab === 'push') {
        await fetchPushStats();
        checkDevicePushSubscribed().then(setIsThisDeviceSubscribed).catch(() => {});
        if (users.length === 0) {
          fetchUsers().catch(() => {});
        }
      } else if (activeTab === 'media') {
        await fetchAdminMedia();
      } else {
        await fetchConvos();
      }
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setLoading(false);
      setIsSlowNetwork(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeTab, token]);

  // Real-time debounced filter updates for Media Hub
  useEffect(() => {
    if (activeTab !== 'media') return undefined;
    const timer = setTimeout(() => {
      fetchAdminMedia();
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab, mediaUserSearch, mediaStatusFilter, mediaTypeFilter, mediaSourceFilter]);

  // Load audit chat history
  const loadAuditHistory = async (convo: SystemConvo) => {
    if (!token) return;
    setAuditingConvo(convo);
    setLoadingAudit(true);
    setAuditMessages([]);

    try {
      const res = await fetch(`/api/conversations/global/${convo.id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Audit history fetch error:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Toggles User Verification
  const handleToggleVerify = async (targetUser: SystemUser) => {
    if (!token) return;
    const nextState = !targetUser.is_verified;
    
    // Optimistic UI
    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_verified: nextState } : u));

    try {
      const res = await fetch(`/api/users/${targetUser.id}/verify-admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_verified: nextState })
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert state
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_verified: !nextState } : u));
    }
  };

  // Handles Approve/Reject Verification Request (Top Admin only)
  const handleReviewVerification = async (targetUser: SystemUser, approved: boolean) => {
    if (!token) return;
    
    // Optimistic UI update
    setUsers(prev => prev.map(u => u.id === targetUser.id ? { 
      ...u, 
      is_verified: approved,
      verification_status: approved ? 'approved' : 'rejected'
    } : u));

    try {
      const res = await fetch(`/api/users/${targetUser.id}/verify-admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          is_verified: approved,
          verification_status: approved ? 'approved' : 'rejected'
        })
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert state
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { 
        ...u, 
        is_verified: targetUser.is_verified,
        verification_status: targetUser.verification_status 
      } : u));
    }
  };

  // Toggles User Admin Rights
  const handleToggleAdmin = async (targetUser: SystemUser) => {
    if (!token) return;
    const nextState = !targetUser.is_admin;

    // Optimistic UI
    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_admin: nextState } : u));

    try {
      const res = await fetch(`/api/users/${targetUser.id}/admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_admin: nextState })
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert state
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_admin: !nextState } : u));
    }
  };

  // Toggles User Block Status
  const handleToggleBlock = async (targetUser: SystemUser) => {
    if (!token) return;
    if (targetUser.id === currentUser?.id) {
      toast.error('Cannot block yourself.');
      return;
    }
    const nextState = !targetUser.is_blocked;

    // Optimistic UI
    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_blocked: nextState } : u));

    try {
      const res = await fetch(`/api/users/${targetUser.id}/block`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_blocked: nextState })
      });
      if (!res.ok) throw new Error();
      toast.success(nextState ? `Blocked @${targetUser.username}` : `Unblocked @${targetUser.username}`);
    } catch {
      // Revert state
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_blocked: !nextState } : u));
      toast.error(`Failed to update block status for @${targetUser.username}`);
    }
  };

  // Reset User Two-Factor Authentication (Admin / Top Admin)
  const handleReset2FA = (targetUser: SystemUser) => {
    if (!token) return;
    setConfirmDialog({
      title: `Reset 2FA for @${targetUser.username}?`,
      description: "This will disable Two-Factor Authentication and allow the user to sign in with their password.",
      actionLabel: "Reset 2FA",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/users/${targetUser.id}/2fa/reset`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to reset 2FA');
          }
          setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, has_2fa: false } : u));
          toast.success(`2FA reset successfully for @${targetUser.username}`);
        } catch (err: any) {
          toast.error(err.message || 'Error resetting 2FA');
        }
      }
    });
  };

  const getCleanLabel = (convo: SystemConvo) => {
    if (convo.is_group) return `Group Chat (ID: ${convo.id.substring(0, 8)})`;
    if (convo.members.length === 0) return 'Empty Chat';
    if (convo.members.length === 1) return `${convo.members[0].display_name || convo.members[0].username} (Self)`;
    return convo.members.map(m => m.display_name || m.username).join(' & ');
  };

  const renderTableSkeleton = () => (
    <div className="space-y-3" aria-busy="true" aria-label="Loading directory records">
      <div className="glass-card rounded-3xl overflow-hidden border border-[var(--line)] bg-[var(--card)] shadow-xl p-4 sm:p-6 space-y-4 animate-pulse">
        {[1, 2, 3, 4].map(idx => (
          <div key={idx} className="flex items-center justify-between py-3 border-b border-[var(--line)]/50 last:border-b-0">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[var(--input)] shrink-0" />
              <div className="space-y-1.5">
                <div className="w-32 h-3.5 bg-[var(--input)] rounded-md" />
                <div className="w-20 h-2.5 bg-[var(--input)]/60 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-7 rounded-lg bg-[var(--input)]" />
              <div className="w-16 h-7 rounded-lg bg-[var(--input)]/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // State 7: Permission Denied State with Clear Remediation & Way Back
  if ((currentUser?.is_admin !== true && currentUser?.is_top_admin !== true) || previewState === 'unauthorized') {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-5 select-none animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-[var(--text)]">Administrator Access Required</h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            This console is reserved exclusively for verified DataVerse administrators to audit platform security, user accounts, and moderation flags.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('feed') : (window.location.hash = '')}
            className="w-full min-h-[44px] py-2.5 px-5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-bold rounded-full shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Feed</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('profile') : null}
            className="w-full min-h-[44px] py-2.5 px-5 bg-[var(--input)] border border-[var(--line)] hover:bg-[var(--hover)] text-[var(--text)] text-xs font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4 text-[var(--accent-2)]" />
            <span>Your Profile</span>
          </button>
        </div>
      </div>
    );
  }

/* THEME START */
  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-6 sm:pt-8 pb-32 sm:pb-12 space-y-6 sm:space-y-8 animate-fade-in select-none min-w-0 overflow-x-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, var(--glow) 0%, transparent 70%)' }}>
      
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-6 w-full min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border border-[var(--line)] flex items-center justify-center text-[var(--accent-2)] flex-shrink-0">
            <Shield className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-[var(--text)] tracking-wide uppercase truncate">Admin Console</h1>
            <p className="text-[10px] text-[var(--muted)] mt-0.5 line-clamp-2">Global DataVerse platform directory and message logs audit system.</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="relative w-full min-w-0 max-w-full">
          <div role="tablist" aria-label="Admin Console Sections" className="flex items-center gap-2 w-full min-w-0 max-w-full overflow-x-auto scrollbar-none pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth touch-pan-x">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            className={`shrink-0 whitespace-nowrap py-2 px-4 sm:py-2.5 sm:px-5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] border border-transparent'
                : 'bg-[color-mix(in_srgb,var(--card)_80%,transparent)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] hover:border-[var(--card-border)]'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Users
          </button>
          {currentUser?.is_top_admin && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'chats'}
              onClick={() => setActiveTab('chats')}
              className={`shrink-0 whitespace-nowrap py-2 px-4 sm:py-2.5 sm:px-5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'chats'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] border border-transparent'
                  : 'bg-[color-mix(in_srgb,var(--card)_80%,transparent)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] hover:border-[var(--card-border)]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Chats
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'restrictions'}
            onClick={() => setActiveTab('restrictions')}
            className={`shrink-0 whitespace-nowrap py-2 px-4 sm:py-2.5 sm:px-5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'restrictions'
                ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] border border-transparent'
                : 'bg-[color-mix(in_srgb,var(--card)_80%,transparent)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] hover:border-[var(--card-border)]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Restrictions
          </button>
          {(currentUser?.is_admin || currentUser?.is_top_admin) && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'push'}
              onClick={() => setActiveTab('push')}
              className={`shrink-0 whitespace-nowrap py-2 px-4 sm:py-2.5 sm:px-5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'push'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] border border-transparent'
                  : 'bg-[color-mix(in_srgb,var(--card)_80%,transparent)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] hover:border-[var(--card-border)]'
              }`}
            >
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--accent-2)]" />
              Push Alerts
            </button>
          )}
          {(currentUser?.is_admin || currentUser?.is_top_admin) && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'reports'}
              onClick={() => setActiveTab('reports')}
              className={`shrink-0 whitespace-nowrap py-2 px-4 sm:py-2.5 sm:px-5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'reports'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] border border-transparent'
                  : 'bg-[color-mix(in_srgb,var(--card)_80%,transparent)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] hover:border-[var(--card-border)]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Reports</span>
              {reports.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {reports.length}
                </span>
              )}
            </button>
          )}
          {currentUser?.is_top_admin && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'media'}
              onClick={() => setActiveTab('media')}
              className={`shrink-0 whitespace-nowrap py-2 px-4 sm:py-2.5 sm:px-5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'media'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] border border-transparent'
                  : 'bg-[color-mix(in_srgb,var(--card)_80%,transparent)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] hover:border-[var(--card-border)]'
              }`}
            >
              <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--accent-2)]" />
              <span>Media Platform</span>
              {adminMediaCounts.total > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent-2)] border border-[color-mix(in_srgb,var(--accent-2)_30%,transparent)]">
                  {adminMediaCounts.total}
                </span>
              )}
            </button>
          )}
          {currentUser?.is_top_admin && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'verifications'}
              onClick={() => setActiveTab('verifications')}
              className={`shrink-0 whitespace-nowrap py-2 px-4 sm:py-2.5 sm:px-5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'verifications'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] border border-transparent'
                  : 'bg-[color-mix(in_srgb,var(--card)_80%,transparent)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] hover:border-[var(--card-border)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Verifications
            </button>
          )}
          </div>
          {/* Subtle scroll gradient cue on mobile to signal horizontal swipe */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[var(--bg)] to-transparent sm:hidden" />
        </div>
      </div>
      {/* THEME END */}

      {/* State 4: Offline Notification Banner */}
      {isOffline && (
        <div 
          role="alert"
          aria-live="polite"
          className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl flex items-center justify-between text-xs animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Offline: Platform administrative actions are paused. Showing cached records.</span>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
          >
            Check Connection
          </button>
        </div>
      )}

      {/* State 5: Slow Network Indicator */}
      {isSlowNetwork && !isOffline && (
        <div 
          role="status"
          aria-live="polite"
          className="p-3.5 bg-[var(--accent)]/10 border border-[var(--accent-2)]/30 text-[var(--accent-2)] rounded-2xl flex items-center gap-2 text-xs animate-fade-in"
        >
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>Fetching directory records from D1 database... Please keep this page open.</span>
        </div>
      )}

      {/* State 3: Error Banner with Direct Remediation */}
      {error && (
        <div 
          role="alert"
          aria-live="assertive"
          className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-2xl flex items-center justify-between animate-fade-in"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Database Query Error</p>
              <p className="text-red-300/80 mt-0.5">{error}. Check authentication token or server connectivity.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* State 2: Loading Skeleton Shape */}
      {(loading || previewState === 'loading') ? (
        renderTableSkeleton()
      ) : (
        <>
          {/* TAB: USERS DIRECTORY */}
          {/* TAB: USERS DIRECTORY */}
          {activeTab === 'users' && (() => {
            const filteredUsers = users.filter(u => {
              const query = searchUserQuery.toLowerCase().trim();
              if (!query) return true;
              return (
                u.username.toLowerCase().includes(query) ||
                (u.display_name || '').toLowerCase().includes(query)
              );
            });

            return (
              <div className="space-y-4">
                
                {/* Search filter bar */}
                <div className="relative">
                  <label htmlFor="admin-search-users-input" className="sr-only">Search users</label>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
                  <input
                    id="admin-search-users-input"
                    type="text"
                    placeholder="Search users..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    className="w-full bg-[#060608]/40 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-[var(--muted)] focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="text-center py-16 px-4 text-xs font-semibold glass-card rounded-3xl border border-[var(--line)] bg-[var(--card)] space-y-3">
                    <Users className="w-8 h-8 text-[var(--muted)] mx-auto opacity-50" />
                    <div>
                      <p className="text-[var(--text)] font-bold">
                        {searchUserQuery ? `No users matching "${searchUserQuery}"` : "User directory is empty"}
                      </p>
                      <p className="text-[var(--muted)] mt-1 font-normal max-w-sm mx-auto">
                        {searchUserQuery 
                          ? "Check your spelling or search by user ID or handle." 
                          : "New registered accounts will appear here automatically."}
                      </p>
                    </div>
                    {searchUserQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchUserQuery('')}
                        className="px-4 py-2 bg-[var(--input)] hover:bg-[var(--hover)] text-[var(--text)] border border-[var(--line)] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Clear Search Filter
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* AVATAR FIX START */}
                    {/* Desktop View (CSS Grid Table) */}
                    <div className="hidden md:block glass-card rounded-3xl overflow-hidden border border-[var(--line)] bg-[var(--card)] shadow-xl">
                      {/* Header */}
                      <div className="grid grid-cols-[44px_minmax(0,1fr)_auto_auto] items-center gap-[14px] px-6 py-4 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--side)_90%,transparent)] text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                        <div></div>
                        <div>User</div>
                        <div className="text-center min-w-[90px]">Status</div>
                        <div className="text-right min-w-[130px]">Actions</div>
                      </div>

                      {/* User rows */}
                      <div className="divide-y divide-[var(--line)]">
                        {filteredUsers.map(u => (
                          <div 
                            key={u.id} 
                            className="grid grid-cols-[44px_minmax(0,1fr)_auto_auto] items-center gap-[14px] px-6 h-[72px] min-h-[72px] max-h-[72px] hover:bg-[var(--hover)] transition-colors"
                          >
                            {/* Avatar container (photo OR initials) is always 44px fixed circle */}
                            <AdminAvatar avatarUrl={u.avatar_url} name={u.username} size={44} />

                            {/* Name + Handle (1fr, min-width: 0) with single-line ellipsis */}
                            <div className="min-w-0 pr-2">
                              <h5 className="font-extrabold text-sm text-[var(--text)] flex items-center gap-1.5 truncate">
                                <span className="truncate">{u.display_name || u.username}</span>
                                {!!u.is_verified && <VerifiedBadge size={13} className="flex-shrink-0" />}
                              </h5>
                              <p className="text-xs text-[var(--muted)] truncate">@{u.username}</p>
                            </div>

                            {/* Status badge (auto) */}
                            <div className="flex justify-center items-center min-w-[90px]">
                              {u.is_top_admin && (
                                <span className="text-[9px] font-black text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                                  Top Admin
                                </span>
                              )}
                              {u.is_admin && !u.is_top_admin && (
                                <span className="text-[9px] font-black text-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent-2)_14%,transparent)] border border-[color-mix(in_srgb,var(--accent-2)_30%,transparent)] px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                                  Admin
                                </span>
                              )}
                              {u.is_blocked && (
                                <span className="text-[9px] font-black text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                                  Blocked
                                </span>
                              )}
                              {!u.is_admin && !u.is_blocked && (
                                <span className="text-[9px] font-black text-[var(--muted)] bg-[var(--input)] border border-[var(--line)] px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                                  Member
                                </span>
                              )}
                              {!!u.has_2fa && (
                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap ml-1.5 inline-flex items-center gap-1">
                                  <Shield className="w-2.5 h-2.5" /> 2FA
                                </span>
                              )}
                            </div>

                            {/* Action buttons (auto) - 40x40 rounded buttons */}
                            <div className="flex items-center gap-2 justify-end min-w-[130px]">
                              {/* Reset 2FA */}
                              {!!u.has_2fa && (
                                <button
                                  onClick={() => handleReset2FA(u)}
                                  aria-label="Reset user 2FA"
                                  title="Reset 2FA (Emergency Recovery)"
                                  className="admin-action-btn !text-amber-400 !border-amber-400/40 !bg-[color-mix(in_srgb,var(--gold)_14%,var(--input))]"
                                >
                                  <ShieldAlert className="w-4 h-4" />
                                </button>
                              )}

                              {/* Toggle Verification */}
                              {currentUser?.is_top_admin && (
                                <button
                                  onClick={() => handleToggleVerify(u)}
                                  aria-label={u.is_verified ? "Remove verified badge" : "Grant verified badge"}
                                  title="Toggle Verified badge"
                                  className={`admin-action-btn ${
                                    u.is_verified
                                      ? '!text-[var(--accent-2)] !border-[var(--accent-2)]/40 !bg-[color-mix(in_srgb,var(--accent-2)_14%,var(--input))]'
                                      : ''
                                  }`}
                                >
                                  <Sparkles className="w-4 h-4" />
                                </button>
                              )}

                              {/* Toggle Admin Privilege (Disabled if target is the Top Admin) */}
                              {currentUser?.is_top_admin && (
                                <button
                                  onClick={() => handleToggleAdmin(u)}
                                  disabled={u.is_top_admin}
                                  aria-label={u.is_admin ? "Revoke admin rights" : "Grant admin rights"}
                                  title="Toggle Admin Rights"
                                  className={`admin-action-btn ${
                                    u.is_top_admin
                                      ? 'opacity-40 cursor-not-allowed'
                                      : u.is_admin
                                      ? '!text-[var(--gold)] !border-[var(--gold)]/40 !bg-[color-mix(in_srgb,var(--gold)_14%,var(--input))]'
                                      : ''
                                  }`}
                                >
                                  <Shield className="w-4 h-4" />
                                </button>
                              )}

                              {/* Toggle Block Account */}
                              <button
                                onClick={() => handleToggleBlock(u)}
                                disabled={u.id === currentUser?.id || u.is_top_admin}
                                aria-label={u.is_blocked ? "Unblock account" : "Remove or block user"}
                                title="Toggle Block Account"
                                className={`admin-action-btn btn-remove ${
                                  u.id === currentUser?.id || u.is_top_admin
                                    ? 'opacity-40 cursor-not-allowed'
                                    : u.is_blocked
                                    ? '!text-[var(--danger)] !border-[var(--danger)]/40 !bg-[color-mix(in_srgb,var(--danger)_14%,var(--input))]'
                                    : ''
                                }`}
                              >
                                {u.is_blocked ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                              </button>

                              {/* Delete / Remove User Account Permanently */}
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={u.id === currentUser?.id || u.is_top_admin}
                                aria-label="Delete user account"
                                title="Permanently Delete Account"
                                className={`admin-action-btn ${
                                  u.id === currentUser?.id || u.is_top_admin
                                    ? 'opacity-40 cursor-not-allowed'
                                    : 'hover:!text-rose-400 hover:!border-rose-500/40 hover:!bg-rose-500/10'
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mobile View (Single-line Rows below 768px: avatar | name and handle | actions) */}
                    <div className="md:hidden glass-card rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--card)] shadow-md divide-y divide-[var(--line)] w-full min-w-0">
                      {filteredUsers.map(u => (
                        <div 
                          key={u.id} 
                          className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-3 min-h-[72px] hover:bg-[var(--hover)] transition-colors w-full min-w-0"
                        >
                          {/* Col 1: Avatar (44px) */}
                          <AdminAvatar avatarUrl={u.avatar_url} name={u.username} size={44} />

                          {/* Col 2: Name + Handle with Role badge as small pill under handle */}
                          <div className="min-w-0 pr-1 flex flex-col justify-center">
                            <h5 className="font-extrabold text-xs text-[var(--text)] flex items-center gap-1 truncate leading-tight">
                              <span className="truncate">{u.display_name || u.username}</span>
                              {!!u.is_verified && <VerifiedBadge size={11} className="flex-shrink-0" />}
                            </h5>
                            <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                              <span className="text-[10px] text-[var(--muted)] truncate max-w-[85px] xs:max-w-[130px]">
                                @{u.username}
                              </span>
                              {u.is_top_admin && (
                                <span className="flex-shrink-0 text-[8px] font-black text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] px-1.5 py-0.2 rounded-full uppercase tracking-wider leading-none">
                                  Top Admin
                                </span>
                              )}
                              {u.is_admin && !u.is_top_admin && (
                                <span className="flex-shrink-0 text-[8px] font-black text-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent-2)_14%,transparent)] border border-[color-mix(in_srgb,var(--accent-2)_30%,transparent)] px-1.5 py-0.2 rounded-full uppercase tracking-wider leading-none">
                                  Admin
                                </span>
                              )}
                              {u.is_blocked && (
                                <span className="flex-shrink-0 text-[8px] font-black text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] px-1.5 py-0.2 rounded-full uppercase tracking-wider leading-none">
                                  Blocked
                                </span>
                              )}
                              {!u.is_admin && !u.is_blocked && (
                                <span className="flex-shrink-0 text-[8px] font-black text-[var(--muted)] bg-[var(--input)] border border-[var(--line)] px-1.5 py-0.2 rounded-full uppercase tracking-wider leading-none">
                                  Member
                                </span>
                              )}
                              {!!u.has_2fa && (
                                <span className="flex-shrink-0 text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full uppercase tracking-wider leading-none">
                                  2FA
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Col 3: Actions (Buttons at least 40px with 8px gaps) */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Reset 2FA */}
                            {!!u.has_2fa && (
                              <button
                                onClick={() => handleReset2FA(u)}
                                aria-label="Reset user 2FA"
                                title="Reset 2FA"
                                className="admin-action-btn !text-amber-400 !border-amber-400/40 !bg-[color-mix(in_srgb,var(--gold)_14%,var(--input))]"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>
                            )}

                            {/* Toggle Verification */}
                            {currentUser?.is_top_admin && (
                              <button
                                onClick={() => handleToggleVerify(u)}
                                aria-label={u.is_verified ? "Remove verified badge" : "Grant verified badge"}
                                title="Toggle Verification"
                                className={`admin-action-btn ${
                                  u.is_verified
                                    ? '!text-[var(--accent-2)] !border-[var(--accent-2)]/40 !bg-[color-mix(in_srgb,var(--accent-2)_14%,var(--input))]'
                                    : ''
                                }`}
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                            )}

                            {/* Toggle Admin */}
                            {currentUser?.is_top_admin && (
                              <button
                                onClick={() => handleToggleAdmin(u)}
                                disabled={u.is_top_admin}
                                aria-label={u.is_admin ? "Revoke admin rights" : "Grant admin rights"}
                                title="Toggle Admin Rights"
                                className={`admin-action-btn ${
                                  u.is_top_admin
                                    ? 'opacity-40 cursor-not-allowed'
                                    : u.is_admin
                                    ? '!text-[var(--gold)] !border-[var(--gold)]/40 !bg-[color-mix(in_srgb,var(--gold)_14%,var(--input))]'
                                    : ''
                                }`}
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                            )}

                            {/* Toggle Block */}
                            <button
                              onClick={() => handleToggleBlock(u)}
                              disabled={u.id === currentUser?.id || u.is_top_admin}
                              aria-label={u.is_blocked ? "Unblock user" : "Remove or block user"}
                              title="Toggle Block Account"
                              className={`admin-action-btn btn-remove ${
                                u.id === currentUser?.id || u.is_top_admin
                                  ? 'opacity-40 cursor-not-allowed'
                                  : u.is_blocked
                                  ? '!text-[var(--danger)] !border-[var(--danger)]/40 !bg-[color-mix(in_srgb,var(--danger)_14%,var(--input))]'
                                  : ''
                              }`}
                            >
                              {u.is_blocked ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                            </button>

                            {/* Delete User */}
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={u.id === currentUser?.id || u.is_top_admin}
                              aria-label="Delete user account"
                              title="Permanently Delete Account"
                              className={`admin-action-btn ${
                                u.id === currentUser?.id || u.is_top_admin
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'hover:!text-rose-400 hover:!border-rose-500/40 hover:!bg-rose-500/10'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* AVATAR FIX END */}
                  </>

                )}
              </div>
            );
          })()}

          {/* TAB: GLOBAL CHATS AUDITING */}
          {activeTab === 'chats' && currentUser?.is_top_admin && (
            <div className="grid grid-cols-1 gap-4">
              {convos.length === 0 ? (
                <div className="text-center py-16 px-4 text-xs font-semibold glass-card rounded-3xl border border-[var(--line)] bg-[var(--card)] space-y-3">
                  <Archive className="w-8 h-8 text-[var(--muted)] mx-auto opacity-50" />
                  <div>
                    <p className="text-[var(--text)] font-bold">No Active System Conversations</p>
                    <p className="text-[var(--muted)] mt-1 font-normal max-w-sm mx-auto">
                      All platform direct messages and group chats appear here for security auditing once users exchange messages.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadDashboardData}
                    className="px-4 py-2 bg-[var(--input)] hover:bg-[var(--hover)] text-[var(--text)] border border-[var(--line)] rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Audit Logs</span>
                  </button>
                </div>
              ) : (
                convos.map(c => (
                  <div 
                    key={c.id}
                    className="glass-card p-5 rounded-3xl border border-white/5 bg-[#060608]/40 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-950 border border-slate-900 px-2 py-0.5 rounded-full select-none">
                          {c.is_group ? 'Group' : 'DM'}
                        </span>
                        <h4 className="text-xs font-extrabold text-white">{getCleanLabel(c)}</h4>
                        {c.is_deleted && (
                          <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/10 select-none">
                            Deleted by User
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate max-w-md">
                        {c.last_message ? `Last message: "${c.last_message.body}"` : 'No messages yet.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => loadAuditHistory(c)}
                        className="flex-1 sm:flex-none py-2.5 px-4 bg-brand-650 hover:bg-brand-550 text-white text-[10px] font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/5 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Audit
                      </button>
                      <button
                        onClick={() => handleRemoveChatFromAdmin(c.id)}
                        className="py-2.5 px-3 bg-amber-500/10 hover:bg-amber-600 text-amber-500 hover:text-black border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-[0.97] flex items-center justify-center"
                        title="Hide / Clear Audit Logs"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: RESTRICTIONS & NOTIFICATIONS */}
          {activeTab === 'restrictions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
              
              {/* Box 1: Broadcast Notifications */}
              <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 bg-[#060608]/40 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/[0.03] pb-3">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Broadcast Notifications</h4>
                </div>
                <form onSubmit={handleSendNotification} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label htmlFor="admin-filter-notif-user" className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wide">Target Recipient</label>
                    <input
                      id="admin-filter-notif-user"
                      type="text"
                      placeholder="Filter by username..."
                      aria-label="Filter recipient by username"
                      value={searchNotifUser}
                      onChange={(e) => setSearchNotifUser(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-900 rounded-xl px-3 py-1.5 text-[11px] text-slate-200 outline-none focus:border-brand-500 transition-all placeholder:text-[var(--muted)]"
                    />
                    <label htmlFor="admin-select-notif-user" className="sr-only">Choose Target Recipient</label>
                    <select
                      id="admin-select-notif-user"
                      value={selectedUserForNotif}
                      onChange={(e) => setSelectedUserForNotif(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-brand-500 transition-all"
                    >
                      <option value="all">📢 Broadcast to All Users</option>
                      {users.filter(u => {
                        const term = searchNotifUser.toLowerCase().trim();
                        if (!term) return true;
                        return u.username.toLowerCase().includes(term) || (u.display_name || '').toLowerCase().includes(term);
                      }).map(u => (
                        <option key={u.id} value={u.id}>@{u.username} ({u.display_name || 'No Display Name'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="admin-notif-sender-type" className="text-[9px] font-black text-[var(--muted)] tracking-wide">Sender Identity</label>
                    <select
                      id="admin-notif-sender-type"
                      value={senderType}
                      onChange={(e) => setSenderType(e.target.value as 'admin' | 'system')}
                      className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-brand-500 transition-all"
                    >
                      <option value="system">✨ DataVerse Official (System Identity & Logo)</option>
                      <option value="admin">👤 Personal Admin Identity (@{currentUser?.username || 'admin'})</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="admin-notif-text" className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wide">Message Text</label>
                    <textarea
                      id="admin-notif-text"
                      placeholder="Type notification alert..."
                      value={notifText}
                      onChange={(e) => setNotifText(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-[var(--muted)] outline-none focus:border-brand-500 transition-colors resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingNotif || !notifText.trim()}
                    className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {sendingNotif ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Send Notification'
                    )}
                  </button>
                  {notifSuccess && (
                    <p className="text-center text-[9px] font-bold text-emerald-500 animate-pulse">Notification broadcast successfully!</p>
                  )}
                </form>
              </div>

              {/* Box 2: Chat Restrictions */}
              <div className="space-y-4 sm:space-y-6">
                <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 bg-[#060608]/40 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/[0.03] pb-3">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Apply Chat Restriction</h4>
                  </div>
                  
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label htmlFor="admin-filter-restrict-user" className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wide">Select User</label>
                      <input
                        id="admin-filter-restrict-user"
                        type="text"
                        placeholder="Filter by username..."
                        aria-label="Filter user by username"
                        value={searchRestrictUser}
                        onChange={(e) => setSearchRestrictUser(e.target.value)}
                        className="w-full bg-[#060608]/40 border border-slate-900 rounded-xl px-3 py-1.5 text-[11px] text-slate-200 outline-none focus:border-brand-500 transition-all placeholder:text-[var(--muted)]"
                      />
                      <label htmlFor="admin-select-restrict-user" className="sr-only">Choose User for Restriction</label>
                      <select
                        id="admin-select-restrict-user"
                        value={selectedUserForRestrict}
                        onChange={(e) => setSelectedUserForRestrict(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-brand-500 transition-all"
                      >
                        <option value="">-- Choose User --</option>
                        {users.filter(u => {
                          if (u.id === currentUser?.id) return false;
                          const term = searchRestrictUser.toLowerCase().trim();
                          if (!term) return true;
                          return u.username.toLowerCase().includes(term) || (u.display_name || '').toLowerCase().includes(term);
                        }).map(u => (
                          <option key={u.id} value={u.id}>@{u.username} ({u.display_name || 'No Display Name'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="admin-restrict-duration" className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wide">Restriction Duration</label>
                      <select
                        id="admin-restrict-duration"
                        value={restrictDuration}
                        onChange={(e) => setRestrictDuration(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-brand-500 transition-all"
                      >
                        <option value={10}>10 Minutes</option>
                        <option value={60}>1 Hour</option>
                        <option value={720}>12 Hours</option>
                        <option value={1440}>24 Hours</option>
                        <option value={10080}>7 Days</option>
                        <option value={0}>❌ Remove Restrictions</option>
                      </select>
                    </div>

                    {restrictDuration > 0 && (
                      <div className="space-y-1.5 animate-fade-in">
                        <label htmlFor="admin-restrict-sender-type" className="text-[9px] font-black text-[var(--muted)] tracking-wide">Sender Identity</label>
                        <select
                          id="admin-restrict-sender-type"
                          value={restrictSenderType}
                          onChange={(e) => setRestrictSenderType(e.target.value as 'admin' | 'system')}
                          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-brand-500 transition-all"
                        >
                          <option value="system">✨ DataVerse Official (System Identity & Logo)</option>
                          <option value="admin">👤 Personal Admin Identity (@{currentUser?.username || 'admin'})</option>
                        </select>
                      </div>
                    )}

                    <button
                      onClick={() => handleApplyRestriction(selectedUserForRestrict, restrictDuration)}
                      disabled={applyingRestriction || !selectedUserForRestrict}
                      className="w-full py-2 bg-red-650 hover:bg-red-550 text-white text-[10px] font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {applyingRestriction ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : restrictDuration === 0 ? (
                        'Lift Restriction'
                      ) : (
                        'Restrict Access'
                      )}
                    </button>
                    {restrictSuccess && (
                      <p className="text-center text-[9px] font-bold text-emerald-500 animate-pulse">Restriction status updated successfully!</p>
                    )}
                  </div>
                </div>

                {/* Restricted Users List */}
                <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 bg-[#060608]/40 space-y-3.5">
                  <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/[0.03] pb-2.5">Currently Restricted Users</h5>
                  
                  {(() => {
                    const restrictedUsers = users.filter(u => u.chat_restricted_until && u.chat_restricted_until > Date.now());
                    if (restrictedUsers.length === 0) {
                      return (
                        <div className="text-center py-6 text-xs font-semibold rounded-2xl border border-[var(--line)] bg-[var(--card)] space-y-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                          <p className="text-[var(--text)] font-bold text-xs">No Active Restrictions</p>
                          <p className="text-[var(--muted)] text-[10px] font-normal">All user accounts currently have unrestricted messaging access.</p>
                        </div>
                      );
                    }

                    const getRemainingTimeStr = (untilMs: number) => {
                      const diffSec = Math.ceil((untilMs - Date.now()) / 1000);
                      if (diffSec <= 0) return 'Expired';
                      const diffMin = Math.ceil(diffSec / 60);
                      if (diffMin < 60) return `${diffMin}m left`;
                      const diffHours = Math.ceil(diffMin / 60);
                      if (diffHours < 24) return `${diffHours}h left`;
                      const diffDays = Math.ceil(diffHours / 24);
                      return `${diffDays}d left`;
                    };

                    return (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                        {restrictedUsers.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/[0.02]">
                            <div className="flex items-center gap-2 min-w-0">
                              {/* AVATAR FIX START */}
                              <AdminAvatar avatarUrl={u.avatar_url} name={u.username} size={32} />
                              {/* AVATAR FIX END */}
                              <div className="min-w-0">
                                <span className="text-[10px] font-extrabold text-white block truncate">@{u.username}</span>
                                <span className="text-[8px] text-red-500 font-bold block truncate">
                                  ⚠️ {getRemainingTimeStr(u.chat_restricted_until!)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleApplyRestriction(u.id, 0)}
                              className="py-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-200 text-[8px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer flex-shrink-0"
                            >
                              Lift
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          )}

          {/* TAB: PENDING VERIFICATIONS */}
          {activeTab === 'verifications' && (
            <div className="space-y-6 animate-fade-in select-none">
              <div>
                <h3 className="text-base font-black text-white tracking-wide uppercase">Pending Verifications</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Review and approve verification credentials submitted by premium subscribers.</p>
              </div>

              {users.filter(u => u.verification_status === 'pending').length === 0 ? (
                <div className="p-12 border border-[var(--line)] bg-[var(--card)] rounded-3xl text-center select-none space-y-2">
                  <Sparkles className="w-8 h-8 text-amber-400/70 mx-auto" />
                  <p className="text-xs text-[var(--text)] font-bold">No Pending Verification Requests</p>
                  <p className="text-[10px] text-[var(--muted)] max-w-sm mx-auto">
                    New creator badge submissions requiring document review will populate here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {users.filter(u => u.verification_status === 'pending').map(u => {
                    // Calculate remaining time for the card
                    const paidAt = Number(u.verification_paid_at || 0);
                    const deadline = paidAt + 3 * 24 * 60 * 60 * 1000;
                    const diff = deadline - Date.now();
                    const isExpired = diff <= 0;
                    
                    let remainingStr = 'Expired';
                    if (!isExpired) {
                      const hours = Math.floor(diff / (1000 * 60 * 60));
                      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                      remainingStr = `${hours}h ${mins}m remaining`;
                    }

                    return (
                      <div 
                        key={u.id} 
                        className="glass-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/5 bg-[#060608]/40 flex flex-col justify-between shadow-xl space-y-4 hover:border-white/[0.08] transition-all"
                      >
                        <div className="space-y-4">
                          {/* User Header */}
                          <div className="flex items-center gap-3">
                            {/* AVATAR FIX START */}
                            <AdminAvatar avatarUrl={u.avatar_url} name={u.username} size={44} />
                            {/* AVATAR FIX END */}
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-xs text-white truncate">{u.display_name || u.username}</h5>
                              <p className="text-[9px] text-slate-500 truncate">@{u.username} | {u.email}</p>
                            </div>
                          </div>

                          {/* Submission Details */}
                          <div className="border-t border-white/[0.03] pt-3.5 space-y-3">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-500 font-bold uppercase tracking-wider">Category</span>
                              <span className="text-brand-400 font-bold bg-brand-500/10 px-2 py-0.5 rounded-full">{u.verification_category}</span>
                            </div>

                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-500 font-bold uppercase tracking-wider">Timer Window</span>
                              <span className={`font-mono font-bold px-2 py-0.5 rounded-full ${isExpired ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                                {remainingStr}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Reason for Request</span>
                              <p className="text-[11px] text-slate-455 leading-relaxed italic bg-slate-950/40 p-2.5 rounded-xl border border-white/[0.02]">
                                "{u.verification_reason}"
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions and Document link */}
                        <div className="border-t border-white/[0.03] pt-4 space-y-3">
                          {u.verification_document_url ? (
                            <a 
                              href={`/api/media/file/${encodeURIComponent(u.verification_document_url)}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-350 hover:text-white text-[10px] font-black rounded-xl transition-all uppercase tracking-wider text-center block shadow-sm"
                            >
                              📄 View Supporting ID Document
                            </a>
                          ) : (
                            <div className="text-[10px] text-red-400 font-semibold text-center py-1">
                              ⚠️ No supporting document uploaded
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReviewVerification(u, false)}
                              className="flex-1 py-2.5 bg-slate-950 border border-red-500/20 hover:bg-red-950/20 text-red-400 text-[10px] font-black rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleReviewVerification(u, true)}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-xl transition-all uppercase tracking-wider shadow-md shadow-emerald-500/10 cursor-pointer"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: SAFETY REPORTS (ADMIN & TOP ADMIN) */}
          {activeTab === 'reports' && (currentUser?.is_admin || currentUser?.is_top_admin) && (
            <div className="space-y-6 animate-fade-in select-none">
              <div>
                <h3 className="text-base font-black text-white tracking-wide uppercase">Safety & Abuse Reports</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Review and resolve abuse reports submitted in-app by platform users.</p>
              </div>

              {reportsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                  <p className="text-xs">Loading safety queue...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="p-12 border border-[var(--line)] bg-[var(--card)] rounded-3xl text-center select-none space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/80 mx-auto" />
                  <p className="text-xs text-[var(--text)] font-bold">Safety Queue is Clean</p>
                  <p className="text-[10px] text-[var(--muted)] max-w-sm mx-auto">
                    Zero unresolved abuse or policy violation reports pending moderation review.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 animate-fade-in">
                  {reports.map((report) => (
                    <div 
                      key={report.id}
                      className="p-5 sm:p-6 rounded-3xl bg-[#060608]/40 border border-white/[0.03] flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3.5">
                        {/* Header details */}
                        <div className="flex flex-wrap items-start justify-between gap-2.5">
                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full inline-block">
                              {report.report_type.replace(/_/g, ' ')}
                            </span>
                            <div className="text-[11px] text-slate-400 font-bold">
                              Reported by: <span className="text-white">@{report.reporter_username}</span> {report.reporter_display_name ? `(${report.reporter_display_name})` : ''}
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-600 font-mono">
                            {new Date(report.created_at).toUTCString()}
                          </span>
                        </div>

                        {/* Reported user alert banner if present */}
                        {report.reported_username && (
                          <div className="p-3.5 bg-red-500/5 border border-red-500/10 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <AlertTriangle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
                              <div className="min-w-0">
                                <span className="text-[11px] font-extrabold text-red-400 block truncate">
                                  Reported Account: @{report.reported_username}
                                  {report.reported_display_name ? ` (${report.reported_display_name})` : ''}
                                </span>
                                {report.reported_user_id ? (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {report.reported_is_blocked === 1 ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                        Permanently Blocked / Banned
                                      </span>
                                    ) : report.reported_suspended_until && report.reported_suspended_until > Date.now() ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                        Suspended ({Math.ceil((report.reported_suspended_until - Date.now()) / (1000 * 60 * 60))}h remaining)
                                      </span>
                                    ) : report.reported_chat_restricted_until && report.reported_chat_restricted_until > Date.now() ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                        Chat Restricted ({Math.ceil((report.reported_chat_restricted_until - Date.now()) / (1000 * 60 * 60))}h remaining)
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        Active Account
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-500">Account not found or deleted</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Detailed Description */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Report Details</span>
                          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-4 rounded-2xl border border-white/[0.02] break-words whitespace-pre-wrap">
                            {report.description}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.03]">
                        <span className="text-[9px] text-slate-600 font-semibold font-mono">
                          ID: {report.id}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleResolveReport(report.id)}
                            className="py-2 px-3.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer border border-white/5"
                            title="Resolve and dismiss report without taking punitive action"
                          >
                            Mark Resolved
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReportActionTarget(report);
                              setReportActionType('chat_restrict');
                              setReportActionDuration(1440);
                              setReportActionReason(`Reported for ${report.report_type.replace(/_/g, ' ')}`);
                            }}
                            className="py-2 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-rose-600/20 flex items-center gap-1.5 active:scale-95"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Take Action</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* TAB: WEB PUSH ALERTS & RE-ENGAGEMENT (ADMIN & SUPER ADMIN) */}
          {activeTab === 'push' && (currentUser?.is_admin || currentUser?.is_top_admin) && (
            <div className="space-y-6 animate-fade-in select-none pb-36 sm:pb-16">
              {/* Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[var(--card)] border border-[var(--line)] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-[radial-gradient(circle_at_top_right,var(--glow),transparent_70%)] pointer-events-none opacity-50" />
                
                <div className="flex items-start gap-3.5 relative z-10 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-[var(--on-accent)] shadow-lg shadow-[var(--shadow-accent)] flex-shrink-0">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-[var(--text)] tracking-wide uppercase">Web Push Alerts & Re-engagement</h3>
                      <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] text-[var(--accent-2)] border border-[color-mix(in_srgb,var(--accent-2)_30%,transparent)]">
                        Admin & Super Admin
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl leading-relaxed">
                      Send native lock-screen and browser pop-up notifications to visitors and inactive users who left the site. Target all subscribers, dormant users who haven't opened DataVerse in 3+ or 7+ days, or specific accounts.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchPushStats}
                  disabled={loadingPushStats}
                  className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[var(--hover)] hover:bg-[var(--card-border)] text-xs font-bold text-[var(--text)] border border-[var(--line)] transition-all flex items-center gap-2 cursor-pointer relative z-10"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPushStats ? 'animate-spin text-[var(--accent-2)]' : ''}`} />
                  <span>Refresh Stats</span>
                </button>
              </div>

              {/* 4 Metrics Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] relative overflow-hidden group hover:border-[var(--accent-2)]/40 transition-all">
                  <div className="flex items-center justify-between text-[var(--muted)] mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Subscribers</span>
                    <Smartphone className="w-4 h-4 text-[var(--accent-2)]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[var(--text)]">
                    {pushStats ? pushStats.totalSubscribers.toLocaleString() : '—'}
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-1">Browser device endpoints saved</p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                  <div className="flex items-center justify-between text-[var(--muted)] mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Active (&lt; 3 Days)</span>
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {pushStats ? pushStats.active3d.toLocaleString() : '—'}
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-1">Visited DataVerse recently</p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] relative overflow-hidden group hover:border-amber-500/40 transition-all">
                  <div className="flex items-center justify-between text-[var(--muted)] mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Inactive (&gt; 3 Days)</span>
                    <Target className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400">
                    {pushStats ? pushStats.inactive3d.toLocaleString() : '—'}
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-1">Re-engagement candidate</p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] relative overflow-hidden group hover:border-rose-500/40 transition-all">
                  <div className="flex items-center justify-between text-[var(--muted)] mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Inactive (&gt; 7 Days)</span>
                    <Layers className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-rose-400">
                    {pushStats ? pushStats.inactive7d.toLocaleString() : '—'}
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-1">Dormant win-back target</p>
                </div>
              </div>

              {/* This Device Push Status Banner */}
              {!isThisDeviceSubscribed ? (
                <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Bell className="w-5 h-5 animate-bounce" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-amber-300">This Device Is Not Subscribed To Push Alerts</h4>
                      <p className="text-[11px] text-amber-200/70 mt-0.5">
                        To receive pop-up notifications and test them right on this phone or browser, tap the button to enable notifications.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={runPushDiagnostic}
                      className="px-3.5 py-2.5 rounded-xl bg-[var(--card)] hover:bg-[var(--hover)] text-amber-300 font-bold text-xs border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Test &amp; Diagnose
                    </button>
                    <button
                      type="button"
                      onClick={handleSubscribeCurrentDevice}
                      disabled={subscribingThisDevice}
                      className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      {subscribingThisDevice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                      Enable On This Device
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 sm:p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-emerald-300 font-bold">This device is subscribed &amp; active as @{currentUser?.username}</span>
                      <p className="text-[10px] text-emerald-300/70">Ready to receive lock-screen pop-ups and desktop alerts.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={runPushDiagnostic}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[11px] font-bold border border-teal-500/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3 h-3" />
                      Test &amp; Diagnose
                    </button>
                    <button
                      type="button"
                      onClick={handleSendTestToThisDevice}
                      disabled={sendingPush || countdown !== null}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      Send Test Alert
                    </button>
                    <button
                      type="button"
                      onClick={handleDelayedLockScreenTest}
                      disabled={sendingPush || countdown !== null}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Clock className="w-3 h-3" />
                      {countdown !== null ? `Lock Screen (${countdown}s)...` : 'Lock Phone & Test (5s)'}
                    </button>
                  </div>
                </div>
              )}

              {/* Troubleshooting Note for Android / iOS */}
              <div className="p-3.5 rounded-2xl bg-[var(--input)] border border-[var(--line)] text-[11px] text-[var(--muted)] flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[var(--accent-2)] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-[var(--text)]">Phone Notification Settings:</span> If your phone does not pop up a banner on the screen, verify that Chrome notifications are allowed in your device settings (<strong className="text-[var(--text)]">Android Settings &gt; Apps &gt; Chrome &gt; Notifications &gt; ON</strong>). On iOS, add DataVerse to Home Screen first.
                </div>
              </div>

              {/* Main Composer & Mobile Lock-Screen Preview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Form: Notification Composer (7 Cols) */}
                <div className="lg:col-span-7 space-y-5 bg-[var(--card)] border border-[var(--line)] rounded-3xl p-5 sm:p-6 shadow-xl">
                  <div>
                    <h4 className="text-sm font-black text-[var(--text)] uppercase tracking-wide flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-[var(--accent-2)]" />
                      Compose Push Alert
                    </h4>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">Customize your pop-up message and select your target audience.</p>
                  </div>

                  {/* Target Audience Segment Selector */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)] block">
                      Target Audience
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPushAudience('all')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          pushAudience === 'all'
                            ? 'bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_20%,transparent)] to-[color-mix(in_srgb,var(--accent-2)_20%,transparent)] border-[var(--accent-2)] text-[var(--text)] shadow-md shadow-[var(--shadow-accent)]'
                            : 'bg-[var(--input)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--card-border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text)]">🌐 All Subscribers</span>
                          {pushAudience === 'all' && <Check className="w-3.5 h-3.5 text-[var(--accent-2)]" />}
                        </div>
                        <span className="text-[10px] text-[var(--muted)] mt-1">Broadcast to all devices</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPushAudience('inactive_3d')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          pushAudience === 'inactive_3d'
                            ? 'bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_20%,transparent)] to-[color-mix(in_srgb,var(--accent-2)_20%,transparent)] border-[var(--accent-2)] text-[var(--text)] shadow-md shadow-[var(--shadow-accent)]'
                            : 'bg-[var(--input)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--card-border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text)]">⏳ Inactive &gt; 3 Days</span>
                          {pushAudience === 'inactive_3d' && <Check className="w-3.5 h-3.5 text-[var(--accent-2)]" />}
                        </div>
                        <span className="text-[10px] text-[var(--muted)] mt-1">Haven't visited in 3+ days</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPushAudience('inactive_7d')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          pushAudience === 'inactive_7d'
                            ? 'bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_20%,transparent)] to-[color-mix(in_srgb,var(--accent-2)_20%,transparent)] border-[var(--accent-2)] text-[var(--text)] shadow-md shadow-[var(--shadow-accent)]'
                            : 'bg-[var(--input)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--card-border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text)]">💤 Inactive &gt; 7 Days</span>
                          {pushAudience === 'inactive_7d' && <Check className="w-3.5 h-3.5 text-[var(--accent-2)]" />}
                        </div>
                        <span className="text-[10px] text-[var(--muted)] mt-1">Dormant win-back segment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPushAudience('users')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          pushAudience === 'users'
                            ? 'bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_20%,transparent)] to-[color-mix(in_srgb,var(--accent-2)_20%,transparent)] border-[var(--accent-2)] text-[var(--text)] shadow-md shadow-[var(--shadow-accent)]'
                            : 'bg-[var(--input)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--card-border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text)]">🎯 Specific Users</span>
                          {pushAudience === 'users' && <Check className="w-3.5 h-3.5 text-[var(--accent-2)]" />}
                        </div>
                        <span className="text-[10px] text-[var(--muted)] mt-1">Select individual accounts</span>
                      </button>
                    </div>
                  </div>

                  {/* Specific User Selector (Conditional) */}
                  {pushAudience === 'users' && (
                    <div className="p-3.5 rounded-2xl bg-[var(--input)] border border-[var(--line)] space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[var(--text)]">Pick Target Users ({selectedPushUsers.length} selected)</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPushUsers(users.map(u => u.id))}
                            className="text-[10px] text-[var(--accent-2)] hover:underline font-semibold cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-[var(--muted)] text-[10px]">•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedPushUsers([])}
                            className="text-[10px] text-[var(--muted)] hover:underline font-semibold cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                        <input
                          type="text"
                          value={pushUserFilter}
                          onChange={(e) => setPushUserFilter(e.target.value)}
                          placeholder="Search username or display name..."
                          className="w-full bg-[var(--card)] border border-[var(--line)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-2)]"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                        {users
                          .filter(u => {
                            if (!pushUserFilter.trim()) return true;
                            const q = pushUserFilter.toLowerCase().trim();
                            return u.username.toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q);
                          })
                          .slice(0, 30)
                          .map(u => {
                            const isSelected = selectedPushUsers.includes(u.id);
                            return (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setSelectedPushUsers(prev =>
                                    isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                  );
                                }}
                                className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] border-[var(--accent-2)]/60 text-[var(--text)]'
                                    : 'bg-[var(--card)] border-[var(--line)] text-[var(--muted)] hover:bg-[var(--hover)]'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <AdminAvatar avatarUrl={u.avatar_url} name={u.username} size={28} />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-[var(--text)] truncate text-[11px]">
                                        {u.display_name || u.username}
                                      </span>
                                      {pushStats?.subscribedUserIds?.includes(u.id) ? (
                                        <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                          🔔 Push Active
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded text-[8px] font-medium uppercase bg-slate-500/15 text-slate-400 border border-slate-500/20">
                                          🔕 In-App Only
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-[var(--muted)] truncate">@{u.username}</div>
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  tabIndex={-1}
                                  className="accent-[var(--accent-2)] w-4 h-4 cursor-pointer pointer-events-none"
                                />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* 1-Click Message Presets */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)] block">
                      Quick 1-Click Templates
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPushTitle('DataVerse • We miss you!');
                          setPushBody('New conversations, viral posts and discussions are happening right now. Come back and see what is new!');
                          setPushUrl('https://dataverse.datalexcloud.tech');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[var(--input)] border border-[var(--line)] text-[10px] font-bold text-[var(--text)] hover:border-[var(--accent-2)] hover:text-[var(--accent-2)] transition-all cursor-pointer"
                      >
                        👋 We Miss You!
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPushTitle('DataVerse • Trending Right Now');
                          setPushBody('Catch the most liked reels and hot threads in DataVerse today! Tap to view what is buzzing.');
                          setPushUrl('https://dataverse.datalexcloud.tech');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[var(--input)] border border-[var(--line)] text-[10px] font-bold text-[var(--text)] hover:border-[var(--accent-2)] hover:text-[var(--accent-2)] transition-all cursor-pointer"
                      >
                        🔥 Trending Alert
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPushTitle('DataVerse • Community Updates');
                          setPushBody('You have unread updates in your community circles. Tap to join the conversation.');
                          setPushUrl('https://dataverse.datalexcloud.tech');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[var(--input)] border border-[var(--line)] text-[10px] font-bold text-[var(--text)] hover:border-[var(--accent-2)] hover:text-[var(--accent-2)] transition-all cursor-pointer"
                      >
                        💬 Community Circles
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPushTitle('DataVerse • New Features Released');
                          setPushBody('We upgraded DataVerse with lightning-fast speeds and brand new features! Tap to explore.');
                          setPushUrl('https://dataverse.datalexcloud.tech');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[var(--input)] border border-[var(--line)] text-[10px] font-bold text-[var(--text)] hover:border-[var(--accent-2)] hover:text-[var(--accent-2)] transition-all cursor-pointer"
                      >
                        ✨ New Features
                      </button>
                    </div>
                  </div>

                  {/* Form Inputs: Title, Body, URL */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)] block mb-1">
                        Notification Title
                      </label>
                      <input
                        type="text"
                        value={pushTitle}
                        onChange={(e) => setPushTitle(e.target.value)}
                        placeholder="e.g. DataVerse"
                        maxLength={50}
                        className="w-full bg-[var(--input)] border border-[var(--line)] rounded-xl px-3.5 py-2 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-2)] transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)] block">
                          Notification Message (Pop-up Body)
                        </label>
                        <span className="text-[10px] text-[var(--muted)] font-mono">
                          {pushBody.length}/180
                        </span>
                      </div>
                      <textarea
                        value={pushBody}
                        onChange={(e) => setPushBody(e.target.value)}
                        placeholder="Write your custom notification text here... This will display directly on user lock screens, desktops and browser pop-ups."
                        rows={3}
                        maxLength={180}
                        className="w-full bg-[var(--input)] border border-[var(--line)] rounded-xl p-3 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-2)] transition-colors resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)] block mb-1">
                        Action Target URL (Opens when notification is clicked)
                      </label>
                      <input
                        type="url"
                        value={pushUrl}
                        onChange={(e) => setPushUrl(e.target.value)}
                        placeholder="https://dataverse.datalexcloud.tech"
                        className="w-full bg-[var(--input)] border border-[var(--line)] rounded-xl px-3.5 py-2 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-2)] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Submit Dispatch Action */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleBroadcastPush}
                      disabled={sendingPush}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-[var(--shadow-accent)] hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingPush ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--on-accent)]" />
                          <span>Dispatching Web Push...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Push Notification Now</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-[var(--muted)] mt-2">
                      Delivers natively through Google FCM, Apple APNs, &amp; Mozilla WebPush standards.
                    </p>
                  </div>
                </div>

                {/* Right Column: Realistic Smartphone Lock-Screen Preview (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col space-y-4">
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-5 sm:p-6 shadow-xl flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black uppercase tracking-wider text-[var(--text)] flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-[var(--accent-2)]" />
                          Live Lock-Screen Preview
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Real-time
                        </span>
                      </div>

                      {/* Phone Shell Mockup */}
                      <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[310px] rounded-[36px] p-3 bg-[#020709] border-4 border-[#12282e] shadow-2xl overflow-hidden text-white font-sans">
                        {/* Phone Camera Notch/Pill */}
                        <div className="w-24 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#05181c] border border-white/10" />
                        </div>

                        {/* Lock Screen Status Bar */}
                        <div className="flex items-center justify-between text-[10px] text-white/70 px-2 mb-4 font-medium tracking-tight">
                          <span>11:31</span>
                          <div className="flex items-center gap-1.5">
                            <span>5G</span>
                            <div className="w-3.5 h-2 rounded-sm border border-white/60 relative flex items-center p-0.5">
                              <div className="w-2 h-full bg-white rounded-xs" />
                            </div>
                          </div>
                        </div>

                        {/* Lock Screen Clock */}
                        <div className="text-center my-4 space-y-0.5">
                          <div className="text-3xl font-extralight tracking-tight text-white/90">11:31</div>
                          <div className="text-[10px] text-teal-200/60 font-medium">Sunday, November 1</div>
                        </div>

                        {/* Native Notification Card Mockup */}
                        <div className="relative bg-[#061e24]/90 backdrop-blur-xl border border-teal-500/30 rounded-2xl p-3 shadow-xl transition-all">
                          {/* Card Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-5 h-5 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.25)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                <DataVerseLogo size={20} rounded="full" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-teal-300 truncate">
                                DATAVERSE
                              </span>
                            </div>
                            <span className="text-[9px] text-white/40 font-medium">now</span>
                          </div>

                          {/* Card Content */}
                          <div className="space-y-1">
                            <h5 className="text-[11px] font-bold text-white leading-tight break-words">
                              {pushTitle.trim() || 'DataVerse'}
                            </h5>
                            <p className="text-[10px] text-white/80 leading-snug line-clamp-3 break-words">
                              {pushBody.trim() || 'Your notification message will appear right here on user lock screens, notifications shades, and desktop displays.'}
                            </p>
                          </div>

                          {/* Card Action Subtext */}
                          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-teal-300/80">
                            <span className="truncate">Tap to open {pushUrl.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 ml-1" />
                          </div>
                        </div>

                        {/* Phone Bottom Home Bar */}
                        <div className="w-28 h-1 bg-white/40 rounded-full mx-auto mt-6 mb-1" />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[var(--input)] border border-[var(--line)] text-[10px] text-[var(--muted)] space-y-1.5 mt-4">
                      <div className="font-bold text-[var(--text)] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Full Device Compatibility
                      </div>
                      <p className="leading-relaxed">
                        Notifications wake the device screen and alert users even when DataVerse is closed or running in background. Supported on Android Chrome, Windows Edge/Chrome, macOS Safari/Chrome, and iOS 16.4+ (Add to Home Screen).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Past Broadcast History */}
              <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-[var(--text)] uppercase tracking-wide flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--accent-2)]" />
                      Recent Broadcast History
                    </h4>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">Log of notifications sent to DataVerse subscribers.</p>
                  </div>
                </div>

                {(!pushStats || pushStats.recentCampaigns.length === 0) ? (
                  <div className="p-8 border border-[var(--line)] bg-[var(--input)] rounded-2xl text-center space-y-1.5">
                    <Radio className="w-6 h-6 text-[var(--muted)] mx-auto opacity-60" />
                    <p className="text-xs font-bold text-[var(--text)]">No Broadcasts Sent Yet</p>
                    <p className="text-[10px] text-[var(--muted)] max-w-sm mx-auto">
                      Use the composer above to dispatch your first web push notification.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-none">
                    <div className="space-y-2 min-w-[500px]">
                      {pushStats.recentCampaigns.map((camp) => (
                        <div
                          key={camp.id}
                          className="p-3.5 rounded-2xl bg-[var(--input)] border border-[var(--line)] flex items-center justify-between gap-4 hover:border-[var(--card-border)] transition-colors"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] border border-[var(--line)] flex items-center justify-center text-[var(--accent-2)] flex-shrink-0 mt-0.5">
                              <Radio className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[var(--text)] truncate">{camp.title}</span>
                                <span className="text-[9px] font-extrabold uppercase px-2 py-0.2 rounded-full bg-[var(--card)] border border-[var(--line)] text-[var(--accent-2)]">
                                  {camp.target_audience === 'all' ? 'All Users' : camp.target_audience === 'inactive_3d' ? 'Inactive > 3d' : camp.target_audience === 'inactive_7d' ? 'Inactive > 7d' : 'Specific Users'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--muted)] truncate max-w-md mt-0.5">{camp.body}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 flex-shrink-0 text-right">
                            <div>
                              <div className="text-xs font-bold text-emerald-400">
                                {camp.success_count} / {camp.sent_count}
                              </div>
                              <div className="text-[9px] text-[var(--muted)]">Delivered</div>
                            </div>
                            <div className="text-[10px] font-mono text-[var(--muted)]">
                              {new Date(camp.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MEDIA PLATFORM (ALL MEDIA ACCESS: SENT TO DELETED, BY USER) */}
          {activeTab === 'media' && currentUser?.is_top_admin && (
            <div className="space-y-6 animate-fade-in select-none pb-36 sm:pb-16">
              
              {/* Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[var(--card)] border border-[var(--line)] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-[radial-gradient(circle_at_top_right,var(--glow),transparent_70%)] pointer-events-none opacity-50" />
                
                <div className="flex items-start gap-3.5 relative z-10 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-[var(--on-accent)] shadow-lg shadow-[var(--shadow-accent)] flex-shrink-0">
                    <Film className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-[var(--text)] tracking-wide uppercase">System Media Platform</h3>
                      <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] text-[var(--accent-2)] border border-[color-mix(in_srgb,var(--accent-2)_30%,transparent)]">
                        Full Audit Access
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Super Admin Only
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl leading-relaxed">
                      Complete administrative media vault. Access all photos, videos, voice recordings, and files sent across direct messages, groups, feed posts, and reels — including deleted and unsent media, searchable by user name.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto relative z-10">
                  <button
                    type="button"
                    onClick={fetchAdminMedia}
                    disabled={mediaLoading}
                    className="px-3.5 py-2 rounded-xl bg-[var(--hover)] hover:bg-[var(--card-border)] text-xs font-bold text-[var(--text)] border border-[var(--line)] transition-all flex items-center gap-2 cursor-pointer"
                    title="Refresh Media Vault"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${mediaLoading ? 'animate-spin text-[var(--accent-2)]' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Metric Summary Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm">
                  <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Total Assets</div>
                  <div className="text-xl font-black text-[var(--text)] mt-1">{adminMediaCounts.total}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Sent / Live
                  </div>
                  <div className="text-xl font-black text-emerald-400 mt-1">{adminMediaCounts.active}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-rose-500/20 bg-rose-500/5 shadow-sm">
                  <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    Deleted
                  </div>
                  <div className="text-xl font-black text-rose-400 mt-1">{adminMediaCounts.deleted}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm">
                  <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-[var(--accent-2)]" />
                    Photos
                  </div>
                  <div className="text-xl font-black text-[var(--text)] mt-1">{adminMediaCounts.images}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm">
                  <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
                    <Film className="w-3 h-3 text-[var(--accent-2)]" />
                    Videos
                  </div>
                  <div className="text-xl font-black text-[var(--text)] mt-1">{adminMediaCounts.videos}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm">
                  <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
                    <Mic className="w-3 h-3 text-[var(--accent-2)]" />
                    Audio
                  </div>
                  <div className="text-xl font-black text-[var(--text)] mt-1">{adminMediaCounts.audio}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm">
                  <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
                    <Folder className="w-3 h-3 text-[var(--accent-2)]" />
                    Files
                  </div>
                  <div className="text-xl font-black text-[var(--text)] mt-1">{adminMediaCounts.files}</div>
                </div>
              </div>

              {/* Filters & Controls Toolbar */}
              <div className="p-4 rounded-3xl bg-[var(--card)] border border-[var(--line)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
                {/* Search by User name or filename */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={mediaUserSearch}
                    onChange={(e) => setMediaUserSearch(e.target.value)}
                    placeholder="Search by user name (@user), display name, or filename..."
                    className="w-full bg-[var(--input)] border border-[var(--line)] rounded-2xl pl-10 pr-9 py-2.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent-2)] transition-colors"
                  />
                  {mediaUserSearch && (
                    <button
                      type="button"
                      onClick={() => setMediaUserSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] p-0.5 rounded-md"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Controls Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status Filter */}
                  <select
                    value={mediaStatusFilter}
                    onChange={(e) => setMediaStatusFilter(e.target.value as any)}
                    aria-label="Filter media by status"
                    className="bg-[var(--input)] border border-[var(--line)] text-[var(--text)] text-xs font-semibold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-[var(--accent-2)]"
                  >
                    <option value="all">All Status (Sent & Deleted)</option>
                    <option value="active">🟢 Live / Sent Only</option>
                    <option value="deleted">🔴 Deleted Only</option>
                  </select>

                  {/* Type Filter */}
                  <select
                    value={mediaTypeFilter}
                    onChange={(e) => setMediaTypeFilter(e.target.value as any)}
                    aria-label="Filter media by type"
                    className="bg-[var(--input)] border border-[var(--line)] text-[var(--text)] text-xs font-semibold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-[var(--accent-2)]"
                  >
                    <option value="all">All Types</option>
                    <option value="image">📸 Photos & Images</option>
                    <option value="video">🎬 Videos & Reels</option>
                    <option value="audio">🎙️ Voice & Audio</option>
                    <option value="file">📁 Files & Docs</option>
                  </select>

                  {/* Source Filter */}
                  <select
                    value={mediaSourceFilter}
                    onChange={(e) => setMediaSourceFilter(e.target.value as any)}
                    aria-label="Filter media by source"
                    className="bg-[var(--input)] border border-[var(--line)] text-[var(--text)] text-xs font-semibold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-[var(--accent-2)]"
                  >
                    <option value="all">All Sources</option>
                    <option value="chat">💬 Chat Messages</option>
                    <option value="post">📰 Posts & Reels</option>
                  </select>

                  {/* View Mode Toggle: Grid vs Table */}
                  <div className="flex items-center p-1 bg-[var(--input)] rounded-xl border border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => setMediaViewMode('grid')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                        mediaViewMode === 'grid'
                          ? 'bg-[var(--card)] text-[var(--accent-2)] shadow-sm'
                          : 'text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                      title="Visual Grid View"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaViewMode('table')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                        mediaViewMode === 'table'
                          ? 'bg-[var(--card)] text-[var(--accent-2)] shadow-sm'
                          : 'text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                      title="Detailed Table View"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Media Content Display */}
              {mediaLoading ? (
                <div className="py-24 flex flex-col items-center justify-center text-[var(--muted)] gap-3 bg-[var(--card)] border border-[var(--line)] rounded-3xl">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-2)]" />
                  <span className="text-xs font-semibold">Querying system media vault...</span>
                </div>
              ) : adminMedia.length === 0 ? (
                <div className="py-20 text-center text-[var(--muted)] bg-[var(--card)] border border-[var(--line)] rounded-3xl p-6 flex flex-col items-center justify-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--input)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)]">
                    <Film className="w-7 h-7 opacity-60" />
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text)]">No Media Assets Found</h4>
                  <p className="text-xs text-[var(--muted)] max-w-sm">
                    {mediaUserSearch ? `No media found matching "${mediaUserSearch}". Try adjusting your search or filters.` : 'No media items currently logged in the platform.'}
                  </p>
                  {mediaUserSearch && (
                    <button
                      type="button"
                      onClick={() => { setMediaUserSearch(''); setMediaStatusFilter('all'); setMediaTypeFilter('all'); setMediaSourceFilter('all'); }}
                      className="mt-2 text-xs font-bold text-[var(--accent-2)] hover:underline cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : mediaViewMode === 'grid' ? (
                /* VISUAL GRID VIEW */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {adminMedia.map((item) => {
                    const isVideo = item.media_type === 'video';
                    const isAudio = item.media_type === 'audio';
                    const isFile = item.media_type === 'file';
                    const fileUrl = `/api/media/file/${item.url}`;
                    const isDeleted = item.status === 'deleted';

                    return (
                      <div
                        key={item.id}
                        className={`group rounded-2xl bg-[var(--card)] border transition-all duration-200 overflow-hidden flex flex-col shadow-md relative ${
                          isDeleted ? 'border-rose-500/30 hover:border-rose-500/60' : 'border-[var(--line)] hover:border-[var(--accent-2)]/60'
                        }`}
                      >
                        {/* Status Badges Overlay */}
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 pointer-events-none">
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md shadow ${
                            isDeleted ? 'bg-rose-500/80 text-white' : 'bg-emerald-500/80 text-white'
                          }`}>
                            {isDeleted ? 'Deleted' : 'Sent'}
                          </span>
                        </div>

                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                          <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white/90">
                            {item.source === 'chat' ? 'Chat' : 'Post'}
                          </span>
                        </div>

                        {/* Thumbnail / Media Box */}
                        <div
                          className="relative aspect-square w-full bg-[var(--input)] overflow-hidden cursor-pointer flex items-center justify-center"
                          onClick={() => {
                            if (isFile) {
                              window.open(fileUrl, '_blank');
                            } else {
                              setActiveMediaPreview(item);
                            }
                          }}
                        >
                          {isVideo ? (
                            <div className="w-full h-full relative bg-black flex items-center justify-center">
                              <video src={fileUrl} className="w-full h-full object-cover opacity-80" preload="none" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-9 h-9 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ) : isAudio ? (
                            <div className="w-full h-full bg-gradient-to-br from-purple-950/40 to-slate-950 flex flex-col items-center justify-center p-3 text-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 border border-[var(--accent)]/30 text-[var(--accent-2)] flex items-center justify-center shadow-md">
                                <Mic className="w-5 h-5" />
                              </div>
                              <span className="text-[10px] font-bold text-white/80 truncate max-w-full">
                                {item.file_name}
                              </span>
                            </div>
                          ) : isFile ? (
                            <div className="w-full h-full bg-gradient-to-br from-blue-950/40 to-slate-950 flex flex-col items-center justify-center p-3 text-center gap-2">
                              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-md">
                                <FileText className="w-5 h-5" />
                              </div>
                              <span className="text-[10px] font-bold text-white/80 truncate max-w-full">
                                {item.file_name}
                              </span>
                            </div>
                          ) : (
                            <img
                              src={fileUrl}
                              alt={item.file_name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          )}

                          {/* Quick Action Overlay on Hover */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMediaPreview(item);
                              }}
                              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                              title="Full Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={fileUrl}
                              download={item.file_name}
                              onClick={(e) => e.stopPropagation()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                              title="Download File"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePurgeMedia(item);
                              }}
                              className="w-8 h-8 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                              title="Purge Media Permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Card Info Details */}
                        <div className="p-2.5 flex flex-col justify-between flex-1 gap-1.5">
                          {/* User info row with 1-click filter */}
                          <div 
                            className="flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
                            onClick={() => setMediaUserSearch(item.user.username)}
                            title={`Filter media by @${item.user.username}`}
                          >
                            <div className="w-5 h-5 rounded-full bg-[var(--input)] border border-[var(--line)] overflow-hidden flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-[var(--accent-2)]">
                              {item.user.avatar_url ? (
                                <img src={`/api/media/file/${item.user.avatar_url}`} alt="" className="w-full h-full object-cover" />
                              ) : (
                                item.user.username.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-[var(--text)] truncate leading-tight">
                                @{item.user.username}
                              </p>
                            </div>
                          </div>

                          {/* Filename & Timestamp */}
                          <div className="flex items-center justify-between text-[9px] text-[var(--muted)] pt-1 border-t border-[var(--line)]">
                            <span className="truncate max-w-[65%]" title={item.file_name}>
                              {item.file_name}
                            </span>
                            <span className="font-mono flex-shrink-0 ml-1">
                              {new Date(item.created_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* DETAILED AUDIT TABLE VIEW */
                <div className="overflow-x-auto scrollbar-none rounded-3xl bg-[var(--card)] border border-[var(--line)] shadow-xl">
                  <table className="w-full text-left text-xs text-[var(--text)] min-w-[700px]">
                    <thead className="bg-[var(--input)] text-[var(--muted)] text-[10px] font-black uppercase tracking-wider border-b border-[var(--line)]">
                      <tr>
                        <th className="py-3 px-4">Preview</th>
                        <th className="py-3 px-4">Sender / User</th>
                        <th className="py-3 px-4">Asset Details</th>
                        <th className="py-3 px-4">Source Origin</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {adminMedia.map((item) => {
                        const fileUrl = `/api/media/file/${item.url}`;
                        const isDeleted = item.status === 'deleted';

                        return (
                          <tr key={item.id} className="hover:bg-[var(--hover)]/40 transition-colors">
                            {/* Preview */}
                            <td className="py-2.5 px-4">
                              <div
                                onClick={() => setActiveMediaPreview(item)}
                                className="w-12 h-12 rounded-xl bg-[var(--input)] border border-[var(--line)] overflow-hidden cursor-pointer flex items-center justify-center relative flex-shrink-0 group"
                              >
                                {item.media_type === 'video' ? (
                                  <div className="w-full h-full relative bg-black flex items-center justify-center">
                                    <video src={fileUrl} className="w-full h-full object-cover" preload="none" />
                                    <Play className="w-3.5 h-3.5 text-white absolute fill-current" />
                                  </div>
                                ) : item.media_type === 'audio' ? (
                                  <Mic className="w-5 h-5 text-[var(--accent-2)]" />
                                ) : item.media_type === 'file' ? (
                                  <FileText className="w-5 h-5 text-blue-400" />
                                ) : (
                                  <img src={fileUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                )}
                              </div>
                            </td>

                            {/* User */}
                            <td className="py-2.5 px-4">
                              <div
                                className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
                                onClick={() => setMediaUserSearch(item.user.username)}
                                title={`Filter by @${item.user.username}`}
                              >
                                <div className="w-7 h-7 rounded-full bg-[var(--input)] border border-[var(--line)] overflow-hidden flex items-center justify-center text-[9px] font-bold text-[var(--accent-2)] flex-shrink-0">
                                  {item.user.avatar_url ? (
                                    <img src={`/api/media/file/${item.user.avatar_url}`} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    item.user.username.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-xs truncate">{item.user.display_name || item.user.username}</div>
                                  <div className="text-[10px] text-[var(--muted)]">@{item.user.username}</div>
                                </div>
                              </div>
                            </td>

                            {/* Asset Details */}
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-xs truncate max-w-xs" title={item.file_name}>
                                {item.file_name}
                              </div>
                              <div className="text-[10px] text-[var(--muted)] uppercase font-mono mt-0.5">
                                {item.media_type}
                              </div>
                            </td>

                            {/* Origin */}
                            <td className="py-2.5 px-4">
                              <span className="text-[11px] font-medium text-[var(--text)]">
                                {item.source_name}
                              </span>
                              {item.context && item.context !== item.file_name && (
                                <p className="text-[10px] text-[var(--muted)] truncate max-w-xs">{item.context}</p>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                isDeleted
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isDeleted ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
                                {isDeleted ? 'Deleted' : 'Sent'}
                              </span>
                            </td>

                            {/* Timestamp */}
                            <td className="py-2.5 px-4 font-mono text-[10px] text-[var(--muted)]">
                              {new Date(item.created_at).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveMediaPreview(item)}
                                  className="p-1.5 rounded-lg bg-[var(--input)] hover:bg-[var(--hover)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                  title="View Preview"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={fileUrl}
                                  download={item.file_name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-[var(--input)] hover:bg-[var(--hover)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                  title="Download Original"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handlePurgeMedia(item)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                                  title="Purge Media Permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* READ-ONLY AUDIT CHAT MODAL DIALOG */}
      {auditingConvo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-audit-title"
            className="w-full max-w-2xl bg-[#030303] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[90vh] sm:h-[80vh] max-h-[92vh] sm:max-h-[580px] shadow-2xl"
          >
            
            {/* Modal Header */}
            <div className="p-4 border-b border-white/[0.04] flex items-center justify-between bg-slate-950/40">
              <div>
                <h3 id="admin-audit-title" className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-brand-400" />
                  Audit: {getCleanLabel(auditingConvo)}
                </h3>
                <p className="text-[9px] text-[var(--muted)] mt-0.5">Audit log view. Read-only monitor mode.</p>
              </div>
              <button 
                type="button"
                onClick={() => setAuditingConvo(null)}
                aria-label="Close audit log"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message bubble stream log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/10">
              {loadingAudit ? (
                <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                  <span className="text-xs">Loading logs...</span>
                </div>
              ) : auditMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 text-xs font-semibold">
                  No messages logged in this conversation.
                </div>
              ) : (
                auditMessages.map(m => {
                  const isSystem = m.sender_id === 'system';
                  
                  const renderContent = () => {
                    const raw = m.body;
                    if (!raw) return <p className="text-xs text-slate-500 italic">(Empty message)</p>;

                    if (raw.startsWith('{') && raw.endsWith('}')) {
                      try {
                        const obj = JSON.parse(raw);
                        if (obj && obj.type === 'secure_media') {
                          return (
                            <div className="space-y-1.5 mt-1">
                              {obj.media_type === 'image' && (
                                <div className="relative rounded-xl overflow-hidden border border-white/[0.04] bg-[#020202] max-w-xs shadow-md">
                                  <img 
                                    src={`/api/media/file/${obj.url}`} 
                                    alt="Audited secure photo" 
                                    className="w-full max-h-56 object-cover"
                                  />
                                </div>
                              )}
                              {obj.media_type === 'video' && (
                                <div className="relative rounded-xl overflow-hidden border border-white/[0.04] bg-[#020202] max-w-xs shadow-md">
                                  <video 
                                    src={`/api/media/file/${obj.url}`} 
                                    className="w-full max-h-56 object-cover"
                                    controls
                                  />
                                </div>
                              )}
                              {obj.media_type === 'voice' && (
                                <div className="text-[10px] text-brand-300 font-mono bg-slate-900/60 border border-white/[0.04] px-3 py-1.5 rounded-xl inline-flex items-center gap-2">
                                  <span>🎤 Voice note file:</span>
                                  <span className="text-slate-400">{obj.url.substring(0, 20)}...</span>
                                </div>
                              )}
                              {obj.caption && (
                                <p className="text-xs text-slate-200 mt-1 font-medium">{obj.caption}</p>
                              )}
                            </div>
                          );
                        } else if (obj && (obj.type === 'reply' || obj.reply_to)) {
                          return (
                            <div className="space-y-1 mt-1">
                              {obj.reply_to && (
                                <div className="bg-white/[0.03] border-l-2 border-brand-500 rounded-r-lg px-2.5 py-1 text-[10px] text-slate-400">
                                  <span className="font-extrabold text-brand-400 block">Replying to @{obj.reply_to.username}</span>
                                  <span className="truncate block text-[9px] text-slate-400">{obj.reply_to.body}</span>
                                </div>
                              )}
                              <p className="text-xs text-slate-200 leading-relaxed break-words font-normal">{obj.text || raw}</p>
                            </div>
                          );
                        }
                      } catch {}
                    }

                    if (raw.startsWith('[Shared Post] ')) {
                      const parts = raw.substring(14).split(' | post_id: ');
                      const textPart = parts[0];
                      const username = textPart.split(':')[0].replace('@', '').trim();
                      const caption = textPart.substring(textPart.indexOf(':') + 1).trim();

                      return (
                        <div className="bg-slate-900/80 border border-white/[0.04] p-2.5 rounded-xl max-w-xs text-left space-y-1 mt-1">
                          <span className="text-[9px] font-black text-brand-400 uppercase tracking-wide block">Shared Post (@{username})</span>
                          <p className="text-[11px] text-slate-300 italic">"{caption || 'Photo/Video'}"</p>
                        </div>
                      );
                    }

                    return <p className="text-xs text-slate-200 leading-relaxed break-words font-normal">{raw}</p>;
                  };

                  const isMedia = m.body && m.body.startsWith('{"type":"secure_media"');

                  return (
                    <div key={m.id} className="flex gap-3">
                      
                      {/* AVATAR FIX START */}
                      <AdminAvatar avatarUrl={isSystem ? null : m.avatar_url} name={m.username} fallbackText={isSystem ? 'S' : undefined} size={32} />
                      {/* AVATAR FIX END */}

                      {/* Msg text bubble */}
                      <div className={`p-3 rounded-2xl flex-1 transition-all ${
                        m.is_deleted === 1
                          ? 'bg-red-950/10 border border-red-500/20 shadow-md shadow-red-500/[0.01]'
                          : 'bg-slate-950/50 border border-white/[0.02]'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-extrabold text-white flex items-center gap-1.5">
                            {isSystem ? 'System Broadcast' : m.display_name || m.username}
                            {m.is_deleted === 1 && (
                              <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/10">
                                Deleted
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] text-slate-550 font-bold">
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {!isMedia && m.body !== '[Redacted Text]' && (
                              <button
                                onClick={() => handleRedactMessageText(m.id)}
                                className="text-[8px] font-bold text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/20 transition-all select-none uppercase tracking-wide"
                                title="Clear text for this admin view"
                              >
                                Clear Text
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {renderContent()}
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Bottom Alert */}
            <div className="p-4 bg-slate-950/40 border-t border-white/[0.04] text-center select-none">
              <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                Audit Active: Logs Recorded
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Device Push Notification Diagnostic Modal */}
      {diagnosticOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
        >
          <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[var(--text)] uppercase tracking-wide">
                    Phone Push Diagnostic
                  </h3>
                  <p className="text-[10px] text-[var(--muted)]">Live check of browser, service worker &amp; native pop-up engine.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDiagnosticOpen(false)}
                className="w-8 h-8 rounded-full bg-[var(--hover)] hover:bg-[var(--card-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-1 pr-1 font-mono text-xs scrollbar-thin">
              {diagnosticLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border ${
                    log.status === 'ok'
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                      : log.status === 'fail'
                      ? 'bg-red-500/10 border-red-500/25 text-red-300'
                      : log.status === 'warn'
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                      : 'bg-[var(--input)] border-[var(--line)] text-[var(--muted)]'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                    <span>{log.step}</span>
                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded-full bg-black/20 font-bold">
                      {log.status === 'ok' ? 'PASS' : log.status === 'fail' ? 'FAIL' : log.status === 'warn' ? 'WARN' : 'INFO'}
                    </span>
                  </div>
                  <p className="font-sans text-[11px] leading-relaxed break-words">{log.detail}</p>
                </div>
              ))}

              {runningDiagnostic && (
                <div className="p-3 rounded-2xl bg-[var(--input)] border border-[var(--line)] flex items-center gap-2.5 text-xs text-[var(--accent-2)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running step-by-step diagnostic test...</span>
                </div>
              )}
            </div>

            {/* Android Settings Help Box */}
            <div className="p-3.5 rounded-2xl bg-[var(--input)] border border-[var(--line)] text-[11px] space-y-1.5 text-[var(--muted)]">
              <div className="font-bold text-[var(--text)] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[var(--accent-2)]" />
                Still no pop-up on your phone? Check Android OS Settings:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[10px] leading-relaxed text-[var(--muted)] pl-1">
                <li>Open your Android phone&apos;s <strong className="text-[var(--text)]">Settings</strong> app.</li>
                <li>Tap <strong className="text-[var(--text)]">Apps &gt; Chrome &gt; Notifications</strong>.</li>
                <li>Make sure <strong className="text-[var(--text)]">Allow notifications</strong> is turned ON.</li>
                <li>Tap <strong className="text-[var(--text)]">Notification categories &gt; Sites</strong> and ensure <strong className="text-[var(--text)]">Pop on screen (Banner)</strong> is allowed.</li>
                <li>Ensure your phone is not in <strong className="text-[var(--text)]">Do Not Disturb</strong> mode.</li>
              </ol>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={runPushDiagnostic}
                disabled={runningDiagnostic}
                className="px-4 py-2 rounded-xl bg-[var(--hover)] hover:bg-[var(--card-border)] text-xs font-bold text-[var(--text)] border border-[var(--line)] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runningDiagnostic ? 'animate-spin' : ''}`} />
                Re-run Test
              </button>
              <button
                type="button"
                onClick={() => setDiagnosticOpen(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-bold transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 9 / Action Confirmation: In-App Accessible Alert Dialog */}
      {confirmDialog && (
        <div 
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="admin-confirm-title"
          aria-describedby="admin-confirm-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${confirmDialog.isDestructive ? 'bg-red-500/10 text-red-400' : 'bg-[var(--accent)]/10 text-[var(--accent-2)]'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 id="admin-confirm-title" className="text-base font-bold text-[var(--text)]">
                {confirmDialog.title}
              </h3>
            </div>
            <p id="admin-confirm-desc" className="text-xs text-[var(--muted)] leading-relaxed">
              {confirmDialog.description}
            </p>
            <div className="flex gap-3 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  confirmDialog.isDestructive 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20' 
                    : 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md'
                }`}
              >
                {confirmDialog.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Action Modal for Reports */}
      {reportActionTarget && (
        <div 
          role="dialog" 
          aria-modal="true" 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none"
          onClick={() => !executingReportAction && setReportActionTarget(null)}
        >
          <div 
            className="w-full max-w-lg bg-[var(--card)] border border-[var(--line)] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_90%,transparent)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">
                    Take Moderation Action
                  </h3>
                  <p className="text-[11px] text-[var(--muted)]">
                    Enforce policy on @{reportActionTarget.reported_username || 'user'} and resolve report
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !executingReportAction && setReportActionTarget(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Report Summary Pill */}
              <div className="p-3 bg-[color-mix(in_srgb,var(--input)_60%,transparent)] border border-[var(--line)] rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)] font-medium">Report Reason:</span>
                  <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {reportActionTarget.report_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--muted)] truncate">
                  Reported by: <span className="text-[var(--text)] font-semibold">@{reportActionTarget.reporter_username}</span>
                </div>
              </div>

              {/* Action Selection Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                  Select Enforcement Action
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Chat Restriction */}
                  <button
                    type="button"
                    onClick={() => {
                      setReportActionType('chat_restrict');
                      setReportActionDuration(1440);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      reportActionType === 'chat_restrict'
                        ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[var(--accent)] text-[var(--text)] ring-1 ring-[var(--accent)]'
                        : 'bg-[var(--input)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <MessageSquareOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text)]">Chat Restriction</div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">Mute direct messages and group chats</div>
                    </div>
                  </button>

                  {/* Option 2: Suspension */}
                  <button
                    type="button"
                    onClick={() => {
                      setReportActionType('suspend');
                      setReportActionDuration(1440);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      reportActionType === 'suspend'
                        ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[var(--accent)] text-[var(--text)] ring-1 ring-[var(--accent)]'
                        : 'bg-[var(--input)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text)]">Account Suspension</div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">Temporary lock (hours/days) or ban</div>
                    </div>
                  </button>

                  {/* Option 3: Account Removal */}
                  <button
                    type="button"
                    onClick={() => setReportActionType('remove_account')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      reportActionType === 'remove_account'
                        ? 'bg-rose-500/10 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                        : 'bg-[var(--input)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-rose-400">Account Removal</div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">Purge account and all records</div>
                    </div>
                  </button>

                  {/* Option 4: Mark Resolved Only */}
                  <button
                    type="button"
                    onClick={() => setReportActionType('resolve')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      reportActionType === 'resolve'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                        : 'bg-[var(--input)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-emerald-400">No Action / Dismiss</div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">Clear report as benign or resolved</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Duration Selector if Chat Restrict or Suspend */}
              {reportActionType === 'chat_restrict' && (
                <div className="space-y-2 animate-fade-in">
                  <label htmlFor="modal-chat-duration" className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                    Chat Restriction Duration
                  </label>
                  <select
                    id="modal-chat-duration"
                    value={reportActionDuration}
                    onChange={(e) => setReportActionDuration(Number(e.target.value))}
                    className="w-full bg-[var(--input)] border border-[var(--line)] rounded-2xl p-3 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
                  >
                    <option value={60}>1 Hour</option>
                    <option value={720}>12 Hours</option>
                    <option value={1440}>24 Hours (1 Day)</option>
                    <option value={4320}>3 Days (72 Hours)</option>
                    <option value={10080}>7 Days</option>
                  </select>
                </div>
              )}

              {reportActionType === 'suspend' && (
                <div className="space-y-2 animate-fade-in">
                  <label htmlFor="modal-suspend-duration" className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                    Suspension Duration
                  </label>
                  <select
                    id="modal-suspend-duration"
                    value={reportActionDuration}
                    onChange={(e) => setReportActionDuration(Number(e.target.value))}
                    className="w-full bg-[var(--input)] border border-[var(--line)] rounded-2xl p-3 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
                  >
                    <option value={360}>6 Hours</option>
                    <option value={720}>12 Hours</option>
                    <option value={1440}>24 Hours (1 Day)</option>
                    <option value={4320}>3 Days</option>
                    <option value={10080}>7 Days</option>
                    <option value={43200}>30 Days</option>
                    <option value={-1}>🚫 Permanent Account Ban</option>
                  </select>
                </div>
              )}

              {reportActionType === 'remove_account' && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Warning:</strong> Account removal will permanently purge the user, all posts, likes, comments, and media from the database.
                  </span>
                </div>
              )}

              {/* Note / Reason */}
              {reportActionType !== 'resolve' && (
                <div className="space-y-2 animate-fade-in">
                  <label htmlFor="modal-action-reason" className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                    Enforcement Reason (Sent to User)
                  </label>
                  <input
                    id="modal-action-reason"
                    type="text"
                    value={reportActionReason}
                    onChange={(e) => setReportActionReason(e.target.value)}
                    placeholder="e.g. Violation of Community Guidelines regarding harassment"
                    className="w-full bg-[var(--input)] border border-[var(--line)] rounded-2xl p-3 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setReportActionTarget(null)}
                  disabled={executingReportAction}
                  className="btn-secondary h-10 px-4 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReportAction}
                  disabled={executingReportAction}
                  className={`h-10 px-5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    reportActionType === 'remove_account'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
                      : reportActionType === 'resolve'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                      : 'bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-500 hover:to-rose-500 text-white shadow-lg shadow-brand-500/20'
                  }`}
                >
                  {executingReportAction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>
                        {reportActionType === 'resolve'
                          ? 'Dismiss & Resolve'
                          : reportActionType === 'remove_account'
                          ? 'Permanently Remove Account'
                          : 'Apply & Resolve Report'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State 8: Session Expired Modal */}
      {sessionExpired && (
        <div 
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="admin-session-title"
          aria-describedby="admin-session-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 id="admin-session-title" className="text-base font-bold text-[var(--text)]">Admin Session Expired</h3>
              <p id="admin-session-desc" className="text-xs text-[var(--muted)] leading-relaxed">
                Your administrative session has timed out for security. Pending actions and safety notes have been safeguarded.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate ? onNavigate('auth') : (window.location.hash = 'auth')}
                className="w-full min-h-[44px] py-2.5 px-4 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-bold text-xs rounded-full shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Sign In to Resume Admin Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State Preview Toolbar (Only shown in local dev or via ?debug_states=1) */}
      {(import.meta.env.DEV || (typeof window !== 'undefined' && window.location.search.includes('debug_states=1'))) && (
        <aside 
          aria-label="UI State Inspector"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[var(--card)]/95 backdrop-blur-md border border-[var(--card-border)] rounded-full shadow-2xl px-3 py-1.5 flex items-center gap-1.5 text-xs text-[var(--muted)] select-none"
        >
          <button
            type="button"
            onClick={() => setShowPreviewToolbar(!showPreviewToolbar)}
            className="flex items-center gap-1.5 font-bold text-[var(--text)] px-2 py-1 hover:text-[var(--accent-2)] transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent-2)]" />
            <span className="text-[11px]">States</span>
          </button>
          {showPreviewToolbar && (
            <div className="flex items-center gap-1 border-l border-[var(--line)] pl-2 overflow-x-auto max-w-[80vw]">
              {(['idle', 'loading', 'empty', 'error', 'offline', 'slow', 'unauthorized', 'session_expired'] as AdminStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    if (st === 'idle') {
                      setPreviewState(null);
                      setLoading(false);
                      setError(null);
                      setIsOffline(false);
                      setIsSlowNetwork(false);
                      setSessionExpired(false);
                      loadDashboardData();
                    } else if (st === 'loading') {
                      setPreviewState('loading');
                    } else if (st === 'empty') {
                      setPreviewState('empty');
                      setUsers([]);
                      setConvos([]);
                      setReports([]);
                    } else if (st === 'error') {
                      setPreviewState('error');
                      setError('Failed to query Cloudflare D1 administrative database tables. Connection pool exhausted.');
                    } else if (st === 'offline') {
                      setPreviewState('offline');
                      setIsOffline(true);
                    } else if (st === 'slow') {
                      setPreviewState('slow');
                      setIsSlowNetwork(true);
                    } else if (st === 'unauthorized') {
                      setPreviewState('unauthorized');
                    } else if (st === 'session_expired') {
                      setSessionExpired(true);
                    }
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                    previewState === st || (st === 'idle' && !previewState && !sessionExpired && !isOffline && !error)
                      ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                      : 'hover:bg-[var(--hover)] text-[var(--muted)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* ADMIN MEDIA FULLSCREEN LIGHTBOX / PREVIEW MODAL */}
      {activeMediaPreview && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Media preview"
          onClick={() => setActiveMediaPreview(null)}
          className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 animate-fade-in select-none cursor-zoom-out"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
            <a
              href={`/api/media/file/${activeMediaPreview.url}`}
              download={activeMediaPreview.file_name}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl transition-colors border border-white/10 active:scale-95 flex items-center justify-center gap-1.5 text-xs font-semibold"
              title="Download original file"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
            <button
              type="button"
              onClick={() => setActiveMediaPreview(null)}
              className="p-2.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl transition-colors border border-white/10 active:scale-95 flex items-center justify-center"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative max-w-4xl max-h-[85vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {activeMediaPreview.media_type === 'video' ? (
              <video
                src={`/api/media/file/${activeMediaPreview.url}`}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl border border-white/10"
              />
            ) : activeMediaPreview.media_type === 'audio' ? (
              <div className="bg-[var(--card)] border border-[var(--line)] p-6 rounded-3xl shadow-2xl w-96 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent-2)]">
                  <Mic className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">{activeMediaPreview.file_name}</h4>
                  <p className="text-xs text-[var(--muted)]">Sent by @{activeMediaPreview.user.username}</p>
                </div>
                <audio src={`/api/media/file/${activeMediaPreview.url}`} controls autoPlay className="w-full" />
              </div>
            ) : (
              <img
                src={`/api/media/file/${activeMediaPreview.url}`}
                alt={activeMediaPreview.file_name}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            )}

            {/* Media Metadata overlay bar */}
            <div className="mt-3 px-4 py-2 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center gap-4 text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <span>@{activeMediaPreview.user.username}</span>
              </span>
              <span className="text-white/40">•</span>
              <span className="text-white/80">{activeMediaPreview.source_name}</span>
              <span className="text-white/40">•</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                activeMediaPreview.status === 'deleted' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {activeMediaPreview.status === 'deleted' ? 'Deleted' : 'Live / Sent'}
              </span>
              <span className="text-white/40">•</span>
              <span className="text-white/60 font-mono text-[11px]">
                {new Date(activeMediaPreview.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Admin;
