import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { compressImage } from '../utils/compress';
import { uploadMediaFile } from '../utils/upload';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ImageCropper } from '../components/ImageCropper';
import { 
  Loader2, 
  Heart, 
  MessageCircle, 
  Camera, 
  Grid, 
  Bookmark,
  Check,
  Plus,
  Settings,
  User,
  Lock,
  Key,
  ArrowLeft,
  Sparkles,
  Flag,
  Trash,
  LogOut,
  Clock,
  AlertTriangle,
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Download,
  RefreshCw,
  BadgeCheck,
  UserX,
  SunMoon,
  ChevronRight,
  Mail
} from 'lucide-react';
/* THEME START */
import { SettingsThemeControl } from '../utils/theme';
/* THEME END */

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
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  media: Media[];
}

interface ProfileUser {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
  is_admin?: boolean;
  is_top_admin?: boolean;
  created_at: number;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_followed_by?: boolean;
  is_requested?: boolean;
  is_private?: boolean;
  is_verification_paid?: boolean;
  verification_paid_at?: number;
  verification_category?: string | null;
  verification_document_url?: string | null;
  verification_reason?: string | null;
  verification_status?: string;
  posts_count?: number;
}

interface ProfileProps {
  targetUsername?: string;
  onNavigate: (view: string, targetUsername?: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ targetUsername, onNavigate }) => {
  const { user: currentUser, token, updateUser, logout } = useAuth();
  const { toast } = useToast();
  
  const usernameToLoad = targetUsername || currentUser?.username;
  const isOwnProfile = !targetUsername || targetUsername.toLowerCase() === currentUser?.username.toLowerCase();

  const [profile, setProfile] = useState<ProfileUser | null>(() => {
    if (isOwnProfile && currentUser) {
      try {
        const cached = sessionStorage.getItem('dv_cached_own_profile');
        if (cached) return JSON.parse(cached);
      } catch {}
      return {
        id: currentUser.id,
        username: currentUser.username,
        display_name: currentUser.display_name,
        bio: currentUser.bio || '',
        avatar_url: currentUser.avatar_url,
        is_verified: currentUser.is_verified,
        is_admin: currentUser.is_admin,
        is_top_admin: currentUser.is_top_admin,
        created_at: currentUser.created_at || Date.now(),
        followers_count: 0,
        following_count: 0,
        is_following: false,
      };
    }
    return null;
  });
  const [posts, setPosts] = useState<Post[]>(() => {
    if (isOwnProfile) {
      try {
        const cached = sessionStorage.getItem('dv_cached_own_posts');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(() => {
    if (isOwnProfile && currentUser) return false;
    return true;
  });
  const [error, setError] = useState<string | null>(null);

  // Profile tabs state
  const [activeSubTab, setActiveSubTab] = useState<string>('posts'); // 'posts' | 'saved'

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  /* THEME START */
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'edit_profile' | 'security' | 'verification' | 'privacy' | 'password' | 'report' | 'blocked_users' | 'theme'>('edit_profile');
  const [phoneDetailOpen, setPhoneDetailOpen] = useState<boolean>(false);
  const navContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSettings) return;
    const onPopState = () => {
      // Browser/phone Back button returns from detail to settings list on mobile
      setPhoneDetailOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [showSettings]);
  /* THEME END */

  // Two-Factor Authentication (2FA) State
  const [twoFactorStatus, setTwoFactorStatus] = useState<{
    enabled: boolean;
    enabled_at: number | null;
    backup_codes_remaining: number;
  } | null>(null);
  const [loading2FA, setLoading2FA] = useState<boolean>(false);

  // 2FA Setup Wizard States
  const [isSettingUp2FA, setIsSettingUp2FA] = useState<boolean>(false);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1); // 1: Password, 2: Scan QR & Verify, 3: Backup Codes
  const [setupPassword, setSetupPassword] = useState<string>('');
  const [setupQrData, setSetupQrData] = useState<{
    secret: string;
    otpauth_uri: string;
    qr_code_svg: string;
    expires_in_seconds: number;
  } | null>(null);
  const [setupVerifyCode, setSetupVerifyCode] = useState<string>('');
  const [setupBackupCodes, setSetupBackupCodes] = useState<string[]>([]);
  const [backupCodesAcknowledged, setBackupCodesAcknowledged] = useState<boolean>(false);
  const [setupSubmitting, setSetupSubmitting] = useState<boolean>(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // 2FA Disable States
  const [isDisabling2FA, setIsDisabling2FA] = useState<boolean>(false);
  const [disablePassword, setDisablePassword] = useState<string>('');
  const [disableCode, setDisableCode] = useState<string>('');
  const [disableSubmitting, setDisableSubmitting] = useState<boolean>(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  // 2FA Regenerate Backup Codes States
  const [isRegeneratingCodes, setIsRegeneratingCodes] = useState<boolean>(false);
  const [regenCode, setRegenCode] = useState<string>('');
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [regenSubmitting, setRegenSubmitting] = useState<boolean>(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  // Blocked users list states
  const [blockedUsersList, setBlockedUsersList] = useState<any[]>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState<boolean>(false);
  
  // Settings form input states
  const [displayNameInput, setDisplayNameInput] = useState<string>('');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [bioInput, setBioInput] = useState<string>('');
  const [categoryInput, setCategoryInput] = useState<string>('Creator');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [isPrivateInput, setIsPrivateInput] = useState<boolean>(false);

  // Premium Verification States
  const [verificationDocFile, setVerificationDocFile] = useState<File | null>(null);
  const [uploadingVerificationDoc, setUploadingVerificationDoc] = useState<boolean>(false);
  const [payingVerification, setPayingVerification] = useState<boolean>(false);
  const [timeRemainingText, setTimeRemainingText] = useState<string>('');

  // Report form state
  const [reportTypeInput, setReportTypeInput] = useState<string>('spam');
  const [reportDescInput, setReportDescInput] = useState<string>('');
  const [reportedUsernameInput, setReportedUsernameInput] = useState<string>('');
  const [reportSubmitting, setReportSubmitting] = useState<boolean>(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);
  const [reportErrorMsg, setReportErrorMsg] = useState<string | null>(null);

  // Status logs
  const [verifyingState, setVerifyingState] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [settingsErrorMsg, setSettingsErrorMsg] = useState<string | null>(null);

  // Blocking States
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [viewerBlocked, setViewerBlocked] = useState<boolean>(false);

  // Followers / Following Modal States
  const [showConnectionsModal, setShowConnectionsModal] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalUsersList, setModalUsersList] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  // Avatar cropping state
  const [avatarToCrop, setAvatarToCrop] = useState<File | null>(null);

  const fetchFollowers = async () => {
    if (!profile || !token) return;
    setModalLoading(true);
    setModalTitle('Followers');
    setShowConnectionsModal(true);
    try {
      const res = await fetch(`/api/users/profile/${profile.username}/followers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setModalUsersList(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!profile || !token) return;
    setModalLoading(true);
    setModalTitle('Following');
    setShowConnectionsModal(true);
    try {
      const res = await fetch(`/api/users/profile/${profile.username}/following`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setModalUsersList(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const canSeeStats = profile 
    ? (!profile.is_private || profile.is_following || isOwnProfile || currentUser?.is_admin || currentUser?.is_top_admin) 
    : false;

  const handleBlockUser = async () => {
    if (!profile || !token) return;
    if (!confirm(`Are you sure you want to block @${profile.username}?`)) return;
    try {
      const res = await fetch(`/api/users/${profile.id}/block-user`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setIsBlocked(true);
        setViewerBlocked(false);
        fetchProfileData();
        toast.success(`Blocked @${profile.username}`);
      } else {
        toast.error('Failed to block user');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error blocking user');
    }
  };

  const handleUnblockUser = async () => {
    if (!profile || !token) return;
    try {
      const res = await fetch(`/api/users/${profile.id}/block-user`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setIsBlocked(false);
        setViewerBlocked(false);
        fetchProfileData();
        toast.success(`Unblocked @${profile.username}`);
      } else {
        toast.error('Failed to unblock user');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error unblocking user');
    }
  };

  const fetchBlockedUsers = async () => {
    if (!token) return;
    setLoadingBlockedUsers(true);
    try {
      const res = await fetch('/api/users/blocked-list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedUsersList(data.blockedUsers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBlockedUsers(false);
    }
  };

  const handleUnblockUserFromList = async (targetId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${targetId}/block-user`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchBlockedUsers();
      } else {
        alert('Failed to unblock user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (settingsTab === 'blocked_users') {
      fetchBlockedUsers();
    }
  }, [settingsTab]);

  const fetchProfileData = async () => {
    if (!usernameToLoad || !token) return;
    if (!profile) setLoading(true);
    setError(null);

    try {
      // 1. Fetch user stats
      const profileRes = await fetch(`/api/users/${usernameToLoad}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!profileRes.ok) {
        if (profileRes.status === 403) {
          const errData = await profileRes.json();
          if (errData.isBlocked) {
            setIsBlocked(true);
            setViewerBlocked(!!errData.viewerBlocked);
            setProfile({
              id: usernameToLoad,
              username: usernameToLoad,
              display_name: usernameToLoad,
              bio: '',
              avatar_url: '',
              is_verified: false,
              is_admin: false,
              is_top_admin: false,
              created_at: 0,
              followers_count: 0,
              following_count: 0,
              is_following: false,
              is_requested: false
            });
            setPosts([]);
            setLoading(false);
            return;
          }
        }
        throw new Error('User profile not found');
      }

      const profileData = await profileRes.json();
      setIsBlocked(false);
      setViewerBlocked(false);
      setProfile(profileData.user);
      if (isOwnProfile) {
        try {
          sessionStorage.setItem('dv_cached_own_profile', JSON.stringify(profileData.user));
        } catch {}
      }
      
      // Initialize settings form values if it's the current user
      if (isOwnProfile) {
        setDisplayNameInput(profileData.user.display_name || '');
        setUsernameInput(profileData.user.username || '');
        setEmailInput(currentUser?.email || '');
        setBioInput(profileData.user.bio || '');
        setIsPrivateInput(!!profileData.user.is_private);
      }

      // 2. Fetch user posts
      const postsRes = await fetch(`/api/posts/user/${usernameToLoad}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const userPosts = postsData.posts || [];
        setPosts(userPosts);
        if (isOwnProfile) {
          try {
            sessionStorage.setItem('dv_cached_own_posts', JSON.stringify(userPosts));
          } catch {}
        }
      }
    } catch (err: any) {
      if (!profile) {
        setError(err.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedPosts = async () => {
    if (!token || !currentUser) return;
    
    // Retrieve saved post IDs
    let savedIds: string[] = [];
    try {
      const stored = localStorage.getItem(`dataverse_saved_posts_${currentUser.id}`);
      savedIds = stored ? JSON.parse(stored) : [];
    } catch {
      savedIds = [];
    }

    if (savedIds.length === 0) {
      setSavedPosts([]);
      return;
    }

    setLoadingSaved(true);
    try {
      const fetched: Post[] = [];
      for (const id of savedIds) {
        const res = await fetch(`/api/posts/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          fetched.push(data.post);
        }
      }
      setSavedPosts(fetched);
    } catch (err) {
      console.error('Error fetching saved posts:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'saved') {
      fetchSavedPosts();
    }
  }, [activeSubTab]);

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

      // Optimistically remove from state
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete post');
    }
  };

  const refreshVerificationState = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        updateUser(data.user);
        if (profile) {
          setProfile({
            ...profile,
            is_verification_paid: data.user.is_verification_paid,
            verification_paid_at: data.user.verification_paid_at,
            verification_category: data.user.verification_category,
            verification_document_url: data.user.verification_document_url,
            verification_reason: data.user.verification_reason,
            verification_status: data.user.verification_status,
            is_verified: data.user.is_verified
          });
        }
        if (data.user.verification_category) {
          setCategoryInput(data.user.verification_category);
        }
        if (data.user.verification_reason) {
          setReasonInput(data.user.verification_reason);
        }
      }
    } catch (err) {
      console.error('Failed to refresh verification state:', err);
    }
  };

  useEffect(() => {
    if (showSettings && settingsTab === 'verification') {
      refreshVerificationState();
    }
  }, [showSettings, settingsTab]);

  const fetchTwoFactorStatus = async () => {
    if (!token) return;
    setLoading2FA(true);
    try {
      const res = await fetch('/api/auth/2fa/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTwoFactorStatus(data);
      }
    } catch (err) {
      console.error('Failed to load 2FA status:', err);
    } finally {
      setLoading2FA(false);
    }
  };

  useEffect(() => {
    if (showSettings && settingsTab === 'security') {
      fetchTwoFactorStatus();
    }
  }, [showSettings, settingsTab, token]);

  useEffect(() => {
    if (!profile || !profile.is_verification_paid || !profile.verification_paid_at) {
      setTimeRemainingText('');
      return;
    }

    const calculateTimeRemaining = () => {
      const paidAt = Number(profile.verification_paid_at);
      const deadline = paidAt + 3 * 24 * 60 * 60 * 1000;
      const diff = deadline - Date.now();

      if (diff <= 0) {
        setTimeRemainingText('Expired');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemainingText(`${hours}h ${mins}m ${secs}s`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [profile?.is_verification_paid, profile?.verification_paid_at]);

  useEffect(() => {
    fetchProfileData();
    setShowSettings(false);
  }, [usernameToLoad, token]);

  const handleFollowToggle = async () => {
    if (!profile || !token) return;

    const originalFollowingState = profile.is_following;
    const originalRequestedState = !!profile.is_requested;
    const originalFollowersCount = profile.followers_count;

    const isUnfollowing = originalFollowingState || originalRequestedState;

    if (isUnfollowing) {
      setProfile({
        ...profile,
        is_following: false,
        is_requested: false,
        followers_count: originalFollowersCount + (originalFollowingState ? -1 : 0)
      });

      try {
        const res = await fetch(`/api/users/${profile.id}/follow`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          setProfile(prev => prev ? {
            ...prev,
            is_following: originalFollowingState,
            is_requested: originalRequestedState,
            followers_count: originalFollowersCount
          } : null);
        }
      } catch (err) {
        console.error(err);
        setProfile(prev => prev ? {
          ...prev,
          is_following: originalFollowingState,
          is_requested: originalRequestedState,
          followers_count: originalFollowersCount
        } : null);
      }
    } else {
      const isPrivate = !!profile.is_private;
      setProfile({
        ...profile,
        is_following: !isPrivate,
        is_requested: isPrivate,
        followers_count: originalFollowersCount + (isPrivate ? 0 : 1)
      });

      try {
        const res = await fetch(`/api/users/${profile.id}/follow`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setProfile(prev => prev ? {
            ...prev,
            is_following: !!data.is_following,
            is_requested: !!data.is_requested
          } : null);
        } else {
          setProfile(prev => prev ? {
            ...prev,
            is_following: originalFollowingState,
            is_requested: originalRequestedState,
            followers_count: originalFollowersCount
          } : null);
        }
      } catch (err) {
        console.error(err);
        setProfile(prev => prev ? {
          ...prev,
          is_following: originalFollowingState,
          is_requested: originalRequestedState,
          followers_count: originalFollowersCount
        } : null);
      }
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file.');
        return;
      }
      setAvatarToCrop(file);
    }
  };

  const handleAvatarCropComplete = async (croppedFile: File) => {
    setAvatarToCrop(null);
    if (!token || !currentUser || !profile) return;

    setUploadingAvatar(true);
    try {
      const compressedAvatar = await compressImage(croppedFile, 400, 0.85);
      const fileExtension = croppedFile.name.split('.').pop() || 'jpg';
      const r2Key = `avatars/${currentUser.id}-${Date.now()}.${fileExtension}`;

      await uploadMediaFile(compressedAvatar, r2Key, token, 'image/jpeg');

      // Save in DB
      const saveRes = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: profile.display_name || profile.username,
          bio: profile.bio || '',
          avatar_url: r2Key
        })
      });

      if (!saveRes.ok) {
        throw new Error('Failed to save profile changes');
      }

      updateUser({ avatar_url: r2Key });
      setProfile({ ...profile, avatar_url: r2Key });
      toast.success('Profile photo updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save Settings: username, email, display_name, and bio
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !profile) return;
    setSettingsSuccessMsg(null);
    setSettingsErrorMsg(null);

    const targetUsername = usernameInput.trim();
    const targetEmail = emailInput.trim();
    const targetDisplayName = displayNameInput.trim();
    const targetBio = bioInput.trim();

    if (targetUsername === '') {
      setSettingsErrorMsg('Username cannot be empty');
      return;
    }
    if (targetEmail === '') {
      setSettingsErrorMsg('Email cannot be empty');
      return;
    }

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: targetUsername,
          email: targetEmail,
          display_name: targetDisplayName,
          bio: targetBio,
          avatar_url: profile.avatar_url || ''
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save changes');
      }

      const oldUsername = profile.username;

      setProfile({
        ...profile,
        username: targetUsername,
        display_name: targetDisplayName,
        bio: targetBio
      });

      updateUser({
        username: targetUsername,
        email: targetEmail,
        display_name: targetDisplayName,
        bio: targetBio
      });

      setSettingsSuccessMsg('Profile details updated successfully.');

      if (oldUsername.toLowerCase() !== targetUsername.toLowerCase()) {
        setTimeout(() => {
          onNavigate('profile', targetUsername);
        }, 1000);
      }
    } catch (err: any) {
      setSettingsErrorMsg(err.message || 'Failed to save profile settings.');
    }
  };

  const handleTogglePrivacy = async (checked: boolean) => {
    if (!token || !profile) return;
    setSettingsSuccessMsg(null);
    setSettingsErrorMsg(null);
    try {
      const res = await fetch('/api/users/profile/privacy', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_private: checked })
      });
      if (res.ok) {
        setIsPrivateInput(checked);
        setProfile({ ...profile, is_private: checked });
        updateUser({ is_private: checked });
        setSettingsSuccessMsg(`Account privacy changed to ${checked ? 'Private' : 'Public'}.`);
      } else {
        const data = await res.json();
        setSettingsErrorMsg(data.error || 'Failed to update privacy settings');
      }
    } catch (err) {
      console.error(err);
      setSettingsErrorMsg('Failed to update privacy settings');
    }
  };

  // Save Settings: Pay Verification Fee
  const handlePayVerification = async () => {
    if (!token || !profile) return;
    setSettingsSuccessMsg(null);
    setSettingsErrorMsg(null);
    setPayingVerification(true);
    try {
      const res = await fetch('/api/users/profile/verify/pay', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Payment processing failed');
      }

      setSettingsSuccessMsg('Payment processed successfully. Your 3-day verification window is now active!');
      await refreshVerificationState();
    } catch (err: any) {
      setSettingsErrorMsg(err.message || 'Payment simulation failed.');
    } finally {
      setPayingVerification(false);
    }
  };

  // Save Settings: Request Verification (Upload document & Submit details)
  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !profile || !currentUser) return;
    setSettingsSuccessMsg(null);
    setSettingsErrorMsg(null);

    let finalDocUrl = profile.verification_document_url || '';

    if (!finalDocUrl && !verificationDocFile) {
      setSettingsErrorMsg('Please select a supporting document file to upload.');
      return;
    }

    setVerifyingState('submitting');

    try {
      // 1. Upload file if selected
      if (verificationDocFile) {
        setUploadingVerificationDoc(true);
        const fileExtension = verificationDocFile.name.split('.').pop() || 'jpg';
        const docKey = `verifications/${currentUser.id}-${Date.now()}.${fileExtension}`;

        await uploadMediaFile(
          verificationDocFile,
          docKey,
          token,
          verificationDocFile.type || 'application/octet-stream'
        );

        finalDocUrl = docKey;
        setUploadingVerificationDoc(false);
      }

      // 2. Submit details
      const res = await fetch('/api/users/profile/verify', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: categoryInput,
          document_url: finalDocUrl,
          reason: reasonInput
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit verification details');
      }

      setSettingsSuccessMsg('Verification details submitted successfully! The top admin has been notified.');
      setVerificationDocFile(null);
      await refreshVerificationState();
    } catch (err: any) {
      setSettingsErrorMsg(err.message || 'Failed to submit verification request.');
    } finally {
      setVerifyingState('idle');
      setUploadingVerificationDoc(false);
    }
  };

  // Save Settings: Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !profile) return;
    setSettingsSuccessMsg(null);
    setSettingsErrorMsg(null);

    if (!currentPasswordInput) {
      setSettingsErrorMsg('Please enter your current password.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setSettingsErrorMsg('New passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: profile.display_name || profile.username,
          bio: profile.bio || '',
          avatar_url: profile.avatar_url || '',
          current_password: currentPasswordInput,
          new_password: newPasswordInput.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Password update failed');
      }

      setSettingsSuccessMsg('Your account password was updated successfully.');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err: any) {
      setSettingsErrorMsg(err.message || 'Failed to change password.');
    }
  };

  // ─── 2FA HANDLERS ──────────────────────────────────────────────────────────
  const handleStartSetup2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSetupError(null);
    setSetupSubmitting(true);
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: setupPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate 2FA setup');
      }
      setSetupQrData(data);
      setSetupStep(2);
      setSetupPassword('');
    } catch (err: any) {
      setSetupError(err.message || 'Verification failed. Please check your password.');
    } finally {
      setSetupSubmitting(false);
    }
  };

  const handleConfirmEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSetupError(null);
    setSetupSubmitting(true);
    try {
      const cleanCode = setupVerifyCode.replace(/\D/g, '').trim();
      if (cleanCode.length !== 6) {
        throw new Error('Please enter the 6-digit verification code from your authenticator app.');
      }
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: cleanCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify 2FA code');
      }
      setSetupBackupCodes(data.backup_codes || []);
      setSetupStep(3);
      setSetupVerifyCode('');
      toast.success('Two-factor authentication code verified!');
    } catch (err: any) {
      setSetupError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setSetupSubmitting(false);
    }
  };

  const handleFinishSetup2FA = () => {
    setIsSettingUp2FA(false);
    setSetupStep(1);
    setSetupQrData(null);
    setSetupBackupCodes([]);
    setBackupCodesAcknowledged(false);
    fetchTwoFactorStatus();
    toast.success('Two-factor authentication is now active on your account!');
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setDisableError(null);
    setDisableSubmitting(true);
    try {
      const cleanCode = disableCode.replace(/\D/g, '').trim();
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: disablePassword, code: cleanCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }
      toast.success('Two-factor authentication has been disabled.');
      setIsDisabling2FA(false);
      setDisablePassword('');
      setDisableCode('');
      fetchTwoFactorStatus();
    } catch (err: any) {
      setDisableError(err.message || 'Failed to disable 2FA. Check your password and code.');
    } finally {
      setDisableSubmitting(false);
    }
  };

  const handleRegenerateBackupCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setRegenError(null);
    setRegenSubmitting(true);
    try {
      const cleanCode = regenCode.replace(/\D/g, '').trim();
      const res = await fetch('/api/auth/2fa/backup-codes/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: cleanCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to regenerate backup codes');
      }
      setNewBackupCodes(data.backup_codes || []);
      setRegenCode('');
      fetchTwoFactorStatus();
      toast.success('New backup codes generated successfully.');
    } catch (err: any) {
      setRegenError(err.message || 'Failed to regenerate backup codes.');
    } finally {
      setRegenSubmitting(false);
    }
  };

  const handleCopyBackupCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n'));
    toast.success('Backup codes copied to clipboard!');
  };

  const handleDownloadBackupCodes = (codes: string[]) => {
    const username = profile?.username || currentUser?.username || 'user';
    const content = `DATAVERSE TWO-FACTOR AUTHENTICATION BACKUP CODES
Account: @${username}
Generated: ${new Date().toLocaleString()}

Keep these single-use codes stored in a secure offline vault or password manager.
Each code can only be used once if you lose access to your authenticator app.

${codes.map((c, idx) => `${String(idx + 1).padStart(2, ' ')}. ${c}`).join('\n')}

NEVER share these codes with anyone. DataVerse staff will never ask for them.
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dataverse-2fa-backup-codes-${username}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Backup codes saved to file.');
  };
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setReportSuccessMsg(null);
    setReportErrorMsg(null);
    setReportSubmitting(true);

    try {
      const res = await fetch('/api/users/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          report_type: reportTypeInput,
          description: reportDescInput.trim(),
          reported_username: reportedUsernameInput.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setReportSuccessMsg(`Report submitted successfully (ID: ${data.report_id}). Our safety team will review it shortly.`);
      setReportDescInput('');
      setReportedUsernameInput('');
      setReportTypeInput('spam');
    } catch (err: any) {
      setReportErrorMsg(err.message || 'Failed to submit report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleMessageUser = async () => {
    if (!profile || !token) return;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_group: false,
          members: [profile.id]
        })
      });

      if (res.ok) {
        onNavigate('messages');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        <p className="text-xs">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="w-full max-w-xl mx-auto self-center py-20 px-4 text-center space-y-4">
        <div className="text-red-500 font-extrabold text-sm">Error Loading Profile</div>
        <p className="text-slate-500 text-xs">{error || 'User not found'}</p>
        <button 
          onClick={() => onNavigate('feed')}
          className="py-2 px-5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow transition-all uppercase tracking-wider"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  const formatStat = (num: number) => {
    return num.toLocaleString();
  };

  // Settings Navigation Configuration & Handlers
  interface SettingsTabItem {
    id: 'edit_profile' | 'security' | 'verification' | 'privacy' | 'password' | 'report' | 'blocked_users' | 'theme';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isDanger?: boolean;
  }

  interface SettingsSection {
    title: string;
    tabs: SettingsTabItem[];
  }

  const SETTINGS_SECTIONS: SettingsSection[] = [
    {
      title: 'Account',
      tabs: [
        { id: 'edit_profile', label: 'Edit Profile', icon: User },
        { id: 'verification', label: 'Request Verification', icon: BadgeCheck },
      ],
    },
    {
      title: 'Privacy & security',
      tabs: [
        { id: 'privacy', label: 'Account Privacy', icon: Lock },
        { id: 'password', label: 'Change Password', icon: Key },
        { id: 'security', label: 'Security & 2FA', icon: Shield },
        { id: 'blocked_users', label: 'Blocked Users', icon: UserX },
      ],
    },
    {
      title: 'Preferences',
      tabs: [
        { id: 'theme', label: 'Theme & Appearance', icon: SunMoon },
      ],
    },
    {
      title: 'Support',
      tabs: [
        { id: 'report', label: 'Report a Problem', icon: Flag, isDanger: true },
      ],
    },
  ];

  const getTabMeta = (tab: typeof settingsTab) => {
    switch (tab) {
      case 'edit_profile':
        return {
          title: 'Edit Profile',
          description: 'Update your username, email, display name and biography details.',
          icon: User,
          isDanger: false,
        };
      case 'verification':
        return {
          title: 'DataVerse Verified',
          description: 'Establish your authentic presence on DataVerse. Premium verification helps you stand out and secure your identity.',
          icon: BadgeCheck,
          isDanger: false,
        };
      case 'privacy':
        return {
          title: 'Account Privacy',
          description: 'Control who can interact with your profile and view your media.',
          icon: Lock,
          isDanger: false,
        };
      case 'password':
        return {
          title: 'Change Password',
          description: 'Enter your current password and a new secure password below to update your login credentials.',
          icon: Key,
          isDanger: false,
        };
      case 'security':
        return {
          title: 'Two-Factor Authentication (2FA)',
          description: 'Protect your account with RFC 6238 time-based one-time passcodes (TOTP) from apps like Google Authenticator, 1Password, or Authy.',
          icon: Shield,
          isDanger: false,
        };
      case 'blocked_users':
        return {
          title: 'Blocked Users',
          description: 'Manage accounts you have blocked. Blocked users cannot view your profile, posts, stories, comments, or send you messages.',
          icon: UserX,
          isDanger: false,
        };
      case 'theme':
        return {
          title: 'Theme & Appearance',
          description: 'Switch between Aurora Teal (Dark) and Warm Sand (Light) modes, or follow system appearance.',
          icon: SunMoon,
          isDanger: false,
        };
      case 'report':
        return {
          title: 'Report a Problem',
          description: 'Report inappropriate content, abusive behaviour, or any safety concern. Your report is confidential and will be reviewed by our safety team.',
          icon: Flag,
          isDanger: true,
        };
      default:
        return {
          title: 'Settings',
          description: '',
          icon: Settings,
          isDanger: false,
        };
    }
  };

  const handleTabSelect = (tab: typeof settingsTab) => {
    setSettingsTab(tab);
    setSettingsSuccessMsg(null);
    setSettingsErrorMsg(null);
    if (tab === 'report') {
      setReportSuccessMsg(null);
      setReportErrorMsg(null);
    }
    // On phone web view (< 768px), open full screen detail pane and push history entry so back button returns to list
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setPhoneDetailOpen(true);
      window.history.pushState({ dataverseSettingsDetail: true }, '');
    }
  };

  const handleBackToList = () => {
    if (typeof window !== 'undefined' && window.history.state?.dataverseSettingsDetail) {
      window.history.back();
    } else {
      setPhoneDetailOpen(false);
    }
  };

  const handleCloseSettings = () => {
    if (typeof window !== 'undefined' && window.history.state?.dataverseSettingsDetail) {
      window.history.back();
    }
    setPhoneDetailOpen(false);
    setShowSettings(false);
    fetchProfileData();
  };

  const handleNavKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const container = navContainerRef.current;
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-settings-tab]'));
    if (!buttons.length) return;
    const activeEl = document.activeElement as HTMLButtonElement | null;
    const currentIndex = buttons.indexOf(activeEl!);
    let nextIndex = 0;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = currentIndex >= 0 ? (currentIndex + 1) % buttons.length : 0;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = buttons.length - 1;
    }
    buttons[nextIndex]?.focus();
  };

  // INSTAGRAM SETTINGS WORKSPACE VIEW
  if (showSettings) {
    const meta = getTabMeta(settingsTab);
    const TabIcon = meta.icon;

    return (
      <div className="relative w-full min-h-screen bg-[var(--bg)] text-[var(--text)]">
        {/* Soft blurred radial glows for aurora backdrop */}
        <div 
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-0 w-[550px] h-[550px] rounded-full bg-[var(--glow)] opacity-25 blur-[140px] -translate-x-1/3 -translate-y-1/3 -z-0"
        />
        <div 
          aria-hidden="true"
          className="pointer-events-none fixed bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-[var(--glow)] opacity-20 blur-[160px] translate-x-1/3 translate-y-1/3 -z-0"
        />

        {/* PHONE (below 768px): List View */}
        <div className={`md:hidden ${phoneDetailOpen ? 'hidden' : 'block'} w-full relative z-10`}>
          {/* Phone List Sticky Blurred Header */}
          <div className="sticky top-0 z-20 bg-[color-mix(in_srgb,var(--card)_85%,transparent)] backdrop-blur-md border-b border-[var(--line)] px-4 py-3.5 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCloseSettings}
              className="min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
              aria-label="Back to profile"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--text)]" />
            </button>
            <h1 className="text-[18px] font-semibold text-[var(--text)]">Settings</h1>
          </div>

          <div className="px-4 py-4 space-y-5 pb-28 max-w-lg mx-auto w-full">
            {/* Phone Profile Summary Card */}
            <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-4 shadow-[var(--shadow-card)] flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--input)] flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || profile.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-base font-semibold text-[var(--text)] uppercase">
                    {(profile?.username || 'U').slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-semibold text-[var(--text)] truncate">
                    {profile?.display_name || profile?.username || 'User'}
                  </span>
                  {(profile?.is_verified || profile?.is_verification_paid) && (
                    <VerifiedBadge size={16} />
                  )}
                </div>
                {profile?.username && (
                  <p className="text-[13px] text-[var(--muted)] truncate">@{profile.username}</p>
                )}
              </div>
            </div>

            {/* Phone Grouped Sections as Rounded Cards of 56px rows */}
            {SETTINGS_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="px-2 mb-2 text-[12px] font-semibold text-[var(--muted)] select-none uppercase tracking-wider">
                  {section.title}
                </div>
                <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] overflow-hidden divide-y divide-[var(--line)] shadow-[var(--shadow-card)]">
                  {section.tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isDanger = tab.isDanger;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabSelect(tab.id)}
                        className="w-full h-[56px] min-h-[56px] px-4 flex items-center gap-3.5 text-left transition-colors duration-150 hover:bg-[var(--hover)] active:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
                      >
                        <div
                          className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-[10px] flex items-center justify-center shrink-0 ${
                            isDanger
                              ? 'bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]'
                              : 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)]'
                          }`}
                        >
                          <Icon className="w-4 h-4 stroke-[2]" />
                        </div>
                        <span className="text-[15px] font-medium text-[var(--text)] truncate">
                          {tab.label}
                        </span>
                        <ChevronRight className="w-5 h-5 text-[var(--muted)] ml-auto shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="h-[1px] bg-[var(--line)] my-6 w-full" />

            <button
              type="button"
              onClick={handleCloseSettings}
              className="w-full h-[48px] min-h-[48px] rounded-[14px] border border-[var(--line)] bg-[var(--card)] text-[var(--text)] text-[15px] font-medium flex items-center justify-center gap-2 hover:bg-[var(--hover)] active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--muted)]" />
              Back to profile
            </button>
          </div>
        </div>

        {/* DESKTOP (>= 768px) & PHONE DETAIL VIEW CONTAINER */}
        <div className={`relative z-10 w-full max-w-[1080px] mx-auto px-4 sm:px-6 py-6 md:py-10 ${!phoneDetailOpen ? 'hidden md:block' : 'block'}`}>
          
          {/* Desktop Page Header */}
          <div className="hidden md:block mb-8">
            <h1 className="text-[30px] font-semibold text-[var(--text)] tracking-tight leading-tight">Settings</h1>
            <p className="text-[15px] text-[var(--muted)] mt-1">Manage your account preferences and security settings</p>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-8">
            
            {/* DESKTOP Left Nav (280px sticky) */}
            <div
              ref={navContainerRef}
              onKeyDown={handleNavKeyDown}
              className="hidden md:flex flex-col w-[280px] shrink-0 sticky top-8 space-y-4"
            >
              {/* Profile Summary Card */}
              <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-4 shadow-[var(--shadow-card)] flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--input)] flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || profile.username || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-base font-semibold text-[var(--text)] uppercase">
                      {(profile?.username || 'U').slice(0, 2)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[15px] font-semibold text-[var(--text)] truncate">
                      {profile?.display_name || profile?.username || 'User'}
                    </span>
                    {(profile?.is_verified || profile?.is_verification_paid) && (
                      <VerifiedBadge size={16} />
                    )}
                  </div>
                  {profile?.username && (
                    <p className="text-[13px] text-[var(--muted)] truncate">@{profile.username}</p>
                  )}
                </div>
              </div>

              {/* Grouped Tab List in a Single Rounded Card */}
              <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-3 shadow-[var(--shadow-card)]">
                <nav aria-label="Settings navigation" className="flex flex-col">
                  {SETTINGS_SECTIONS.map((section, sIdx) => (
                    <div key={section.title} className={sIdx > 0 ? 'mt-4' : ''}>
                      <div className="px-3 mb-1.5 text-[12px] font-semibold text-[var(--muted)] select-none uppercase tracking-wider">
                        {section.title}
                      </div>
                      <div className="flex flex-col gap-1">
                        {section.tabs.map((tab) => {
                          const Icon = tab.icon;
                          const isActive = settingsTab === tab.id;
                          const isDanger = tab.isDanger;

                          return (
                            <button
                              key={tab.id}
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              data-settings-tab={tab.id}
                              onClick={() => handleTabSelect(tab.id)}
                              className={`group relative w-full h-[44px] min-h-[44px] px-3 rounded-[12px] text-[15px] font-medium flex items-center gap-3 transition-all duration-150 motion-reduce:transition-none text-left focus-visible:outline-none focus-visible:ring-2 ${
                                isDanger
                                  ? 'focus-visible:ring-[var(--danger)]'
                                  : 'focus-visible:ring-[var(--accent-2)]'
                              } ${
                                isActive
                                  ? 'text-[var(--text)] font-semibold'
                                  : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
                              }`}
                              style={{
                                background: isActive
                                  ? isDanger
                                    ? 'linear-gradient(90deg, color-mix(in srgb, var(--danger) 18%, transparent) 0%, transparent 100%)'
                                    : 'linear-gradient(90deg, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 100%)'
                                  : undefined,
                              }}
                            >
                              {isActive && (
                                <span
                                  className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r ${
                                    isDanger ? 'bg-[var(--danger)]' : 'bg-[var(--accent-2)]'
                                  }`}
                                />
                              )}
                              <div
                                className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 transition-colors duration-150 ${
                                  isActive
                                    ? isDanger
                                      ? 'bg-[var(--danger)] text-white'
                                      : 'bg-[var(--accent)] text-[var(--on-accent)]'
                                    : isDanger
                                      ? 'bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]'
                                      : 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)]'
                                }`}
                              >
                                <Icon className="w-4 h-4 stroke-[2]" />
                              </div>
                              <span className="truncate">{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>

                <div className="h-[1px] bg-[var(--line)] my-3 w-full" />

                <button
                  type="button"
                  onClick={handleCloseSettings}
                  className="w-full h-[44px] min-h-[44px] px-3 rounded-[12px] text-[15px] font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
                >
                  <ArrowLeft className="w-4 h-4 text-[var(--muted)] shrink-0" />
                  <span>Back to profile</span>
                </button>
              </div>
            </div>

            {/* Right Contents Pane */}
            <div className="flex-1 w-full min-w-0 pb-28 md:pb-8">
              
              {/* Phone Detail Sticky Blurred Header */}
              <div className="md:hidden sticky top-0 z-30 -mx-4 sm:-mx-6 -mt-6 mb-6 px-4 py-3 bg-[color-mix(in_srgb,var(--card)_85%,transparent)] backdrop-blur-md border-b border-[var(--line)] flex items-center gap-3 shadow-sm">
                <button
                  type="button"
                  onClick={handleBackToList}
                  aria-label="Back to settings list"
                  className="min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
                >
                  <ArrowLeft className="w-5 h-5 text-[var(--text)]" />
                </button>
                <h2 className="text-[17px] font-semibold text-[var(--text)] truncate">
                  {meta.title}
                </h2>
              </div>

              {/* Tab Header (Desktop) */}
              <div className="hidden md:flex items-start gap-4 mb-6">
                <div
                  className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-[14px] flex items-center justify-center shrink-0 ${
                    meta.isDanger
                      ? 'bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]'
                      : 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)]'
                  }`}
                >
                  <TabIcon className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[24px] font-semibold text-[var(--text)] tracking-tight leading-tight">
                      {meta.title}
                    </h2>
                    {settingsTab === 'verification' && <VerifiedBadge size={20} />}
                  </div>
                  <p className="text-[15px] text-[var(--muted)] mt-1 leading-normal">
                    {meta.description}
                  </p>
                </div>
              </div>

              {/* Status and Feedback Messages */}
              {verifyingState === 'submitting' && (
                <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur-md z-50 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-9 h-9 text-[var(--accent)] animate-spin" />
                  <div className="text-center space-y-2">
                    <h4 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">Safety Team Review</h4>
                    <p className="text-[13px] text-[var(--muted)] max-w-xs mx-auto animate-pulse">
                      Reviewing credentials and authenticating DataVerse Verified Badge...
                    </p>
                  </div>
                </div>
              )}

              {settingsSuccessMsg && (
                <div className="mb-6 p-4 bg-[color-mix(in_srgb,var(--accent-2)_15%,var(--card))] border border-[var(--accent-2)] text-[var(--text)] text-xs font-semibold rounded-[16px] animate-fade-in flex items-center gap-2.5 shadow-sm">
                  <Check className="w-4 h-4 text-[var(--accent-2)] shrink-0" />
                  <span>{settingsSuccessMsg}</span>
                </div>
              )}

              {settingsErrorMsg && (
                <div className="mb-6 p-4 bg-[color-mix(in_srgb,var(--danger)_15%,var(--card))] border border-[var(--danger)] text-[var(--text)] text-xs font-semibold rounded-[16px] animate-fade-in flex items-center gap-2.5 shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0" />
                  <span>{settingsErrorMsg}</span>
                </div>
              )}

              {/* Animated Tab Panels Container */}
              <div key={settingsTab} className="animate-tab-slide space-y-5">
                
                {/* TAB: THEME SETTINGS */}
                {settingsTab === 'theme' && (
                  <SettingsThemeControl />
                )}

                {/* TAB: EDIT PROFILE */}
                {settingsTab === 'edit_profile' && (
                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    {/* Card 1: Profile */}
                    <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-5">
                      <div className="border-b border-[var(--line)] pb-3">
                        <h3 className="text-[16px] font-semibold text-[var(--text)]">Profile</h3>
                        <p className="text-[13px] text-[var(--muted)] mt-0.5">Your public identity on DataVerse</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Username */}
                        <div className="space-y-2">
                          <label htmlFor="profile-username" className="block text-[14px] font-semibold text-[var(--muted)]">
                            Username
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--muted)]">
                              <User className="w-5 h-5 stroke-[1.8]" />
                            </div>
                            <input
                              id="profile-username"
                              type="text"
                              autoComplete="username"
                              value={usernameInput}
                              onChange={(e) => setUsernameInput(e.target.value)}
                              className="w-full h-[52px] pl-11 pr-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)]"
                              placeholder="Enter username"
                              required
                            />
                          </div>
                        </div>

                        {/* Display Name */}
                        <div className="space-y-2">
                          <label htmlFor="profile-display-name" className="block text-[14px] font-semibold text-[var(--muted)]">
                            Display name
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--muted)]">
                              <User className="w-5 h-5 stroke-[1.8]" />
                            </div>
                            <input
                              id="profile-display-name"
                              type="text"
                              autoComplete="name"
                              value={displayNameInput}
                              onChange={(e) => setDisplayNameInput(e.target.value)}
                              className="w-full h-[52px] pl-11 pr-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)]"
                              placeholder="Enter display name"
                            />
                          </div>
                        </div>

                        {/* Biography */}
                        <div className="sm:col-span-2 space-y-2">
                          <label htmlFor="profile-bio" className="block text-[14px] font-semibold text-[var(--muted)]">
                            Biography
                          </label>
                          <textarea
                            id="profile-bio"
                            rows={4}
                            value={bioInput}
                            onChange={(e) => setBioInput(e.target.value)}
                            className="w-full min-h-[120px] p-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)] resize-y"
                            placeholder="Write a brief bio about yourself..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Contact */}
                    <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-5">
                      <div className="border-b border-[var(--line)] pb-3">
                        <h3 className="text-[16px] font-semibold text-[var(--text)]">Contact</h3>
                        <p className="text-[13px] text-[var(--muted)] mt-0.5">Where we can reach you</p>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="profile-email" className="block text-[14px] font-semibold text-[var(--muted)]">
                          Email address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--muted)]">
                            <Mail className="w-5 h-5 stroke-[1.8]" />
                          </div>
                          <input
                            id="profile-email"
                            type="email"
                            autoComplete="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="w-full h-[52px] pl-11 pr-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)]"
                            placeholder="Enter email address"
                            required
                          />
                        </div>
                      </div>

                      {/* Footer Row */}
                      <div className="pt-4 border-t border-[var(--line)] flex items-center justify-end">
                        <button
                          type="submit"
                          className="w-full sm:w-auto h-[46px] px-7 rounded-[14px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-semibold text-[15px] shadow-[var(--shadow-accent)] hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                        >
                          Save changes
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* TAB: REQUEST VERIFICATION */}
                {settingsTab === 'verification' && (
                  <div className="space-y-5">
                    {profile?.is_verified ? (
                      /* STATE 1: FULLY VERIFIED */
                      <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-[14px] bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] text-[var(--accent-2)] flex items-center justify-center shrink-0">
                            <VerifiedBadge size={24} />
                          </div>
                          <div>
                            <h4 className="text-[16px] font-semibold text-[var(--text)]">Verification active</h4>
                            <p className="text-[13px] text-[var(--muted)]">Your profile features the premium verified badge.</p>
                          </div>
                        </div>

                        <div className="border-t border-[var(--line)] pt-4 space-y-3">
                          <div>
                            <p className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-wider">Verified category</p>
                            <p className="text-[15px] text-[var(--text)] font-medium mt-1">{profile.verification_category || 'Creator'}</p>
                          </div>

                          {profile.verification_reason && (
                            <div>
                              <p className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-wider">Reason submitted</p>
                              <p className="text-[14px] text-[var(--muted)] mt-1 italic">"{profile.verification_reason}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : !profile?.is_verification_paid || timeRemainingText === 'Expired' ? (
                      /* STATE 2: UNPAID OR WINDOW EXPIRED */
                      <div className="space-y-5">
                        {timeRemainingText === 'Expired' && (
                          <div className="p-4 bg-[color-mix(in_srgb,var(--gold)_15%,var(--card))] border border-[var(--gold)] text-[var(--text)] text-xs font-semibold rounded-[16px] flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 text-[var(--gold)] shrink-0 mt-0.5" />
                            <span>Your 3-day verification submission window has expired. You must purchase a new subscription to submit documents.</span>
                          </div>
                        )}

                        {/* Subscription Billing Plan Details */}
                        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-[var(--accent-2)] uppercase tracking-wider bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2.5 py-1 rounded-full inline-block">
                              Premium badge
                            </span>
                            <h4 className="text-[18px] font-semibold text-[var(--text)]">Verification subscription</h4>
                            <p className="text-[14px] text-[var(--muted)]">Includes verified badge + priority platform support.</p>
                          </div>
                          <div className="sm:text-right">
                            <span className="text-[26px] font-bold text-[var(--text)]">₹199</span>
                            <span className="text-[13px] text-[var(--muted)] block font-medium">/ month</span>
                          </div>
                        </div>

                        {/* Username Confirmation Card */}
                        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-5">
                          <div className="space-y-2">
                            <label htmlFor="verified-username-display" className="block text-[14px] font-semibold text-[var(--muted)]">
                              Username
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--muted)]">
                                <User className="w-5 h-5 stroke-[1.8]" />
                              </div>
                              <input
                                id="verified-username-display"
                                type="text"
                                value={`@${profile?.username}`}
                                disabled
                                className="w-full h-[52px] pl-11 pr-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--muted)] cursor-not-allowed opacity-80"
                              />
                            </div>
                          </div>

                          <div className="pt-4 border-t border-[var(--line)] flex items-center justify-end">
                            <button
                              type="button"
                              onClick={handlePayVerification}
                              disabled={payingVerification}
                              className="w-full sm:w-auto h-[46px] px-7 rounded-[14px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] disabled:opacity-50 text-[var(--on-accent)] font-semibold text-[15px] shadow-[var(--shadow-accent)] hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                            >
                              {payingVerification ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Processing payment...</>
                              ) : (
                                'Subscribe & start verification (₹199/mo)'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* STATE 3: PAID & WINDOW ACTIVE */
                      <form onSubmit={handleRequestVerification} className="space-y-5">
                        {/* Countdown Banner */}
                        <div className="p-4 bg-[color-mix(in_srgb,var(--accent)_12%,var(--card))] border border-[var(--line)] text-[var(--text)] text-xs font-semibold rounded-[16px] flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Clock className="w-5 h-5 text-[var(--accent-2)]" />
                            <span className="text-[14px]">Submission window active</span>
                          </div>
                          <span className="font-mono text-sm bg-[var(--card)] px-3 py-1 rounded-[10px] text-[var(--text)] border border-[var(--line)]">
                            {timeRemainingText}
                          </span>
                        </div>

                        {profile.verification_status === 'pending' && (
                          <div className="p-4 bg-[color-mix(in_srgb,var(--accent)_15%,var(--card))] border border-[var(--line)] text-[var(--text)] text-xs font-semibold rounded-[16px]">
                            ⏳ Your verification details have been submitted and are currently under review. You can resubmit or update documents at any time before the timer expires.
                          </div>
                        )}

                        {profile.verification_status === 'rejected' && (
                          <div className="p-4 bg-[color-mix(in_srgb,var(--danger)_15%,var(--card))] border border-[var(--danger)] text-[var(--text)] text-xs font-semibold rounded-[16px] flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
                            <span>Your previous request was rejected. You can update and resubmit your details before the window expires.</span>
                          </div>
                        )}

                        {/* Submission Form Card */}
                        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-5">
                          <div className="space-y-2">
                            <label htmlFor="verified-category-select" className="block text-[14px] font-semibold text-[var(--muted)]">
                              Category
                            </label>
                            <select
                              id="verified-category-select"
                              value={categoryInput}
                              onChange={(e) => setCategoryInput(e.target.value)}
                              className="w-full h-[52px] px-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)]"
                            >
                              <option value="Creator">Digital Creator / Blogger</option>
                              <option value="Music">Musician / Artist</option>
                              <option value="Entertainment">Entertainment / Media</option>
                              <option value="Business">Business / Brand / Organisation</option>
                              <option value="Government">Government / Public Figure</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="verified-doc-upload" className="block text-[14px] font-semibold text-[var(--muted)]">
                              Supporting document (ID card)
                            </label>
                            <div className="border border-dashed border-[var(--line)] rounded-[16px] p-6 text-center hover:border-[var(--accent-2)] transition-colors cursor-pointer relative bg-[var(--input)]">
                              <Sparkles className="w-6 h-6 text-[var(--accent-2)] mx-auto mb-2" />
                              <p className="text-[14px] text-[var(--text)] font-semibold">
                                {verificationDocFile ? verificationDocFile.name : 'Upload Government Photo ID or Business License'}
                              </p>
                              <p className="text-[12px] text-[var(--muted)] mt-1">PDF, PNG, JPG accepted</p>
                              <input 
                                id="verified-doc-upload"
                                type="file" 
                                aria-label="Upload Government Photo ID or Business License"
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                accept="image/*,application/pdf" 
                                onChange={(e) => setVerificationDocFile(e.target.files?.[0] || null)}
                                required={!profile.verification_document_url} 
                              />
                            </div>
                            {profile.verification_document_url && (
                              <p className="text-[12px] text-[var(--muted)] pl-1">
                                📄 Current Document: <a href={`/api/media/file/${encodeURIComponent(profile.verification_document_url)}`} target="_blank" rel="noreferrer" className="text-[var(--accent-2)] hover:underline font-semibold">View Uploaded ID File</a>
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="verified-reason-input" className="block text-[14px] font-semibold text-[var(--muted)]">
                              Reason for verification
                            </label>
                            <textarea
                              id="verified-reason-input"
                              rows={3}
                              value={reasonInput}
                              onChange={(e) => setReasonInput(e.target.value)}
                              className="w-full min-h-[120px] p-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)] resize-y"
                              placeholder="Briefly state why your account requires verification..."
                              required
                            />
                          </div>

                          <div className="pt-4 border-t border-[var(--line)] flex items-center justify-end">
                            <button
                              type="submit"
                              disabled={uploadingVerificationDoc}
                              className="w-full sm:w-auto h-[46px] px-7 rounded-[14px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] disabled:opacity-50 text-[var(--on-accent)] font-semibold text-[15px] shadow-[var(--shadow-accent)] hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                            >
                              {uploadingVerificationDoc ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading document...</>
                              ) : profile.verification_document_url ? (
                                'Update & resubmit details'
                              ) : (
                                'Submit verification details'
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* TAB: ACCOUNT PRIVACY */}
                {settingsTab === 'privacy' && (
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-lg">
                      <h3 className="text-[16px] font-semibold text-[var(--text)]">Private account</h3>
                      <p className="text-[14px] text-[var(--muted)] leading-relaxed">
                        Only people you approve will be able to see your posts and reels. Followers won't be affected.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPrivateInput}
                      aria-label="Toggle private account"
                      onClick={() => handleTogglePrivacy(!isPrivateInput)}
                      className={`w-[52px] h-[30px] rounded-full transition-colors duration-200 relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] ${
                        isPrivateInput ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'
                      }`}
                    >
                      <div 
                        className={`w-[24px] h-[24px] bg-[var(--card)] rounded-full shadow-sm absolute top-[3px] transition-transform duration-200 ${
                          isPrivateInput ? 'left-[25px]' : 'left-[3px]'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* TAB: CHANGE PASSWORD */}
                {settingsTab === 'password' && (
                  <form onSubmit={handleChangePassword} className="space-y-5">
                    <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-5">
                      <div className="border-b border-[var(--line)] pb-3">
                        <h3 className="text-[16px] font-semibold text-[var(--text)]">Security credentials</h3>
                        <p className="text-[13px] text-[var(--muted)] mt-0.5">Update your password to keep your account safe</p>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="settings-current-password" className="block text-[14px] font-semibold text-[var(--muted)]">
                          Current password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--muted)]">
                            <Lock className="w-5 h-5 stroke-[1.8]" />
                          </div>
                          <input
                            id="settings-current-password"
                            type="password"
                            autoComplete="current-password"
                            value={currentPasswordInput}
                            onChange={(e) => setCurrentPasswordInput(e.target.value)}
                            className="w-full h-[52px] pl-11 pr-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)]"
                            placeholder="Enter your current password"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="settings-new-password" className="block text-[14px] font-semibold text-[var(--muted)]">
                          New password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--muted)]">
                            <Lock className="w-5 h-5 stroke-[1.8]" />
                          </div>
                          <input
                            id="settings-new-password"
                            type="password"
                            autoComplete="new-password"
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            className="w-full h-[52px] pl-11 pr-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)]"
                            placeholder="Enter new password (min. 8 characters)"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="settings-confirm-password" className="block text-[14px] font-semibold text-[var(--muted)]">
                          Confirm password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--muted)]">
                            <Lock className="w-5 h-5 stroke-[1.8]" />
                          </div>
                          <input
                            id="settings-confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPasswordInput}
                            onChange={(e) => setConfirmPasswordInput(e.target.value)}
                            className="w-full h-[52px] pl-11 pr-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)]"
                            placeholder="Confirm new password"
                            required
                          />
                        </div>
                      </div>

                      {/* Footer Row */}
                      <div className="pt-4 border-t border-[var(--line)] flex items-center justify-end">
                        <button
                          type="submit"
                          className="w-full sm:w-auto h-[46px] px-7 rounded-[14px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-semibold text-[15px] shadow-[var(--shadow-accent)] hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                        >
                          Change password
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* TAB: TWO-FACTOR AUTHENTICATION (2FA) */}
                {settingsTab === 'security' && (
                  <div className="space-y-5">
                    {loading2FA ? (
                      <div className="py-16 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                        <span className="text-[14px]">Checking security status...</span>
                      </div>
                    ) : (
                      <>
                        {/* Status Card */}
                        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${
                                twoFactorStatus?.enabled 
                                  ? 'bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] text-[var(--accent-2)]' 
                                  : 'bg-[color-mix(in_srgb,var(--gold)_15%,transparent)] text-[var(--gold)]'
                              }`}>
                                {twoFactorStatus?.enabled ? <ShieldCheck className="w-6 h-6 stroke-[1.8]" /> : <ShieldAlert className="w-6 h-6 stroke-[1.8]" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2.5">
                                  <h3 className="text-[16px] font-semibold text-[var(--text)]">
                                    {twoFactorStatus?.enabled ? 'Two-factor authentication is active' : 'Two-factor authentication is disabled'}
                                  </h3>
                                  <span className={`text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                                    twoFactorStatus?.enabled
                                      ? 'bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] text-[var(--accent-2)] border border-[color-mix(in_srgb,var(--accent-2)_25%,transparent)]'
                                      : 'bg-[color-mix(in_srgb,var(--gold)_15%,transparent)] text-[var(--gold)] border border-[color-mix(in_srgb,var(--gold)_25%,transparent)]'
                                  }`}>
                                    {twoFactorStatus?.enabled ? 'Protected' : 'Off'}
                                  </span>
                                </div>
                                <p className="text-[13px] text-[var(--muted)] mt-0.5">
                                  {twoFactorStatus?.enabled 
                                    ? (twoFactorStatus.enabled_at ? `Enabled on ${new Date(twoFactorStatus.enabled_at).toLocaleDateString()}` : 'Configured via Authenticator App')
                                    : 'Require an authenticator app code whenever you sign in.'}
                                </p>
                              </div>
                            </div>

                            {!twoFactorStatus?.enabled && !isSettingUp2FA && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSettingUp2FA(true);
                                  setSetupStep(1);
                                  setSetupError(null);
                                }}
                                className="w-full sm:w-auto h-[46px] px-6 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] rounded-[14px] text-[14px] font-semibold transition-all shadow-[var(--shadow-accent)] hover:opacity-95 flex items-center justify-center gap-2"
                              >
                                <Shield className="w-4 h-4" />
                                Enable 2FA
                              </button>
                            )}
                          </div>

                          {/* If enabled: recovery codes status & management buttons */}
                          {twoFactorStatus?.enabled && !isDisabling2FA && !isRegeneratingCodes && (
                            <div className="pt-4 border-t border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="text-[13px] text-[var(--muted)]">
                                Backup recovery codes remaining:{' '}
                                <span className={`font-mono font-bold ${
                                  (twoFactorStatus.backup_codes_remaining ?? 0) > 3 
                                    ? 'text-[var(--accent-2)]' 
                                    : 'text-[var(--gold)] font-bold'
                                }`}>
                                  {twoFactorStatus.backup_codes_remaining ?? 0} of 10
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsRegeneratingCodes(true);
                                    setNewBackupCodes(null);
                                    setRegenError(null);
                                  }}
                                  className="flex-1 sm:flex-none h-[38px] px-4 rounded-[12px] border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--hover)] text-[var(--text)] text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-[var(--muted)]" />
                                  Regenerate codes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsDisabling2FA(true);
                                    setDisableError(null);
                                  }}
                                  className="flex-1 sm:flex-none h-[38px] px-4 rounded-[12px] border border-[var(--danger)] bg-transparent hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)] text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5"
                                >
                                  Disable
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ENROLLMENT WIZARD */}
                        {isSettingUp2FA && !twoFactorStatus?.enabled && (
                          <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-6">
                            {/* Progress Stepper */}
                            <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  setupStep >= 1 ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--input)] text-[var(--muted)]'
                                }`}>1</span>
                                <span className="text-xs font-semibold text-[var(--text)]">Authenticate</span>
                              </div>
                              <div className="h-0.5 w-8 bg-[var(--line)]" />
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  setupStep >= 2 ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--input)] text-[var(--muted)]'
                                }`}>2</span>
                                <span className="text-xs font-semibold text-[var(--text)]">Scan & Verify</span>
                              </div>
                              <div className="h-0.5 w-8 bg-[var(--line)]" />
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  setupStep >= 3 ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--input)] text-[var(--muted)]'
                                }`}>3</span>
                                <span className="text-xs font-semibold text-[var(--text)]">Backup Codes</span>
                              </div>
                            </div>

                            {setupError && (
                              <div className="p-3 bg-[color-mix(in_srgb,var(--danger)_15%,var(--card))] border border-[var(--danger)] text-[var(--text)] text-xs font-semibold rounded-[14px] flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0" />
                                <span>{setupError}</span>
                              </div>
                            )}

                            {/* STEP 1: Re-authenticate with password */}
                            {setupStep === 1 && (
                              <form onSubmit={handleStartSetup2FA} className="space-y-4">
                                <p className="text-[13px] text-[var(--muted)]">
                                  Please enter your current account password to confirm identity before configuring two-factor authentication.
                                </p>
                                <div className="space-y-2">
                                  <label className="block text-[14px] font-semibold text-[var(--muted)]">
                                    Current password
                                  </label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--muted)]">
                                      <Lock className="w-5 h-5 stroke-[1.8]" />
                                    </div>
                                    <input
                                      type="password"
                                      autoComplete="current-password"
                                      value={setupPassword}
                                      onChange={(e) => setSetupPassword(e.target.value)}
                                      className="w-full h-[52px] pl-11 pr-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)]"
                                      placeholder="Enter your current password"
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsSettingUp2FA(false);
                                      setSetupPassword('');
                                      setSetupError(null);
                                    }}
                                    className="h-[42px] px-5 bg-transparent hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] rounded-[12px] text-[13px] font-semibold transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={setupSubmitting || !setupPassword}
                                    className="h-[46px] px-7 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] disabled:opacity-50 text-[var(--on-accent)] rounded-[14px] text-[14px] font-semibold shadow-[var(--shadow-accent)] hover:opacity-95 transition-all flex items-center gap-2"
                                  >
                                    {setupSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Continue to QR code
                                  </button>
                                </div>
                              </form>
                            )}

                            {/* STEP 2: Scan QR & Enter 6-digit TOTP */}
                            {setupStep === 2 && setupQrData && (
                              <form onSubmit={handleConfirmEnable2FA} className="space-y-5">
                                <p className="text-[13px] text-[var(--muted)]">
                                  Open your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, 1Password) and scan this QR code:
                                </p>

                                {/* Clean White Card for high-contrast QR scanning */}
                                <div className="bg-white p-4 rounded-[16px] w-52 h-52 mx-auto flex items-center justify-center shadow-lg">
                                  <div
                                    dangerouslySetInnerHTML={{ __html: setupQrData.qr_code_svg }}
                                    className="w-full h-full [&>svg]:w-full [&>svg]:h-full flex items-center justify-center"
                                  />
                                </div>

                                {/* Manual Secret Key Fallback */}
                                <div className="p-3 bg-[var(--input)] border border-[var(--line)] rounded-[12px] space-y-1 text-center">
                                  <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                                    Can't scan? Enter secret key manually:
                                  </span>
                                  <div className="flex items-center justify-center gap-2">
                                    <code className="font-mono text-xs font-bold text-[var(--accent-2)] tracking-wider select-all">
                                      {setupQrData.secret}
                                    </code>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(setupQrData.secret);
                                        toast.success('Secret key copied to clipboard');
                                      }}
                                      className="p-1 hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] rounded transition-all"
                                      title="Copy secret"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="block text-[14px] font-semibold text-[var(--muted)]">
                                    Enter 6-digit code from authenticator
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={setupVerifyCode}
                                    onChange={(e) => setSetupVerifyCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full text-center tracking-[0.5em] font-mono text-[20px] font-bold bg-[var(--input)] border border-[var(--line)] focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)] rounded-[14px] h-[52px] px-4 text-[var(--text)] outline-none transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-[var(--muted)]"
                                    placeholder="000000"
                                    required
                                  />
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setSetupStep(1)}
                                    className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                  >
                                    &larr; Back
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={setupSubmitting || setupVerifyCode.trim().length !== 6}
                                    className="h-[46px] px-7 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] disabled:opacity-50 text-[var(--on-accent)] rounded-[14px] text-[14px] font-semibold shadow-[var(--shadow-accent)] hover:opacity-95 transition-all flex items-center gap-2"
                                  >
                                    {setupSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Verify & activate
                                  </button>
                                </div>
                              </form>
                            )}

                            {/* STEP 3: Backup Codes Display */}
                            {setupStep === 3 && (
                              <div className="space-y-5 animate-fade-in">
                                <div className="p-4 bg-[color-mix(in_srgb,var(--accent-2)_15%,var(--card))] border border-[var(--accent-2)] text-[var(--text)] text-xs font-semibold rounded-[16px] flex items-start gap-2.5">
                                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--accent-2)]" />
                                  <div>
                                    <span className="font-bold text-[var(--text)] block text-[13px]">2FA successfully verified!</span>
                                    Save your recovery backup codes below. If you lose your phone or authenticator app, these codes are the ONLY way to regain access to your account.
                                  </div>
                                </div>

                                {/* 10 Backup Codes in a clean 2-column grid */}
                                <div className="p-4 bg-[var(--input)] border border-[var(--line)] rounded-[16px]">
                                  <div className="grid grid-cols-2 gap-2 text-center">
                                    {setupBackupCodes.map((code, idx) => (
                                      <div
                                        key={idx}
                                        className="font-mono text-xs font-semibold text-[var(--text)] bg-[var(--card)] py-2.5 px-3 rounded-[10px] border border-[var(--line)] tracking-wider select-all"
                                      >
                                        <span className="text-[10px] text-[var(--muted)] mr-2">{idx + 1}.</span>
                                        {code}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Action Buttons: Copy All & Download */}
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyBackupCodes(setupBackupCodes)}
                                    className="flex-1 h-[42px] px-4 bg-[var(--card)] hover:bg-[var(--hover)] text-[var(--text)] border border-[var(--line)] rounded-[12px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
                                    Copy all
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadBackupCodes(setupBackupCodes)}
                                    className="flex-1 h-[42px] px-4 bg-[var(--card)] hover:bg-[var(--hover)] text-[var(--text)] border border-[var(--line)] rounded-[12px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2"
                                  >
                                    <Download className="w-3.5 h-3.5 text-[var(--muted)]" />
                                    Download .txt
                                  </button>
                                </div>

                                {/* Checkbox Acknowledgment */}
                                <label className="flex items-start gap-3 p-3 bg-[var(--input)] border border-[var(--line)] rounded-[14px] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={backupCodesAcknowledged}
                                    onChange={(e) => setBackupCodesAcknowledged(e.target.checked)}
                                    className="mt-0.5 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
                                  />
                                  <span className="text-[12px] text-[var(--muted)] font-medium leading-relaxed">
                                    I have saved these 10 recovery codes in a secure location and understand each code can only be used once.
                                  </span>
                                </label>

                                <button
                                  type="button"
                                  disabled={!backupCodesAcknowledged}
                                  onClick={handleFinishSetup2FA}
                                  className="w-full h-[46px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] disabled:opacity-40 text-[var(--on-accent)] rounded-[14px] text-[14px] font-semibold shadow-[var(--shadow-accent)] transition-all"
                                >
                                  Finish setup & protect account
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* DISABLE 2FA CONFIRMATION MODAL / PANEL */}
                        {isDisabling2FA && (
                          <form onSubmit={handleDisable2FA} className="bg-[var(--card)] border border-[var(--danger)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-4">
                            <div className="flex items-center gap-2 text-[var(--danger)]">
                              <AlertTriangle className="w-5 h-5" />
                              <h3 className="text-[16px] font-semibold text-[var(--text)]">Disable two-factor authentication</h3>
                            </div>
                            <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                              Disabling 2FA will remove this security layer from your account and invalidate all trusted devices. You will be able to log in with just your password.
                            </p>

                            {disableError && (
                              <div className="p-3 bg-[color-mix(in_srgb,var(--danger)_15%,var(--card))] border border-[var(--danger)] text-[var(--text)] text-xs font-semibold rounded-[12px]">
                                {disableError}
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="block text-[14px] font-semibold text-[var(--muted)]">
                                Account password
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--muted)]">
                                  <Lock className="w-5 h-5 stroke-[1.8]" />
                                </div>
                                <input
                                  type="password"
                                  autoComplete="current-password"
                                  value={disablePassword}
                                  onChange={(e) => setDisablePassword(e.target.value)}
                                  className="w-full h-[52px] pl-11 pr-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--danger)]"
                                  placeholder="Enter password"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-[14px] font-semibold text-[var(--muted)]">
                                Current 6-digit 2FA code
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={disableCode}
                                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                                className="w-full h-[52px] tracking-[0.5em] font-mono text-center bg-[var(--input)] border border-[var(--line)] focus:border-[var(--danger)] rounded-[14px] px-4 text-[18px] font-bold text-[var(--text)] placeholder:tracking-normal placeholder:font-normal placeholder:text-[var(--muted)] outline-none transition-all"
                                placeholder="000000"
                                required
                              />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDisabling2FA(false);
                                  setDisablePassword('');
                                  setDisableCode('');
                                  setDisableError(null);
                                }}
                                className="h-[42px] px-5 text-[13px] text-[var(--muted)] hover:text-[var(--text)] font-semibold transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={disableSubmitting || !disablePassword || disableCode.length !== 6}
                                className="h-[46px] px-7 bg-[var(--danger)] hover:opacity-95 disabled:opacity-50 text-white rounded-[14px] text-[14px] font-semibold transition-all flex items-center gap-2"
                              >
                                {disableSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Confirm disable 2FA
                              </button>
                            </div>
                          </form>
                        )}

                        {/* REGENERATE BACKUP CODES PANEL */}
                        {isRegeneratingCodes && (
                          <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-4">
                            <div className="flex items-center gap-2 text-[var(--accent-2)]">
                              <RefreshCw className="w-5 h-5" />
                              <h3 className="text-[16px] font-semibold text-[var(--text)]">Regenerate recovery backup codes</h3>
                            </div>

                            {!newBackupCodes ? (
                              <form onSubmit={handleRegenerateBackupCodes} className="space-y-4">
                                <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                                  Generating new backup codes will invalidate any existing codes. Enter your current 6-digit authenticator code to proceed:
                                </p>

                                {regenError && (
                                  <div className="p-3 bg-[color-mix(in_srgb,var(--danger)_15%,var(--card))] border border-[var(--danger)] text-[var(--text)] text-xs font-semibold rounded-[12px]">
                                    {regenError}
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <label className="block text-[14px] font-semibold text-[var(--muted)]">
                                    Current 6-digit code
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={regenCode}
                                    onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full h-[52px] tracking-[0.5em] font-mono text-center bg-[var(--input)] border border-[var(--line)] focus:border-[var(--accent-2)] rounded-[14px] px-4 text-[18px] font-bold text-[var(--text)] outline-none transition-all"
                                    placeholder="000000"
                                    required
                                  />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsRegeneratingCodes(false);
                                      setRegenCode('');
                                      setRegenError(null);
                                    }}
                                    className="h-[42px] px-5 text-[13px] text-[var(--muted)] hover:text-[var(--text)] font-semibold transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={regenSubmitting || regenCode.length !== 6}
                                    className="h-[46px] px-7 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] disabled:opacity-50 text-[var(--on-accent)] rounded-[14px] text-[14px] font-semibold shadow-[var(--shadow-accent)] hover:opacity-95 transition-all flex items-center gap-2"
                                  >
                                    {regenSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Generate new codes
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="space-y-4">
                                <div className="p-4 bg-[var(--input)] border border-[var(--line)] rounded-[16px]">
                                  <div className="grid grid-cols-2 gap-2 text-center">
                                    {newBackupCodes.map((code, idx) => (
                                      <div
                                        key={idx}
                                        className="font-mono text-xs font-semibold text-[var(--text)] bg-[var(--card)] py-2.5 px-3 rounded-[10px] border border-[var(--line)] tracking-wider select-all"
                                      >
                                        <span className="text-[10px] text-[var(--muted)] mr-2">{idx + 1}.</span>
                                        {code}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyBackupCodes(newBackupCodes)}
                                    className="flex-1 h-[42px] px-4 bg-[var(--card)] hover:bg-[var(--hover)] text-[var(--text)] border border-[var(--line)] rounded-[12px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
                                    Copy all
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadBackupCodes(newBackupCodes)}
                                    className="flex-1 h-[42px] px-4 bg-[var(--card)] hover:bg-[var(--hover)] text-[var(--text)] border border-[var(--line)] rounded-[12px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2"
                                  >
                                    <Download className="w-3.5 h-3.5 text-[var(--muted)]" />
                                    Download .txt
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsRegeneratingCodes(false);
                                    setNewBackupCodes(null);
                                  }}
                                  className="w-full h-[46px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] rounded-[14px] text-[14px] font-semibold shadow-[var(--shadow-accent)] hover:opacity-95 transition-all"
                                >
                                  Done
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* TAB: REPORT A PROBLEM */}
                {settingsTab === 'report' && (
                  <form onSubmit={handleSubmitReport} className="space-y-5">
                    <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-5">
                      <div className="border-b border-[var(--line)] pb-3">
                        <h3 className="text-[16px] font-semibold text-[var(--text)]">Submit a report</h3>
                        <p className="text-[13px] text-[var(--muted)] mt-0.5">Let us know what went wrong so our safety team can investigate</p>
                      </div>

                      {reportSuccessMsg && (
                        <div className="p-4 bg-[color-mix(in_srgb,var(--accent-2)_15%,var(--card))] border border-[var(--accent-2)] text-[var(--text)] text-xs font-semibold rounded-[16px] animate-fade-in flex items-start gap-2">
                          <Check className="w-4 h-4 text-[var(--accent-2)] shrink-0 mt-0.5" />
                          <span>{reportSuccessMsg}</span>
                        </div>
                      )}

                      {reportErrorMsg && (
                        <div className="p-4 bg-[color-mix(in_srgb,var(--danger)_15%,var(--card))] border border-[var(--danger)] text-[var(--text)] text-xs font-semibold rounded-[16px] animate-fade-in">
                          {reportErrorMsg}
                        </div>
                      )}

                      <div className="space-y-2">
                        <label htmlFor="report-type-select" className="block text-[14px] font-semibold text-[var(--muted)]">
                          Report type
                        </label>
                        <select
                          id="report-type-select"
                          value={reportTypeInput}
                          onChange={(e) => setReportTypeInput(e.target.value)}
                          className="w-full h-[52px] px-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)]"
                          required
                        >
                          <option value="spam">Spam or Misleading Content</option>
                          <option value="harassment">Harassment or Bullying</option>
                          <option value="hate_speech">Hate Speech or Discrimination</option>
                          <option value="inappropriate_content">Inappropriate or Adult Content</option>
                          <option value="impersonation">Impersonation</option>
                          <option value="fake_account">Fake or Bot Account</option>
                          <option value="violence">Violence or Dangerous Content</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="reported-username-input" className="block text-[14px] font-semibold text-[var(--muted)]">
                          Reported username <span className="font-normal text-[var(--muted)]">(optional)</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--muted)]">
                            <User className="w-5 h-5 stroke-[1.8]" />
                          </div>
                          <input
                            id="reported-username-input"
                            type="text"
                            value={reportedUsernameInput}
                            onChange={(e) => setReportedUsernameInput(e.target.value)}
                            className="w-full h-[52px] pl-11 pr-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)]"
                            placeholder="@username (if reporting a specific user)"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="report-description-textarea" className="block text-[14px] font-semibold text-[var(--muted)]">
                          Description <span className="font-normal text-[var(--muted)]">(min 10 chars)</span>
                        </label>
                        <textarea
                          id="report-description-textarea"
                          rows={5}
                          value={reportDescInput}
                          onChange={(e) => setReportDescInput(e.target.value)}
                          className="w-full min-h-[120px] p-4 rounded-[14px] bg-[var(--input)] border border-[var(--line)] text-[16px] sm:text-[15px] font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent-2)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-2)_22%,transparent)] resize-y"
                          placeholder="Please describe the issue in detail. Include any relevant context, links, or usernames..."
                        />
                        <p className="text-[12px] text-[var(--muted)] pl-1">{reportDescInput.length} characters</p>
                      </div>

                      {/* Confidentiality info box */}
                      <div className="p-4 bg-[var(--input)] border border-[var(--line)] rounded-[14px] flex items-start gap-3">
                        <Shield className="w-5 h-5 text-[var(--accent-2)] shrink-0 mt-0.5" />
                        <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                          Your report is confidential. It will be forwarded to our safety team at <span className="text-[var(--accent-2)] font-semibold">dataverse@datalexcloud.tech</span> for review. False or malicious reports may result in account restrictions.
                        </p>
                      </div>

                      {/* Footer Row */}
                      <div className="pt-4 border-t border-[var(--line)] flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={reportSubmitting || reportDescInput.trim().length < 10}
                          className={`w-full sm:w-auto h-[46px] px-7 rounded-[14px] text-[15px] font-semibold transition-all flex items-center justify-center gap-2 ${
                            reportSubmitting || reportDescInput.trim().length < 10
                              ? 'bg-[var(--line)] text-[var(--muted)] cursor-not-allowed opacity-60'
                              : 'bg-[var(--danger)] hover:opacity-95 text-white active:scale-[0.99] shadow-sm'
                          }`}
                        >
                          {reportSubmitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                          ) : (
                            <><Flag className="w-4 h-4" /> Submit report</>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* TAB: BLOCKED USERS */}
                {settingsTab === 'blocked_users' && (
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-4">
                    <div className="border-b border-[var(--line)] pb-3">
                      <h3 className="text-[16px] font-semibold text-[var(--text)]">Blocked accounts</h3>
                      <p className="text-[13px] text-[var(--muted)] mt-0.5">People you have prevented from seeing your content or messaging you</p>
                    </div>

                    {loadingBlockedUsers ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" />
                      </div>
                    ) : blockedUsersList.length === 0 ? (
                      <div className="py-12 text-center select-none space-y-3">
                        <div className="w-12 h-12 rounded-[14px] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)] flex items-center justify-center mx-auto">
                          <UserX className="w-6 h-6 stroke-[1.8]" />
                        </div>
                        <p className="text-[14px] text-[var(--muted)] font-medium">You haven't blocked any users yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {blockedUsersList.map((blockedUser) => (
                          <div 
                            key={blockedUser.id}
                            className="h-[72px] px-4 flex items-center justify-between bg-[var(--input)] border border-[var(--line)] rounded-[16px] hover:border-[var(--accent-2)] transition-all"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--card)] flex items-center justify-center">
                                {blockedUser.avatar_url ? (
                                  <img 
                                    src={blockedUser.avatar_url} 
                                    alt={blockedUser.username} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-[var(--muted)] uppercase">
                                    {blockedUser.username.slice(0, 2)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[14px] font-semibold text-[var(--text)] truncate">
                                  {blockedUser.display_name || blockedUser.username}
                                </p>
                                <p className="text-[12px] text-[var(--muted)] truncate">
                                  @{blockedUser.username}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleUnblockUserFromList(blockedUser.id)}
                              className="h-[36px] px-4 rounded-[10px] border border-[var(--line)] bg-[var(--card)] text-[var(--text)] hover:text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--hover)] text-[13px] font-semibold transition-all shrink-0 ml-3"
                            >
                              Unblock
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }


  /* UI UPDATE START - Profile Page UI Redesign (Desktop & Phone responsive) */
  return (
    <div className="w-full max-w-[980px] mx-auto self-center px-4 sm:px-6 py-6 sm:py-8 space-y-8 animate-fade-in relative z-10 pb-24 md:pb-12">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-brand-600/15 via-brand-500/5 to-transparent blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Profile Header card */}
      <div className="select-none">
        
        {/* DESKTOP HEADER (min-width: 768px / md) */}
        <div className="hidden md:flex items-start gap-10">
          
          {/* Avatar (150px) with gradient ring */}
          {/* THEME START */}
          <div className="relative flex-shrink-0">
            <div className="p-[3px] rounded-full bg-gradient-to-tr from-[var(--accent)] via-[var(--accent-2)] to-[var(--gold)] shadow-xl shadow-[var(--shadow-card)]">
              <div className="w-[146px] h-[146px] rounded-full bg-[var(--side)] p-1 overflow-hidden relative group">
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[var(--input)] border border-[var(--line)]">
          {/* THEME END */}
                  {uploadingAvatar ? (
                    <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                  ) : profile.avatar_url ? (
                    <img 
                      src={`/api/media/file/${profile.avatar_url}`} 
                      alt={profile.username} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-3xl font-black text-brand-400 uppercase">
                      {profile.username.substring(0, 2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Camera badge at bottom right */}
            {isOwnProfile && (
              <label 
                htmlFor="profile-avatar-file-input"
                className="absolute bottom-1 right-1 p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full transition-all border-2 border-[#050508] shadow-lg shadow-brand-600/40 cursor-pointer active:scale-95" 
                title="Change Avatar"
              >
                <Camera className="w-4 h-4" />
                <input 
                  id="profile-avatar-file-input"
                  aria-label="Upload profile avatar"
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                />
              </label>
            )}
          </div>

          {/* Info Column */}
          <div className="flex-1 space-y-4 pt-1">
            
            {/* Top row: Name, Badge, Handle & Actions (Settings at top right) */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                  {profile.display_name || profile.username}
                  {!!profile.is_verified && <VerifiedBadge size={18} />}
                </h1>
                <p className="text-sm font-medium text-slate-400 mt-0.5">
                  @{profile.username}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="px-4 py-2 bg-transparent hover:bg-white/[0.06] border border-white/10 hover:border-brand-500/50 text-slate-200 hover:text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Settings
                    </button>
                    <button
                      onClick={() => logout()}
                      className="md:hidden px-4 py-2 bg-red-650/10 border border-red-500/20 hover:bg-red-650/20 text-red-500 hover:text-red-400 text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    {!isBlocked ? (
                      <>
                        <button
                          onClick={handleFollowToggle}
                          className={`px-5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${
                            profile.is_following
                              ? 'bg-slate-900 border border-white/10 text-slate-300 hover:text-white'
                              : profile.is_requested
                              ? 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
                              : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/20'
                          }`}
                        >
                          {profile.is_following ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Following
                            </>
                          ) : profile.is_requested ? (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              Requested
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Follow
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleMessageUser}
                          className="px-5 py-2 bg-transparent border border-white/10 hover:bg-white/[0.06] text-slate-200 hover:text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                        >
                          Message
                        </button>

                        <button
                          onClick={handleBlockUser}
                          className="px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                        >
                          Block
                        </button>
                      </>
                    ) : (
                      <>
                        {!viewerBlocked && (
                          <button
                            onClick={handleUnblockUser}
                            className="px-5 py-2 bg-slate-900 border border-white/10 hover:bg-slate-850 text-white text-xs font-semibold rounded-xl shadow transition-all"
                          >
                            Unblock
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Stats row: "4 posts   7 followers   7 following" */}
            <div className="flex items-center gap-8 py-1">
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-white text-base">
                  {isBlocked ? 0 : formatStat(profile.posts_count ?? posts.length)}
                </span>
                <span className="text-slate-400 text-sm font-normal">posts</span>
              </div>
              <div 
                onClick={() => {
                  if (!isBlocked && canSeeStats) {
                    fetchFollowers();
                  }
                }}
                className={`flex items-baseline gap-1.5 ${!isBlocked && canSeeStats ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
              >
                <span className="font-bold text-white text-base">
                  {isBlocked ? 0 : formatStat(profile.followers_count)}
                </span>
                <span className="text-slate-400 text-sm font-normal">followers</span>
              </div>
              <div 
                onClick={() => {
                  if (!isBlocked && canSeeStats) {
                    fetchFollowing();
                  }
                }}
                className={`flex items-baseline gap-1.5 ${!isBlocked && canSeeStats ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
              >
                <span className="font-bold text-white text-base">
                  {isBlocked ? 0 : formatStat(profile.following_count)}
                </span>
                <span className="text-slate-400 text-sm font-normal">following</span>
              </div>
            </div>

            {/* Bio line */}
            <div className="pt-0.5">
              {isBlocked ? (
                <p className="text-sm text-slate-500 italic">No information available.</p>
              ) : profile.bio ? (
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap max-w-xl">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">No bio shared yet.</p>
              )}
            </div>

          </div>

        </div>

        {/* PHONE HEADER (below 768px / md:hidden) */}
        <div className="md:hidden space-y-4">
          
          {/* Top row: Avatar on left, Stats on right (Instagram-style) */}
          <div className="flex items-center gap-6">
            
            {/* Avatar (about 96px) with gradient ring */}
            {/* THEME START */}
            <div className="relative flex-shrink-0">
              <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[var(--accent)] via-[var(--accent-2)] to-[var(--gold)] shadow-lg shadow-[var(--shadow-card)]">
                <div className="w-24 h-24 rounded-full bg-[var(--side)] p-0.5 overflow-hidden relative group">
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[var(--input)] border border-[var(--line)]">
            {/* THEME END */}
                    {uploadingAvatar ? (
                      <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                    ) : profile.avatar_url ? (
                      <img 
                        src={`/api/media/file/${profile.avatar_url}`} 
                        alt={profile.username} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-2xl font-black text-brand-400 uppercase">
                        {profile.username.substring(0, 2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Camera badge */}
              {isOwnProfile && (
                <label 
                  htmlFor="profile-avatar-mobile-file-input"
                  className="absolute bottom-0 right-0 p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full transition-all border-2 border-[#050508] shadow-md cursor-pointer active:scale-95" 
                  title="Change Avatar"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <input 
                    id="profile-avatar-mobile-file-input"
                    aria-label="Upload profile avatar"
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarChange} 
                    className="hidden" 
                  />
                </label>
              )}
            </div>

            {/* Stats row on the right (3 columns) */}
            <div className="flex-1 flex justify-around items-center text-center">
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-base">
                  {isBlocked ? 0 : formatStat(profile.posts_count ?? posts.length)}
                </span>
                <span className="text-slate-400 text-xs font-normal">posts</span>
              </div>
              <div 
                onClick={() => {
                  if (!isBlocked && canSeeStats) {
                    fetchFollowers();
                  }
                }}
                className={`flex flex-col ${!isBlocked && canSeeStats ? 'cursor-pointer active:opacity-75' : 'cursor-default'}`}
              >
                <span className="font-extrabold text-white text-base">
                  {isBlocked ? 0 : formatStat(profile.followers_count)}
                </span>
                <span className="text-slate-400 text-xs font-normal">followers</span>
              </div>
              <div 
                onClick={() => {
                  if (!isBlocked && canSeeStats) {
                    fetchFollowing();
                  }
                }}
                className={`flex flex-col ${!isBlocked && canSeeStats ? 'cursor-pointer active:opacity-75' : 'cursor-default'}`}
              >
                <span className="font-extrabold text-white text-base">
                  {isBlocked ? 0 : formatStat(profile.following_count)}
                </span>
                <span className="text-slate-400 text-xs font-normal">following</span>
              </div>
            </div>

          </div>

          {/* Details below: Name, Badge, Handle, Bio */}
          <div className="space-y-1.5">
            <h1 className="text-lg font-black text-white flex items-center gap-1.5">
              {profile.display_name || profile.username}
              {!!profile.is_verified && <VerifiedBadge size={16} />}
            </h1>
            <p className="text-xs font-medium text-slate-400">
              @{profile.username}
            </p>
            <div className="pt-1">
              {isBlocked ? (
                <p className="text-xs text-slate-500 italic">No information available.</p>
              ) : profile.bio ? (
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">No bio shared yet.</p>
              )}
            </div>
          </div>

          {/* Full-width Actions under that */}
          <div className="pt-1">
            {isOwnProfile ? (
              <button
                onClick={() => setShowSettings(true)}
                className="w-full py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                Settings
              </button>
            ) : (
              <div className="flex gap-2">
                {!isBlocked ? (
                  <>
                    <button
                      onClick={handleFollowToggle}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                        profile.is_following
                          ? 'bg-slate-900 border border-white/10 text-slate-300'
                          : profile.is_requested
                          ? 'bg-slate-800 border border-slate-700 text-slate-400'
                          : 'bg-brand-600 text-white'
                      }`}
                    >
                      {profile.is_following ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Following
                        </>
                      ) : profile.is_requested ? (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          Requested
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Follow
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleMessageUser}
                      className="flex-1 py-2.5 bg-white/[0.04] border border-white/10 text-slate-200 text-xs font-semibold rounded-xl shadow-sm transition-all text-center"
                    >
                      Message
                    </button>

                    <button
                      onClick={handleBlockUser}
                      className="py-2.5 px-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl shadow-sm transition-all"
                    >
                      Block
                    </button>
                  </>
                ) : (
                  <>
                    {!viewerBlocked && (
                      <button
                        onClick={handleUnblockUser}
                        className="w-full py-2.5 bg-slate-900 border border-white/10 text-white text-xs font-semibold rounded-xl shadow transition-all"
                      >
                        Unblock
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Tabs navigation: Posts, Saved (Sentence case, semibold, icons, sliding underline, sticky) */}
      <div className="space-y-6">
        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-20 border border-white/[0.04] bg-[#060608]/40 rounded-3xl p-8 select-none text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/[0.04] flex items-center justify-center mb-4 text-slate-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-white">
              {viewerBlocked ? 'Account Not Accessible' : 'User Blocked'}
            </h3>
            <p className="text-xs text-slate-500 mt-2 max-w-sm">
              {viewerBlocked 
                ? 'This profile is not accessible.' 
                : 'You have blocked this user. Unblock to view their profile details and posts.'}
            </p>
          </div>
        ) : profile.is_private && !profile.is_following && !isOwnProfile && !currentUser?.is_admin && !currentUser?.is_top_admin ? (
          <div className="flex items-center justify-center py-16 px-4 select-none border-t border-white/[0.04] mt-6">
            <div className="flex items-center gap-4 text-left max-w-sm">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-slate-300 flex-shrink-0">
                <Lock className="w-5 h-5 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">This profile is private</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {profile.is_requested 
                    ? 'Wait for the owner to accept your follow request.' 
                    : 'Follow to see their photos and videos.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Sticky Tabs Bar */}
            <div className="sticky top-0 z-20 bg-[#050508]/85 backdrop-blur-md border-b border-white/[0.06] -mx-4 sm:-mx-6 px-4 sm:px-6">
              <div className="flex w-full sm:w-auto sm:justify-start gap-2 sm:gap-8">
                
                <button
                  onClick={() => setActiveSubTab('posts')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3.5 sm:py-4 px-2 text-xs sm:text-sm font-semibold transition-all relative ${
                    activeSubTab === 'posts'
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span>Posts</span>
                  {/* THEME START */}
                  {activeSubTab === 'posts' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] rounded-full" />
                  )}
                </button>

                {isOwnProfile && (
                  <button
                    onClick={() => setActiveSubTab('saved')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3.5 sm:py-4 px-2 text-xs sm:text-sm font-semibold transition-all relative ${
                      activeSubTab === 'saved'
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>Saved</span>
                    {activeSubTab === 'saved' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] rounded-full" />
                    )}
                  </button>
                )}
                {/* THEME END */}

              </div>
            </div>

            {/* Tab display */}
            {activeSubTab === 'posts' && (
              posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 mb-3">
                    <Grid className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">No posts shared yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5 sm:gap-4 animate-fade-in">
                  {posts.map((post, idx) => (
                    <div 
                      key={post.id} 
                      onClick={() => {
                        window.history.pushState({}, '', `/?post=${post.id}`);
                        onNavigate('feed');
                      }}
                      style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                      className="relative aspect-square sm:rounded-[18px] overflow-hidden bg-slate-900 border border-white/[0.04] group cursor-pointer shadow-md select-none animate-fade-in"
                    >
                      {post.media && post.media[0] ? (
                        post.media[0].media_type && post.media[0].media_type.startsWith('video/') ? (
                          <video 
                            src={`/api/media/file/${post.media[0].r2_key}`} 
                            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                            preload="metadata"
                            muted
                            playsInline
                          />
                        ) : (
                          <img 
                            src={`/api/media/file/${post.media[0].r2_key}`} 
                            alt={post.caption ? `Post: ${post.caption}` : `Post by ${profile.username}`} 
                            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs">Media unavailable</div>
                      )}
                      
                      {/* Gradient overlay & Stats (zoom on hover + fade in from bottom) */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <div className="flex items-center gap-5 text-white">
                          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                            <Heart className="w-4 h-4 fill-white" />
                            <span>{post.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                            <MessageCircle className="w-4 h-4 fill-white" />
                            <span>{post.comments_count}</span>
                          </div>
                        </div>

                        {/* Top-right Trash Button inside overlay if owner/admin */}
                        {(isOwnProfile || currentUser?.is_admin || currentUser?.is_top_admin) && (
                          <button
                            type="button"
                            aria-label="Delete Post"
                            onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-red-650/90 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all active:scale-90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Delete Post"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeSubTab === 'saved' && (
              loadingSaved ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                </div>
              ) : savedPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 mb-3">
                    <Bookmark className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">No saved posts yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5 sm:gap-4 animate-fade-in">
                  {savedPosts.map((post, idx) => (
                    <div 
                      key={post.id}
                      onClick={() => onNavigate('feed')}
                      style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                      className="relative aspect-square sm:rounded-[18px] overflow-hidden border border-white/[0.04] bg-slate-900 group cursor-pointer select-none animate-fade-in"
                    >
                      {post.media && post.media[0] && (
                        post.media[0].media_type && post.media[0].media_type.startsWith('video/') ? (
                          <video 
                            src={`/api/media/file/${post.media[0].r2_key}`} 
                            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105" 
                            preload="metadata"
                            muted
                            playsInline
                          />
                        ) : (
                          <img 
                            src={`/api/media/file/${post.media[0].r2_key}`} 
                            alt={post.caption ? `Saved post: ${post.caption}` : 'Saved post'} 
                            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105" 
                            loading="lazy"
                          />
                        )
                      )}
                      
                      {/* Gradient Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-5 z-10">
                        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white">
                          <Heart className="w-4 h-4 fill-white" />
                          <span>{post.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white">
                          <MessageCircle className="w-4 h-4 fill-white" />
                          <span>{post.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* FOLLOWERS / FOLLOWING CONNECTIONS LIST MODAL */}
      {showConnectionsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="connections-modal-title"
            className="w-full max-w-sm bg-[#030303] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[60vh] max-h-[450px] shadow-2xl animate-scale-up"
          >
            
            {/* Modal Header */}
            <div className="p-4 border-b border-white/[0.04] flex items-center justify-between bg-slate-950/40">
              <h3 id="connections-modal-title" className="text-xs font-black text-white uppercase tracking-wider">
                {modalTitle}
              </h3>
              <button 
                type="button"
                onClick={() => setShowConnectionsModal(false)}
                aria-label="Close connections list"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {modalLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                  <span className="text-xs">Loading {modalTitle.toLowerCase()}...</span>
                </div>
              ) : modalUsersList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[var(--muted)] text-xs font-semibold text-center px-6">
                  No users found in this list.
                </div>
              ) : (
                modalUsersList.map(u => (
                  <div 
                    key={u.id} 
                    onClick={() => {
                      setShowConnectionsModal(false);
                      onNavigate('profile', u.username);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.01] border border-white/[0.02] hover:border-white/[0.06] hover:bg-white/[0.02] cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-extrabold text-slate-400 overflow-hidden flex-shrink-0 select-none">
                        {u.avatar_url ? (
                          <img src={`/api/media/file/${u.avatar_url}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                        ) : (
                          u.username.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                          {u.display_name || u.username}
                          {!!u.is_verified && <VerifiedBadge size={11} />}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] block truncate">@{u.username}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {avatarToCrop && (
        <ImageCropper
          file={avatarToCrop}
          isAvatar={true}
          onCrop={handleAvatarCropComplete}
          onCancel={() => setAvatarToCrop(null)}
        />
      )}

    </div>
  );
};
