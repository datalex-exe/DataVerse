import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Footer } from '../components/Footer';
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
  /* THEME START */
  Sun
  /* THEME END */
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

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Profile tabs state
  const [activeSubTab, setActiveSubTab] = useState<string>('posts'); // 'posts' | 'saved'

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  /* THEME START */
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'edit_profile' | 'security' | 'verification' | 'privacy' | 'password' | 'report' | 'blocked_users' | 'theme'>('edit_profile');
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
    setLoading(true);
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
        setPosts(postsData.posts || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
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
          new_password: newPasswordInput.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Password update failed');
      }

      setSettingsSuccessMsg('Your account password was updated successfully.');
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

  if (loading) {
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

  // INSTAGRAM SETTINGS WORKSPACE VIEW
  if (showSettings) {
    return (
      <div className="w-full max-w-4xl mx-auto self-center px-4 py-8 animate-fade-in">
        <div className="glass-card rounded-3xl overflow-hidden border border-white/5 shadow-2xl flex flex-col md:flex-row min-h-[500px]">
          
          {/* Left Settings Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/[0.04] bg-slate-950/20 p-5 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="px-2">
                <h1 className="text-xs font-black text-white uppercase tracking-widest">Settings</h1>
              </div>
              <nav aria-label="Settings navigation" className="space-y-1">
                <button
                  onClick={() => { setSettingsTab('edit_profile'); setSettingsSuccessMsg(null); setSettingsErrorMsg(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                    settingsTab === 'edit_profile'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  onClick={() => { setSettingsTab('verification'); setSettingsSuccessMsg(null); setSettingsErrorMsg(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                    settingsTab === 'verification'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Request Verification
                </button>
                <button
                  onClick={() => { setSettingsTab('privacy'); setSettingsSuccessMsg(null); setSettingsErrorMsg(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                    settingsTab === 'privacy'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Account Privacy
                </button>
                <button
                  onClick={() => { setSettingsTab('password'); setSettingsSuccessMsg(null); setSettingsErrorMsg(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                    settingsTab === 'password'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  Change Password
                </button>
                <button
                  onClick={() => { setSettingsTab('security'); setSettingsSuccessMsg(null); setSettingsErrorMsg(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                    settingsTab === 'security'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                  }`}
                >
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Security & 2FA
                </button>
                <button
                  onClick={() => { setSettingsTab('blocked_users'); setSettingsSuccessMsg(null); setSettingsErrorMsg(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                    settingsTab === 'blocked_users'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                  }`}
                >
                  <Lock className="w-4 h-4 text-red-400" />
                  Blocked Users
                </button>
                <button
                  onClick={() => { setSettingsTab('report'); setReportSuccessMsg(null); setReportErrorMsg(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                    settingsTab === 'report'
                      ? 'bg-red-600/80 text-white shadow-md'
                      : 'text-slate-400 hover:text-red-400 hover:bg-red-900/10'
                  }`}
                >
                  <Flag className="w-4 h-4" />
                  Report a Problem
                </button>
                {/* THEME START */}
                <button
                  onClick={() => { setSettingsTab('theme'); setSettingsSuccessMsg(null); setSettingsErrorMsg(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                    settingsTab === 'theme'
                      ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                  }`}
                >
                  <Sun className="w-4 h-4 text-[var(--gold)]" />
                  Theme & Appearance
                </button>
                {/* THEME END */}
              </nav>
            </div>

            <button
              onClick={() => { setShowSettings(false); fetchProfileData(); }}
              className="mt-8 w-full py-2.5 px-4 bg-slate-905 border border-slate-900 text-slate-350 hover:text-white rounded-xl text-[10px] font-black transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </button>
          </div>

          {/* Right Contents Pane */}
          <div className="flex-1 p-6 sm:p-8 bg-[#030303]/60 relative min-h-[450px]">
            
            {/* Loading/Verifying overlay */}
            {verifyingState === 'submitting' && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-9 h-9 text-brand-500 animate-spin" />
                <div className="text-center space-y-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Safety Team Review</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto animate-pulse font-medium">
                    Reviewing credentials and authenticating DataVerse Verified Badge...
                  </p>
                </div>
              </div>
            )}

            {settingsSuccessMsg && (
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-2xl animate-fade-in flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {settingsSuccessMsg}
              </div>
            )}

            {settingsErrorMsg && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-2xl animate-fade-in">
                {settingsErrorMsg}
              </div>
            )}

            {/* THEME START */}
            {/* TAB: THEME SETTINGS */}
            {settingsTab === 'theme' && (
              <div className="space-y-6 max-w-md animate-fade-in">
                <div>
                  <h2 className="text-base font-black text-white">Theme & Appearance</h2>
                  <p className="text-[11px] text-slate-500 mt-1">Switch between Aurora Teal (Dark) and Warm Sand (Light) modes, or follow system appearance.</p>
                </div>
                <SettingsThemeControl />
              </div>
            )}
            {/* THEME END */}

            {/* TAB: EDIT PROFILE */}
            {settingsTab === 'edit_profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-md">
                <div>
                  <h2 className="text-base font-black text-white">Edit Profile</h2>
                  <p className="text-[11px] text-[var(--muted)] mt-1">Update your username, email, display name and biography details.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="profile-username" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Username</label>
                  <input
                    id="profile-username"
                    type="text"
                    autoComplete="username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="profile-email" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Email Address</label>
                  <input
                    id="profile-email"
                    type="email"
                    autoComplete="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="profile-display-name" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Display Name</label>
                  <input
                    id="profile-display-name"
                    type="text"
                    autoComplete="name"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                    placeholder="Enter display name"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="profile-bio" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Biography</label>
                  <textarea
                    id="profile-bio"
                    rows={4}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-medium"
                    placeholder="Write a brief bio about yourself..."
                  />
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-6 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all uppercase tracking-wider flex items-center gap-2"
                >
                  Save Changes
                </button>
              </form>
            )}

            {/* TAB: REQUEST VERIFICATION */}
            {settingsTab === 'verification' && (
              <div className="space-y-6 max-w-md animate-fade-in select-none">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-black text-white">DataVerse Verified</h2>
                    <VerifiedBadge size={16} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Establish your authentic presence on DataVerse. Premium verification helps you stand out and secure your identity.
                  </p>
                </div>

                {profile?.is_verified ? (
                  /* STATE 1: FULLY VERIFIED */
                  <div className="glass-card p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <VerifiedBadge size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Verification Active</h4>
                        <p className="text-[10px] text-slate-500">Your profile features the premium verified badge.</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-white/[0.03] pt-4 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Verified Category</p>
                      <p className="text-xs text-white font-semibold">{profile.verification_category || 'Creator'}</p>
                      
                      {profile.verification_reason && (
                        <>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-3">Reason Submitted</p>
                          <p className="text-xs text-slate-400 leading-relaxed italic">"{profile.verification_reason}"</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : !profile?.is_verification_paid || timeRemainingText === 'Expired' ? (
                  /* STATE 2: UNPAID OR WINDOW EXPIRED */
                  <div className="space-y-6">
                    {timeRemainingText === 'Expired' && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold rounded-2xl flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Your 3-day verification submission window has expired. You must purchase a new subscription to submit documents.</span>
                      </div>
                    )}

                    {/* Subscription Billing Plan Details */}
                    <div className="glass-card p-5 rounded-2xl border border-brand-500/20 bg-brand-500/5 relative overflow-hidden flex items-center justify-between shadow-xl shadow-brand-500/5">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2 py-0.5 rounded-full">Premium Badge</span>
                        <h4 className="text-sm font-extrabold text-white">Verification Subscription</h4>
                        <p className="text-[10px] text-slate-400">Includes verified badge + priority platform support.</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-white">₹199</span>
                        <span className="text-[9px] text-slate-500 block font-bold">/ month</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="verified-username-display" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Username</label>
                      <input
                        id="verified-username-display"
                        type="text"
                        value={`@${profile?.username}`}
                        disabled
                        className="w-full bg-slate-950/40 border border-white/[0.02] rounded-xl py-2.5 px-4 text-xs text-[var(--muted)] font-bold outline-none cursor-not-allowed"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handlePayVerification}
                      disabled={payingVerification}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-xl text-xs font-black shadow-lg shadow-brand-500/10 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      {payingVerification ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing Payment...</>
                      ) : (
                        'Subscribe & Start Verification (₹199/mo)'
                      )}
                    </button>
                  </div>
                ) : (
                  /* STATE 3: PAID & WINDOW ACTIVE */
                  <form onSubmit={handleRequestVerification} className="space-y-6">
                    {/* Countdown Banner */}
                    <div className="p-4 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-pulse text-brand-400" />
                        <span>Submission Window Active</span>
                      </div>
                      <span className="font-mono text-sm bg-brand-500/20 px-2.5 py-1 rounded-lg text-white border border-brand-500/30">
                        {timeRemainingText}
                      </span>
                    </div>

                    {profile.verification_status === 'pending' && (
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-2xl">
                        ⏳ Your verification details have been submitted and are currently under review. You can resubmit or update documents at any time before the timer expires.
                      </div>
                    )}

                    {profile.verification_status === 'rejected' && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-2xl flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Your previous request was rejected. You can update and resubmit your details before the window expires.</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="verified-category-select" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Category</label>
                      <select
                        id="verified-category-select"
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white outline-none transition-all font-bold"
                      >
                        <option value="Creator">Digital Creator / Blogger</option>
                        <option value="Music">Musician / Artist</option>
                        <option value="Entertainment">Entertainment / Media</option>
                        <option value="Business">Business / Brand / Organisation</option>
                        <option value="Government">Government / Public Figure</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="verified-doc-upload" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Supporting Document (ID Card)</label>
                      <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-brand-500/50 transition-colors cursor-pointer relative bg-slate-950/20">
                        <Sparkles className="w-6 h-6 text-brand-400 mx-auto mb-2" />
                        <p className="text-[10px] text-slate-300 font-bold">
                          {verificationDocFile ? verificationDocFile.name : 'Upload Government Photo ID or Business License'}
                        </p>
                        <p className="text-[8px] text-[var(--muted)] mt-1 uppercase font-semibold">PDF, PNG, JPG accepted</p>
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
                        <p className="text-[9px] text-[var(--muted)] pl-1 font-semibold">
                          📄 Current Document: <a href={`/api/media/file/${encodeURIComponent(profile.verification_document_url)}`} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">View Uploaded ID File</a>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="verified-reason-input" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Reason for Verification</label>
                      <textarea
                        id="verified-reason-input"
                        rows={3}
                        value={reasonInput}
                        onChange={(e) => setReasonInput(e.target.value)}
                        className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-medium"
                        placeholder="Briefly state why your account requires verification..."
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploadingVerificationDoc}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-xl text-xs font-black shadow-lg shadow-brand-500/10 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      {uploadingVerificationDoc ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Uploading Document...</>
                      ) : profile.verification_document_url ? (
                        'Update & Resubmit Details'
                      ) : (
                        'Submit Verification Details'
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB: ACCOUNT PRIVACY */}
            {settingsTab === 'privacy' && (
              <div className="space-y-6 max-w-md">
                <div>
                  <h2 className="text-lg font-black text-white">Account Privacy</h2>
                  <p className="text-[11px] text-slate-500 mt-1">Control who can interact with your profile and view your media.</p>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-white/5 bg-slate-950/20 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Private Account</h4>
                    <p className="text-[9px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                      Only people you approve will be able to see your posts and reels. Followers won't be affected.
                    </p>
                  </div>
                  <button
                    onClick={() => handleTogglePrivacy(!isPrivateInput)}
                    className={`w-11 h-6 rounded-full transition-all duration-300 relative ${
                      isPrivateInput ? 'bg-brand-600' : 'bg-slate-800'
                    }`}
                  >
                    <div 
                      className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${
                        isPrivateInput ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* TAB: CHANGE PASSWORD */}
            {settingsTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                <div>
                  <h2 className="text-lg font-black text-white">Change Password</h2>
                  <p className="text-[11px] text-[var(--muted)] mt-1">Enter a new secure password below to update your login credentials.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="settings-new-password" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">New Password</label>
                  <input
                    id="settings-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="settings-confirm-password" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Confirm Password</label>
                  <input
                    id="settings-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-6 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all uppercase tracking-wider"
                >
                  Change Password
                </button>
              </form>
            )}

            {/* TAB: TWO-FACTOR AUTHENTICATION (2FA) */}
            {settingsTab === 'security' && (
              <div className="space-y-6 max-w-xl animate-fade-in">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg font-black text-white">Two-Factor Authentication (2FA)</h2>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    Protect your account with RFC 6238 time-based one-time passcodes (TOTP) from apps like Google Authenticator, 1Password, or Authy.
                  </p>
                </div>

                {loading2FA ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                    <span className="text-xs">Checking security status...</span>
                  </div>
                ) : (
                  <>
                    {/* Status Card */}
                    <div className="glass-card p-5 rounded-2xl border border-white/5 bg-slate-950/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            twoFactorStatus?.enabled 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {twoFactorStatus?.enabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">
                                {twoFactorStatus?.enabled ? 'Two-Factor Authentication is Active' : 'Two-Factor Authentication is Disabled'}
                              </h3>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                twoFactorStatus?.enabled
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {twoFactorStatus?.enabled ? 'Protected' : 'Off'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
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
                            className="py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md uppercase tracking-wider flex items-center gap-1.5"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            Enable 2FA
                          </button>
                        )}
                      </div>

                      {/* If enabled: show recovery codes status & management buttons */}
                      {twoFactorStatus?.enabled && !isDisabling2FA && !isRegeneratingCodes && (
                        <div className="pt-3 border-t border-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="text-[11px] text-slate-400">
                            Backup recovery codes remaining:{' '}
                            <span className={`font-mono font-bold ${
                              (twoFactorStatus.backup_codes_remaining ?? 0) > 3 
                                ? 'text-emerald-400' 
                                : 'text-amber-400 font-bold'
                            }`}>
                              {twoFactorStatus.backup_codes_remaining ?? 0} of 10
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsRegeneratingCodes(true);
                                setNewBackupCodes(null);
                                setRegenError(null);
                              }}
                              className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Regenerate Codes
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsDisabling2FA(true);
                                setDisableError(null);
                              }}
                              className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider flex items-center gap-1.5"
                            >
                              Disable
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ENROLLMENT WIZARD */}
                    {isSettingUp2FA && !twoFactorStatus?.enabled && (
                      <div className="glass-card p-6 rounded-2xl border border-brand-500/30 bg-slate-950/40 space-y-6 animate-fade-in">
                        {/* Progress Stepper */}
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              setupStep >= 1 ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>1</span>
                            <span className="text-xs font-bold text-white">Authenticate</span>
                          </div>
                          <div className="h-0.5 w-8 bg-white/[0.08]" />
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              setupStep >= 2 ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>2</span>
                            <span className="text-xs font-bold text-white">Scan & Verify</span>
                          </div>
                          <div className="h-0.5 w-8 bg-white/[0.08]" />
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              setupStep >= 3 ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>3</span>
                            <span className="text-xs font-bold text-white">Backup Codes</span>
                          </div>
                        </div>

                        {setupError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl animate-fade-in flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{setupError}</span>
                          </div>
                        )}

                        {/* STEP 1: Re-authenticate with password */}
                        {setupStep === 1 && (
                          <form onSubmit={handleStartSetup2FA} className="space-y-4">
                            <p className="text-xs text-slate-300">
                              Please enter your current account password to confirm identity before configuring two-factor authentication.
                            </p>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">
                                Current Password
                              </label>
                              <input
                                type="password"
                                autoComplete="current-password"
                                value={setupPassword}
                                onChange={(e) => setSetupPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                                placeholder="Enter your current password"
                                required
                              />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSettingUp2FA(false);
                                  setSetupPassword('');
                                  setSetupError(null);
                                }}
                                className="py-2.5 px-4 bg-transparent hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={setupSubmitting || !setupPassword}
                                className="py-2.5 px-6 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all uppercase tracking-wider flex items-center gap-2"
                              >
                                {setupSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Continue to QR Code
                              </button>
                            </div>
                          </form>
                        )}

                        {/* STEP 2: Scan QR & Enter 6-digit TOTP */}
                        {setupStep === 2 && setupQrData && (
                          <form onSubmit={handleConfirmEnable2FA} className="space-y-5">
                            <p className="text-xs text-slate-300">
                              Open your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, 1Password) and scan this QR code:
                            </p>

                            {/* Clean White Card for high-contrast QR scanning */}
                            <div className="bg-white p-4 rounded-2xl w-52 h-52 mx-auto flex items-center justify-center shadow-2xl">
                              <div
                                dangerouslySetInnerHTML={{ __html: setupQrData.qr_code_svg }}
                                className="w-full h-full [&>svg]:w-full [&>svg]:h-full flex items-center justify-center"
                              />
                            </div>

                            {/* Manual Secret Key Fallback */}
                            <div className="p-3 bg-slate-950/70 border border-white/[0.04] rounded-xl space-y-1 text-center">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Can't scan? Enter secret key manually:
                              </span>
                              <div className="flex items-center justify-center gap-2">
                                <code className="font-mono text-xs font-black text-brand-300 tracking-wider select-all">
                                  {setupQrData.secret}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(setupQrData.secret);
                                    toast.success('Secret key copied to clipboard');
                                  }}
                                  className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-all"
                                  title="Copy secret"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">
                                Enter 6-digit Code from Authenticator
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={setupVerifyCode}
                                onChange={(e) => setSetupVerifyCode(e.target.value.replace(/\D/g, ''))}
                                className="w-full text-center tracking-[0.5em] font-mono text-base font-black bg-slate-950 border border-white/[0.06] focus:border-brand-500 rounded-xl py-2.5 px-4 text-white outline-none transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-700"
                                placeholder="000000"
                                required
                              />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <button
                                type="button"
                                onClick={() => setSetupStep(1)}
                                className="text-xs text-slate-500 hover:text-white transition-colors"
                              >
                                &larr; Back
                              </button>
                              <button
                                type="submit"
                                disabled={setupSubmitting || setupVerifyCode.trim().length !== 6}
                                className="py-2.5 px-6 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all uppercase tracking-wider flex items-center gap-2"
                              >
                                {setupSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Verify & Activate
                              </button>
                            </div>
                          </form>
                        )}

                        {/* STEP 3: Backup Codes Display */}
                        {setupStep === 3 && (
                          <div className="space-y-5 animate-fade-in">
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-2xl flex items-start gap-2.5">
                              <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                              <div>
                                <span className="font-bold text-white block">2FA Successfully Verified!</span>
                                Save your recovery backup codes below. If you lose your phone or authenticator app, these codes are the ONLY way to regain access to your account.
                              </div>
                            </div>

                            {/* 10 Backup Codes in a clean 2-column grid */}
                            <div className="p-4 bg-slate-950/80 border border-white/[0.06] rounded-2xl">
                              <div className="grid grid-cols-2 gap-2 text-center">
                                {setupBackupCodes.map((code, idx) => (
                                  <div
                                    key={idx}
                                    className="font-mono text-xs font-bold text-slate-200 bg-white/[0.03] py-2 px-3 rounded-lg border border-white/[0.02] tracking-wider select-all"
                                  >
                                    <span className="text-[10px] text-slate-600 mr-2">{idx + 1}.</span>
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
                                className="flex-1 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy All
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadBackupCodes(setupBackupCodes)}
                                className="flex-1 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download .txt
                              </button>
                            </div>

                            {/* Checkbox Acknowledgment */}
                            <label className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl cursor-pointer">
                              <input
                                type="checkbox"
                                checked={backupCodesAcknowledged}
                                onChange={(e) => setBackupCodesAcknowledged(e.target.checked)}
                                className="mt-0.5 rounded border-slate-700 text-brand-600 focus:ring-brand-500"
                              />
                              <span className="text-[11px] text-slate-300 font-medium">
                                I have saved these 10 recovery codes in a secure location and understand each code can only be used once.
                              </span>
                            </label>

                            <button
                              type="button"
                              disabled={!backupCodesAcknowledged}
                              onClick={handleFinishSetup2FA}
                              className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md shadow-brand-500/20 transition-all uppercase tracking-wider"
                            >
                              Finish Setup & Protect Account
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DISABLE 2FA CONFIRMATION MODAL / PANEL */}
                    {isDisabling2FA && (
                      <form onSubmit={handleDisable2FA} className="glass-card p-6 rounded-2xl border border-red-500/30 bg-slate-950/40 space-y-4 animate-fade-in">
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertTriangle className="w-5 h-5" />
                          <h3 className="text-sm font-bold text-white">Disable Two-Factor Authentication</h3>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Disabling 2FA will remove this security layer from your account and invalidate all trusted devices. You will be able to log in with just your password.
                        </p>

                        {disableError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl">
                            {disableError}
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">
                            Account Password
                          </label>
                          <input
                            type="password"
                            autoComplete="current-password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            className="w-full bg-slate-950 border border-white/[0.04] focus:border-red-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                            placeholder="Enter password"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">
                            Current 6-digit 2FA Code
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={disableCode}
                            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full tracking-widest font-mono text-center bg-slate-950 border border-white/[0.04] focus:border-red-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
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
                            className="py-2 px-4 text-xs text-slate-400 hover:text-white font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={disableSubmitting || !disablePassword || disableCode.length !== 6}
                            className="py-2.5 px-6 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-2"
                          >
                            {disableSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Confirm Disable 2FA
                          </button>
                        </div>
                      </form>
                    )}

                    {/* REGENERATE BACKUP CODES PANEL */}
                    {isRegeneratingCodes && (
                      <div className="glass-card p-6 rounded-2xl border border-white/10 bg-slate-950/40 space-y-4 animate-fade-in">
                        <div className="flex items-center gap-2 text-brand-400">
                          <RefreshCw className="w-5 h-5" />
                          <h3 className="text-sm font-bold text-white">Regenerate Recovery Backup Codes</h3>
                        </div>

                        {!newBackupCodes ? (
                          <form onSubmit={handleRegenerateBackupCodes} className="space-y-4">
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Generating new backup codes will invalidate any existing codes. Enter your current 6-digit authenticator code to proceed:
                            </p>

                            {regenError && (
                              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl">
                                {regenError}
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">
                                Current 6-digit Code
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={regenCode}
                                onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, ''))}
                                className="w-full tracking-widest font-mono text-center bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white outline-none transition-all font-bold"
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
                                className="py-2 px-4 text-xs text-slate-400 hover:text-white font-bold"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={regenSubmitting || regenCode.length !== 6}
                                className="py-2.5 px-6 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-2"
                              >
                                {regenSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Generate New Codes
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="space-y-4">
                            <div className="p-4 bg-slate-950/80 border border-white/[0.06] rounded-2xl">
                              <div className="grid grid-cols-2 gap-2 text-center">
                                {newBackupCodes.map((code, idx) => (
                                  <div
                                    key={idx}
                                    className="font-mono text-xs font-bold text-slate-200 bg-white/[0.03] py-2 px-3 rounded-lg border border-white/[0.02] tracking-wider select-all"
                                  >
                                    <span className="text-[10px] text-slate-600 mr-2">{idx + 1}.</span>
                                    {code}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleCopyBackupCodes(newBackupCodes)}
                                className="flex-1 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy All
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadBackupCodes(newBackupCodes)}
                                className="flex-1 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download .txt
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setIsRegeneratingCodes(false);
                                setNewBackupCodes(null);
                              }}
                              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
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
              <form onSubmit={handleSubmitReport} className="space-y-6 max-w-md animate-fade-in">
                <div>
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-red-400" />
                    <h2 className="text-base font-black text-white">Report a Problem</h2>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    Report inappropriate content, abusive behaviour, or any safety concern. Your report is confidential and will be reviewed by our safety team.
                  </p>
                </div>

                {reportSuccessMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-2xl animate-fade-in flex items-start gap-2">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{reportSuccessMsg}</span>
                  </div>
                )}

                {reportErrorMsg && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-2xl animate-fade-in">
                    {reportErrorMsg}
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="report-type-select" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Report Type</label>
                  <select
                    id="report-type-select"
                    value={reportTypeInput}
                    onChange={(e) => setReportTypeInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white outline-none transition-all font-bold"
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
                  <label htmlFor="reported-username-input" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Reported Username <span className="normal-case font-medium">(optional)</span></label>
                  <input
                    id="reported-username-input"
                    type="text"
                    value={reportedUsernameInput}
                    onChange={(e) => setReportedUsernameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                    placeholder="@username (if reporting a specific user)"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="report-description-textarea" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Description <span className="normal-case font-medium text-[var(--muted)]">(min 10 chars)</span></label>
                  <textarea
                    id="report-description-textarea"
                    rows={5}
                    value={reportDescInput}
                    onChange={(e) => setReportDescInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-medium resize-none"
                    placeholder="Please describe the issue in detail. Include any relevant context, links, or usernames..."
                  />
                  <p className="text-[9px] text-[var(--muted)] pl-1">{reportDescInput.length} characters</p>
                </div>

                {/* Disclaimer */}
                <div className="p-3 bg-slate-950/50 border border-white/[0.03] rounded-xl">
                  <p className="text-[9px] text-slate-600 leading-relaxed">
                    🔒 Your report is confidential. It will be forwarded to our safety team at <span className="text-[var(--accent-2)] font-bold">dataverse@datalexcloud.tech</span> for review. False or malicious reports may result in account restrictions.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={reportSubmitting || reportDescInput.trim().length < 10}
                  className={`py-2.5 px-6 rounded-xl text-xs font-bold shadow-md transition-all uppercase tracking-wider flex items-center gap-2 ${
                    reportSubmitting || reportDescInput.trim().length < 10
                      ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20'
                  }`}
                >
                  {reportSubmitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                  ) : (
                    <><Flag className="w-3.5 h-3.5" /> Submit Report</>
                  )}
                </button>
              </form>
            )}

            {/* TAB: BLOCKED USERS */}
            {settingsTab === 'blocked_users' && (
              <div className="space-y-6 animate-fade-in max-w-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-400" />
                    <h2 className="text-base font-black text-white">Blocked Users</h2>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Manage accounts you have blocked. Blocked users cannot view your profile, posts, stories, comments, or send you messages.
                  </p>
                </div>

                {loadingBlockedUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                  </div>
                ) : blockedUsersList.length === 0 ? (
                  <div className="p-8 border border-white/[0.04] bg-[#060608]/20 rounded-2xl text-center select-none">
                    <p className="text-xs text-slate-500 font-semibold">You haven't blocked any users yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockedUsersList.map((blockedUser) => (
                      <div 
                        key={blockedUser.id}
                        className="flex items-center justify-between p-3.5 bg-slate-950/40 border border-white/[0.03] rounded-2xl hover:border-white/[0.08] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          {blockedUser.avatar_url ? (
                            <img 
                              src={blockedUser.avatar_url} 
                              alt={blockedUser.username} 
                              className="w-10 h-10 rounded-full object-cover border border-white/[0.05]"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/[0.05] flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                              {blockedUser.username.substring(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-extrabold text-white">
                              {blockedUser.display_name || blockedUser.username}
                            </p>
                            <p className="text-[10px] text-slate-550">
                              @{blockedUser.username}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnblockUserFromList(blockedUser.id)}
                          className="py-1.5 px-4 bg-slate-900 hover:bg-slate-850 border border-white/[0.04] hover:border-white/[0.08] text-white hover:text-red-400 text-[10px] font-bold rounded-xl transition-all uppercase tracking-wider shadow-sm"
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

      <Footer onNavigate={onNavigate} className="border-t-0 mt-8" />
    </div>
  );
};
