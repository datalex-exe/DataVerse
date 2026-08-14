import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Search
} from 'lucide-react';

interface SystemUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_admin: boolean;
  is_top_admin: boolean;
  is_blocked: boolean;
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
}

interface AuditMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export const Admin: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'users' | 'chats' | 'restrictions' | 'verifications' | 'reports'>('users');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [convos, setConvos] = useState<SystemConvo[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restrictions & Notification Form States
  const [selectedUserForNotif, setSelectedUserForNotif] = useState<string>('all');
  const [notifText, setNotifText] = useState<string>('');
  const [sendingNotif, setSendingNotif] = useState<boolean>(false);
  const [notifSuccess, setNotifSuccess] = useState<boolean>(false);

  const [selectedUserForRestrict, setSelectedUserForRestrict] = useState<string>('');
  const [restrictDuration, setRestrictDuration] = useState<number>(60);
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

  const handleResolveReport = async (reportId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to resolve this report? It will be deleted from the safety queue.')) return;

    try {
      const res = await fetch(`/api/users/admin/reports/${reportId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== reportId));
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to resolve report');
      }
    } catch (err) {
      console.error(err);
      alert('Network error resolving report');
    }
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
          text: notifText.trim()
        })
      });

      if (res.ok) {
        setNotifSuccess(true);
        setNotifText('');
        setTimeout(() => setNotifSuccess(false), 3000);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to send notification');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send notification');
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
        body: JSON.stringify({ minutes })
      });

      if (res.ok) {
        setRestrictSuccess(true);
        await fetchUsers();
        setTimeout(() => setRestrictSuccess(false), 3000);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to update chat restriction');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update chat restriction');
    } finally {
      setApplyingRestriction(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    if (activeTab === 'users' || activeTab === 'restrictions' || activeTab === 'verifications') {
      await fetchUsers();
    } else if (activeTab === 'reports') {
      await fetchReports();
    } else {
      await fetchConvos();
    }
    setLoading(false);
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
      const res = await fetch(`/api/conversations/${convo.id}/messages`, {
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
      alert('Cannot block yourself.');
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
    } catch {
      // Revert state
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_blocked: !nextState } : u));
    }
  };

  const getCleanLabel = (convo: SystemConvo) => {
    if (convo.is_group) return `Group Chat (ID: ${convo.id.substring(0, 8)})`;
    const otherMembers = convo.members.filter(m => m.username !== currentUser?.username);
    if (otherMembers.length === 0) return 'Self Chat';
    return `${otherMembers[0].display_name || otherMembers[0].username} & ${currentUser?.display_name || currentUser?.username}`;
  };

  if (currentUser?.is_admin !== true && currentUser?.is_top_admin !== true) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4 select-none">
        <Lock className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-sm font-black text-white uppercase tracking-widest">Access Restricted</h3>
        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
          This workspace is reserved exclusively for DataVerse Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fade-in select-none">
      
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Shield className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-wide uppercase">Admin Console</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Global DataVerse platform directory and message logs audit system.</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto pb-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 sm:flex-none py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'users'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                : 'bg-slate-950 border border-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Users
          </button>
          {currentUser?.is_top_admin && (
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 sm:flex-none py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'chats'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                  : 'bg-slate-950 border border-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Chats
            </button>
          )}
          <button
            onClick={() => setActiveTab('restrictions')}
            className={`flex-1 sm:flex-none py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'restrictions'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                : 'bg-slate-950 border border-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Restrictions
          </button>
          {currentUser?.is_top_admin && (
            <>
              <button
                onClick={() => setActiveTab('verifications')}
                className={`flex-1 sm:flex-none py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === 'verifications'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                    : 'bg-slate-950 border border-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Verifications
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex-1 sm:flex-none py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === 'reports'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                    : 'bg-slate-950 border border-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Reports
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-2xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          <p className="text-xs">Fetching system data logs...</p>
        </div>
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
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    className="w-full bg-[#060608]/40 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-slate-655 focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="text-center py-20 text-slate-600 text-xs font-semibold glass-card rounded-3xl border border-white/5 bg-[#060608]/40">
                    No users matching "{searchUserQuery}" found.
                  </div>
                ) : (
                  <>
                    {/* Desktop View (Table) */}
                    <div className="hidden md:block glass-card rounded-3xl overflow-hidden border border-white/5 bg-[#060608]/40 shadow-xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/[0.04] bg-slate-950/40 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                              <th className="py-4 px-6">User</th>
                              <th className="py-4 px-4 text-center">Status</th>
                              <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.02] text-xs">
                            {filteredUsers.map(u => (
                              <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                                
                                {/* User credentials */}
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8.5 h-8.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-400">
                                      {u.avatar_url ? (
                                        <img src={`/api/media/file/${u.avatar_url}`} alt={u.username} className="w-full h-full object-cover" />
                                      ) : (
                                        u.username.substring(0, 2).toUpperCase()
                                      )}
                                    </div>
                                    <div>
                                      <h5 className="font-extrabold text-white flex items-center gap-1.5">
                                        {u.display_name || u.username}
                                        {!!u.is_verified && <VerifiedBadge size={12} />}
                                      </h5>
                                      <p className="text-[10px] text-slate-500">@{u.username}</p>
                                    </div>
                                  </div>
                                </td>

                                {/* Status badges */}
                                <td className="py-4 px-4 text-center">
                                  <div className="flex justify-center gap-1.5 flex-wrap max-w-xs mx-auto">
                                    {u.is_top_admin && (
                                      <span className="text-[8px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Top Admin</span>
                                    )}
                                    {u.is_admin && !u.is_top_admin && (
                                      <span className="text-[8px] font-black text-brand-400 bg-brand-400/10 border border-brand-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
                                    )}
                                    {u.is_blocked && (
                                      <span className="text-[8px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Blocked</span>
                                    )}
                                    {!u.is_admin && !u.is_blocked && (
                                      <span className="text-[8px] font-black text-slate-500 bg-slate-950 border border-slate-900 px-2 py-0.5 rounded-full uppercase tracking-wider">Member</span>
                                    )}
                                  </div>
                                </td>

                                {/* Actions toggle buttons */}
                                <td className="py-4 px-6 text-right">
                                  <div className="flex gap-2 justify-end">
                                    
                                    {/* Toggle Verification */}
                                    {currentUser?.is_top_admin && (
                                      <button
                                        onClick={() => handleToggleVerify(u)}
                                        className={`p-2 rounded-xl border transition-all ${
                                          u.is_verified
                                            ? 'bg-brand-600/10 border-brand-500/30 text-brand-400 hover:bg-brand-600/20'
                                            : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-white'
                                        }`}
                                        title="Toggle Verified badge"
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* Toggle Admin Privilege (Disabled if target is the Top Admin) */}
                                    {currentUser?.is_top_admin && (
                                      <button
                                        onClick={() => handleToggleAdmin(u)}
                                        disabled={u.is_top_admin}
                                        className={`p-2 rounded-xl border transition-all ${
                                          u.is_top_admin
                                            ? 'bg-slate-955 border-slate-900 text-slate-655 cursor-not-allowed'
                                            : u.is_admin
                                            ? 'bg-amber-400/10 border-amber-400/30 text-amber-400 hover:bg-amber-400/20'
                                            : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-white'
                                        }`}
                                        title="Toggle Admin Rights"
                                      >
                                        <Shield className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* Toggle Block Account */}
                                    <button
                                      onClick={() => handleToggleBlock(u)}
                                      disabled={u.id === currentUser?.id || u.is_top_admin}
                                      className={`p-2 rounded-xl border transition-all ${
                                        u.id === currentUser?.id || u.is_top_admin
                                          ? 'bg-slate-955 border-slate-900 text-slate-655 cursor-not-allowed'
                                          : u.is_blocked
                                          ? 'bg-red-600/10 border-red-500/30 text-red-500 hover:bg-red-600/20'
                                          : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-red-400 hover:border-red-500/20'
                                      }`}
                                      title="Toggle Block Account"
                                    >
                                      {u.is_blocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                    </button>

                                  </div>
                                </td>

                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile View (Cards) */}
                    <div className="md:hidden space-y-4">
                      {filteredUsers.map(u => (
                        <div key={u.id} className="glass-card p-4 rounded-2xl border border-white/5 bg-[#060608]/40 space-y-4 shadow-md">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-400">
                                {u.avatar_url ? (
                                  <img src={`/api/media/file/${u.avatar_url}`} alt={u.username} className="w-full h-full object-cover" />
                                ) : (
                                  u.username.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div>
                                <h5 className="font-extrabold text-xs text-white flex items-center gap-1.5">
                                  {u.display_name || u.username}
                                  {!!u.is_verified && <VerifiedBadge size={11} />}
                                </h5>
                                <p className="text-[10px] text-slate-500">@{u.username}</p>
                              </div>
                            </div>
                            
                            {/* Status Badge */}
                            <div className="flex-shrink-0">
                              {u.is_top_admin && (
                                <span className="text-[8px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Top Admin</span>
                              )}
                              {u.is_admin && !u.is_top_admin && (
                                <span className="text-[8px] font-black text-brand-400 bg-brand-400/10 border border-brand-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
                              )}
                              {u.is_blocked && (
                                <span className="text-[8px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Blocked</span>
                              )}
                              {!u.is_admin && !u.is_blocked && (
                                <span className="text-[8px] font-black text-slate-500 bg-slate-950 border border-slate-900 px-2 py-0.5 rounded-full uppercase tracking-wider">Member</span>
                              )}
                            </div>
                          </div>

                          {/* Actions bar */}
                          <div className="flex items-center justify-between border-t border-white/[0.03] pt-3">
                            <span className="text-[9px] text-slate-555 font-bold uppercase tracking-wider">Actions</span>
                            <div className="flex gap-2">
                              {/* Toggle Verification */}
                              {currentUser?.is_top_admin && (
                                <button
                                  onClick={() => handleToggleVerify(u)}
                                  className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                                    u.is_verified
                                      ? 'bg-brand-600/10 border-brand-500/30 text-brand-400'
                                      : 'bg-slate-950 border-slate-900 text-slate-550'
                                  }`}
                                  title="Toggle Verification"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Toggle Admin */}
                              {currentUser?.is_top_admin && (
                                <button
                                  onClick={() => handleToggleAdmin(u)}
                                  disabled={u.is_top_admin}
                                  className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                                    u.is_top_admin
                                      ? 'bg-slate-955 border-slate-900 text-slate-655 cursor-not-allowed'
                                      : u.is_admin
                                      ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                                      : 'bg-slate-950 border-slate-900 text-slate-550'
                                  }`}
                                  title="Toggle Admin Rights"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Toggle Block */}
                              <button
                                onClick={() => handleToggleBlock(u)}
                                disabled={u.id === currentUser?.id || u.is_top_admin}
                                className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                                  u.id === currentUser?.id || u.is_top_admin
                                    ? 'bg-slate-955 border-slate-900 text-slate-655 cursor-not-allowed'
                                    : u.is_blocked
                                    ? 'bg-red-600/10 border-red-500/30 text-red-500'
                                    : 'bg-slate-950 border-slate-900 text-slate-550 hover:text-red-400'
                                }`}
                                title="Toggle Block Account"
                              >
                                {u.is_blocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* TAB: GLOBAL CHATS AUDITING */}
          {activeTab === 'chats' && currentUser?.is_top_admin && (
            <div className="grid grid-cols-1 gap-4">
              {convos.length === 0 ? (
                <div className="text-center py-20 text-slate-600 text-xs font-semibold">
                  No active system conversations log found.
                </div>
              ) : (
                convos.map(c => (
                  <div 
                    key={c.id}
                    className="glass-card p-5 rounded-3xl border border-white/5 bg-[#060608]/40 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-950 border border-slate-900 px-2 py-0.5 rounded-full select-none">
                          {c.is_group ? 'Group' : 'DM'}
                        </span>
                        <h4 className="text-xs font-extrabold text-white">{getCleanLabel(c)}</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate max-w-md">
                        {c.last_message ? `Last message: "${c.last_message.body}"` : 'No messages yet.'}
                      </p>
                    </div>

                    <button
                      onClick={() => loadAuditHistory(c)}
                      className="w-full sm:w-auto py-2.5 px-5 bg-brand-650 hover:bg-brand-550 text-white text-[10px] font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/5 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Audit Chat History
                    </button>
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
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide">Target Recipient</label>
                    <input
                      type="text"
                      placeholder="Filter by username..."
                      value={searchNotifUser}
                      onChange={(e) => setSearchNotifUser(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-900 rounded-xl px-3 py-1.5 text-[11px] text-slate-200 outline-none focus:border-brand-500 transition-all placeholder:text-slate-800"
                    />
                    <select
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
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide">Message Text</label>
                    <textarea
                      placeholder="Type notification alert..."
                      value={notifText}
                      onChange={(e) => setNotifText(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-brand-500 transition-colors resize-none"
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
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide">Select User</label>
                      <input
                        type="text"
                        placeholder="Filter by username..."
                        value={searchRestrictUser}
                        onChange={(e) => setSearchRestrictUser(e.target.value)}
                        className="w-full bg-[#060608]/40 border border-slate-900 rounded-xl px-3 py-1.5 text-[11px] text-slate-200 outline-none focus:border-brand-500 transition-all placeholder:text-slate-800"
                      />
                      <select
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
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide">Restriction Duration</label>
                      <select
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
                        <p className="text-center py-4 text-slate-655 text-[9px] font-semibold">No active chat restrictions.</p>
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
                              <div className="w-6.5 h-6.5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[8px] font-extrabold text-slate-400 overflow-hidden select-none flex-shrink-0">
                                {u.avatar_url ? (
                                  <img src={`/api/media/file/${u.avatar_url}`} alt={u.username} className="w-full h-full object-cover" />
                                ) : (
                                  u.username.substring(0, 2).toUpperCase()
                                )}
                              </div>
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
                <div className="p-12 border border-white/[0.04] bg-[#060608]/20 rounded-3xl text-center select-none">
                  <Sparkles className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-xs text-slate-550 font-bold">No pending verification requests at this time.</p>
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
                            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-400">
                              {u.avatar_url ? (
                                <img src={`/api/media/file/${u.avatar_url}`} alt={u.username} className="w-full h-full object-cover" />
                              ) : (
                                u.username.substring(0, 2).toUpperCase()
                              )}
                            </div>
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
                <div className="p-12 border border-white/[0.04] bg-[#060608]/20 rounded-3xl text-center select-none">
                  <AlertTriangle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-xs text-slate-550 font-bold">No active reports. The safety queue is clean!</p>
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
          <div className="w-full max-w-2xl bg-[#030303] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[90vh] sm:h-[80vh] max-h-[92vh] sm:max-h-[580px] shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-white/[0.04] flex items-center justify-between bg-slate-950/40">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-brand-400" />
                  Audit: {getCleanLabel(auditingConvo)}
                </h3>
                <p className="text-[9px] text-slate-550 mt-0.5">Audit log view. Read-only monitor mode.</p>
              </div>
              <button 
                onClick={() => setAuditingConvo(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
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
                  const parseMessageBody = (rawBody: string) => {
                    if (rawBody.startsWith('{') && rawBody.endsWith('}')) {
                      try {
                        const obj = JSON.parse(rawBody);
                        if (obj && obj.type === 'secure_media') {
                          return obj;
                        }
                      } catch {}
                    }
                    return null;
                  };

                  const secureMedia = parseMessageBody(m.body);
                  
                  return (
                    <div key={m.id} className="flex gap-3">
                      
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden text-[9px] font-bold text-slate-400 select-none">
                        {isSystem ? (
                          <span>S</span>
                        ) : m.avatar_url ? (
                          <img src={`/api/media/file/${m.avatar_url}`} alt={m.username} className="w-full h-full object-cover" />
                        ) : (
                          m.username.substring(0, 2).toUpperCase()
                        )}
                      </div>

                      {/* Msg text bubble */}
                      <div className="bg-slate-950/50 border border-white/[0.02] p-3 rounded-2xl flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-extrabold text-white flex items-center gap-1">
                            {isSystem ? 'System Broadcast' : m.display_name || m.username}
                          </span>
                          <span className="text-[8px] text-slate-655 font-bold">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        {secureMedia ? (
                          <div className="space-y-1.5 mt-1">
                            {secureMedia.media_type === 'image' && (
                              <div className="relative rounded-xl overflow-hidden border border-white/[0.04] bg-[#020202] max-w-xs shadow-md">
                                <img 
                                  src={`/api/media/file/${secureMedia.url}`} 
                                  alt="Audited secure photo" 
                                  className="w-full max-h-48 object-cover"
                                />
                              </div>
                            )}
                            {secureMedia.media_type === 'video' && (
                              <div className="relative rounded-xl overflow-hidden border border-white/[0.04] bg-[#020202] max-w-xs shadow-md">
                                <video 
                                  src={`/api/media/file/${secureMedia.url}`} 
                                  className="w-full max-h-48 object-cover"
                                  controls
                                />
                              </div>
                            )}
                            {secureMedia.media_type === 'voice' && (
                              <span className="text-[10px] text-slate-500 italic bg-slate-900/60 border border-white/[0.02] px-2.5 py-1 rounded-lg inline-block">
                                Voice message file: {secureMedia.url.substring(0, 15)}...
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-350 leading-relaxed break-words">{m.body}</p>
                        )}
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

    </div>
  );
};

export default Admin;
