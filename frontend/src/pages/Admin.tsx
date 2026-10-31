import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { VerifiedBadge } from '../components/VerifiedBadge';
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
  CheckCircle2
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
  
  const [activeTab, setActiveTab] = useState<'users' | 'chats' | 'restrictions' | 'verifications' | 'reports'>('users');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [convos, setConvos] = useState<SystemConvo[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      } else if (activeTab === 'reports') {
        await fetchReports();
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fade-in select-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, var(--glow) 0%, transparent 70%)' }}>
      
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border border-[var(--line)] flex items-center justify-center text-[var(--accent-2)]">
            <Shield className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-base font-black text-[var(--text)] tracking-wide uppercase">Admin Console</h1>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">Global DataVerse platform directory and message logs audit system.</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div role="tablist" aria-label="Admin Console Sections" className="flex items-center gap-1.5 sm:gap-2 w-full overflow-x-auto scrollbar-none pb-2 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            className={`shrink-0 whitespace-nowrap py-1.5 px-3.5 sm:py-2 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)]'
                : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
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
              className={`shrink-0 whitespace-nowrap py-1.5 px-3.5 sm:py-2 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'chats'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)]'
                  : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
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
            className={`shrink-0 whitespace-nowrap py-1.5 px-3.5 sm:py-2 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'restrictions'
                ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)]'
                : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
            }`}
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Restrictions
          </button>
          {currentUser?.is_top_admin && (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'verifications'}
                onClick={() => setActiveTab('verifications')}
                className={`shrink-0 whitespace-nowrap py-1.5 px-3.5 sm:py-2 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'verifications'
                    ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)]'
                    : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Verifications
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'reports'}
                onClick={() => setActiveTab('reports')}
                className={`shrink-0 whitespace-nowrap py-1.5 px-3.5 sm:py-2 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'reports'
                    ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)]'
                    : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Reports
              </button>
            </>
          )}
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
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mobile View (Single-line Rows below 768px: avatar | name and handle | actions) */}
                    <div className="md:hidden glass-card rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--card)] shadow-md divide-y divide-[var(--line)]">
                      {filteredUsers.map(u => (
                        <div 
                          key={u.id} 
                          className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 min-h-[72px] hover:bg-[var(--hover)] transition-colors"
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
                      <option value="admin">👤 Admin (My Username & Avatar)</option>
                      <option value="system">🤖 System Identity (DataVerse Logo)</option>
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
                          <option value="admin">👤 From Admin Identity (Show Username & Avatar)</option>
                          <option value="system">🤖 From System Identity (Anonymous, Show Site Logo)</option>
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

          {/* TAB: SAFETY REPORTS (TOP ADMIN ONLY) */}
          {activeTab === 'reports' && currentUser?.is_top_admin && (
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
                          <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center gap-2">
                            <AlertTriangle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
                            <span className="text-[10px] font-extrabold text-red-400">
                              Reported Account: @{report.reported_username}
                            </span>
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
                      <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/[0.03]">
                        <span className="text-[9px] text-slate-600 font-semibold font-mono">
                          ID: {report.id}
                        </span>
                        <button
                          onClick={() => handleResolveReport(report.id)}
                          className="py-2 px-5 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-brand-500/10"
                        >
                          Mark Resolved
                        </button>
                      </div>
                    </div>
                  ))}
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

    </div>
  );
};

export default Admin;
