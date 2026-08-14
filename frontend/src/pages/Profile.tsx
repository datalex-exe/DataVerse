import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { compressImage } from '../utils/compress';
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
  X
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

  // Settings tab flow state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'edit_profile' | 'verification' | 'privacy' | 'password' | 'report' | 'blocked_users'>('edit_profile');

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
      } else {
        alert('Failed to block user');
      }
    } catch (err) {
      console.error(err);
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
      } else {
        alert('Failed to unblock user');
      }
    } catch (err) {
      console.error(err);
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
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete post');
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
        alert('Please select an image file.');
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

      const uploadRes = await fetch(`/api/media/upload?key=${encodeURIComponent(r2Key)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'image/jpeg'
        },
        body: compressedAvatar
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload profile photo');
      }

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
    } catch (err: any) {
      alert(err.message || 'Failed to update photo');
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

        const uploadRes = await fetch(`/api/media/upload?key=${encodeURIComponent(docKey)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': verificationDocFile.type || 'application/octet-stream'
          },
          body: verificationDocFile
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          throw new Error(data.error || 'Failed to upload supporting document');
        }

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

  // Submit Report
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
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Settings</h3>
              </div>
              <nav className="space-y-1">
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

            {/* TAB: EDIT PROFILE */}
            {settingsTab === 'edit_profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-md">
                <div>
                  <h2 className="text-base font-black text-white">Edit Profile</h2>
                  <p className="text-[11px] text-slate-500 mt-1">Update your username, email, display name and biography details.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Username</label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Display Name</label>
                  <input
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                    placeholder="Enter display name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Biography</label>
                  <textarea
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Username</label>
                      <input
                        type="text"
                        value={`@${profile?.username}`}
                        disabled
                        className="w-full bg-slate-950/40 border border-white/[0.02] rounded-xl py-2.5 px-4 text-xs text-slate-500 font-bold outline-none cursor-not-allowed"
                      />
                    </div>

                    <button
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Category</label>
                      <select
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Supporting Document (ID Card)</label>
                      <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-brand-500/50 transition-colors cursor-pointer relative bg-slate-950/20">
                        <Sparkles className="w-6 h-6 text-brand-400 mx-auto mb-2" />
                        <p className="text-[10px] text-slate-400 font-bold">
                          {verificationDocFile ? verificationDocFile.name : 'Upload Government Photo ID or Business License'}
                        </p>
                        <p className="text-[8px] text-slate-650 mt-1 uppercase font-semibold">PDF, PNG, JPG accepted</p>
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          accept="image/*,application/pdf" 
                          onChange={(e) => setVerificationDocFile(e.target.files?.[0] || null)}
                          required={!profile.verification_document_url} 
                        />
                      </div>
                      {profile.verification_document_url && (
                        <p className="text-[9px] text-slate-550 pl-1 font-semibold">
                          📄 Current Document: <a href={`/api/media/file/${encodeURIComponent(profile.verification_document_url)}`} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">View Uploaded ID File</a>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Reason for Verification</label>
                      <textarea
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
                  <p className="text-[11px] text-slate-500 mt-1">Enter a new secure password below to update your login credentials.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">New Password</label>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Confirm Password</label>
                  <input
                    type="password"
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

            {/* TAB: REPORT A PROBLEM */}
            {settingsTab === 'report' && (
              <form onSubmit={handleSubmitReport} className="space-y-6 max-w-md animate-fade-in">
                <div>
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-red-400" />
                    <h2 className="text-base font-black text-white">Report a Problem</h2>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Report Type</label>
                  <select
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Reported Username <span className="normal-case font-medium">(optional)</span></label>
                  <input
                    type="text"
                    value={reportedUsernameInput}
                    onChange={(e) => setReportedUsernameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-bold"
                    placeholder="@username (if reporting a specific user)"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Description <span className="normal-case font-medium text-slate-600">(min 10 chars)</span></label>
                  <textarea
                    rows={5}
                    value={reportDescInput}
                    onChange={(e) => setReportDescInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-700 outline-none transition-all font-medium resize-none"
                    placeholder="Please describe the issue in detail. Include any relevant context, links, or usernames..."
                  />
                  <p className="text-[9px] text-slate-600 pl-1">{reportDescInput.length} characters</p>
                </div>

                {/* Disclaimer */}
                <div className="p-3 bg-slate-950/50 border border-white/[0.03] rounded-xl">
                  <p className="text-[9px] text-slate-600 leading-relaxed">
                    🔒 Your report is confidential. It will be forwarded to our safety team at <span className="text-slate-500 font-bold">datalex.exe@gmail.com</span> for review. False or malicious reports may result in account restrictions.
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

  return (
    <div className="w-full max-w-4xl mx-auto self-center px-4 py-8 space-y-10 animate-fade-in">
      
      {/* Profile Header block matching Image 5 layout */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 select-none">
        
        {/* Large Avatar */}
        <div className="relative group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shadow-xl">
            {uploadingAvatar ? (
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
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
          
          {isOwnProfile && (
            <label className="absolute bottom-0 right-0 p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full transition-all border border-slate-950 shadow-md cursor-pointer">
              <Camera className="w-3.5 h-3.5" />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                className="hidden" 
              />
            </label>
          )}
        </div>

        {/* Info Area */}
        <div className="flex-1 text-center sm:text-left space-y-4">
          
          {/* Name & Buttons row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <h2 className="text-xl font-black text-white flex items-center justify-center sm:justify-start">
              {profile.display_name || profile.username}
              {!!profile.is_verified && <VerifiedBadge size={16} />}
            </h2>

            {/* Action buttons */}
            <div className="flex gap-2 justify-center">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="py-1.5 px-6 bg-slate-950 border border-slate-900 hover:bg-slate-900/50 text-slate-300 hover:text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </button>
                  <button
                    onClick={() => logout()}
                    className="md:hidden py-1.5 px-6 bg-red-650/10 border border-red-500/20 hover:bg-red-650/20 text-red-500 hover:text-red-400 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  {!isBlocked ? (
                    <>
                      <button
                        onClick={handleFollowToggle}
                        className={`py-1.5 px-6 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 ${
                          profile.is_following
                            ? 'bg-slate-955 border border-slate-900 text-slate-400 hover:text-slate-200'
                            : profile.is_requested
                            ? 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
                            : 'bg-brand-600 hover:bg-brand-500 text-white hover:shadow-brand-500/10'
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
                        className="py-1.5 px-6 bg-slate-950 border border-slate-900 hover:bg-slate-900/50 text-slate-300 hover:text-white text-xs font-bold rounded-xl shadow transition-all"
                      >
                        Message
                      </button>

                      <button
                        onClick={handleBlockUser}
                        className="py-1.5 px-6 bg-red-650/10 border border-red-500/20 hover:bg-red-650/20 text-red-500 hover:text-red-400 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 uppercase tracking-wider"
                      >
                        Block
                      </button>
                    </>
                  ) : (
                    <>
                      {!viewerBlocked && (
                        <button
                          onClick={handleUnblockUser}
                          className="py-1.5 px-6 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white text-xs font-bold rounded-xl shadow transition-all"
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

          {/* Subtitle username */}
          <p className="text-xs text-slate-400 font-semibold">
            @{profile.username}
          </p>

          {/* Stats counts */}
          <div className="flex justify-center sm:justify-start gap-6 text-xs border-y border-white/[0.02] py-2.5">
            <div>
              <span className="font-extrabold text-white mr-1">{isBlocked ? 0 : formatStat(profile.posts_count ?? posts.length)}</span>
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">posts</span>
            </div>
            <div 
              onClick={() => {
                if (!isBlocked && canSeeStats) {
                  fetchFollowers();
                }
              }}
              className={`select-none ${!isBlocked && canSeeStats ? 'cursor-pointer hover:text-brand-400 transition-all' : 'cursor-default'}`}
            >
              <span className="font-extrabold text-white mr-1">{isBlocked ? 0 : formatStat(profile.followers_count)}</span>
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">followers</span>
            </div>
            <div 
              onClick={() => {
                if (!isBlocked && canSeeStats) {
                  fetchFollowing();
                }
              }}
              className={`select-none ${!isBlocked && canSeeStats ? 'cursor-pointer hover:text-brand-400 transition-all' : 'cursor-default'}`}
            >
              <span className="font-extrabold text-white mr-1">{isBlocked ? 0 : formatStat(profile.following_count)}</span>
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">following</span>
            </div>
          </div>

          {/* Bio text */}
          {/* Bio text */}
          {isBlocked ? (
            <p className="text-[10px] text-slate-600 italic">No information available.</p>
          ) : profile.bio ? (
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-w-xl">
              {profile.bio}
            </p>
          ) : (
            <p className="text-[10px] text-slate-600 italic">No bio shared yet.</p>
          )}

        </div>

      </div>

      {/* Tabs navigation: Posts, Saved */}
      <div className="space-y-6">
        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-20 border border-white/[0.04] bg-[#060608]/20 rounded-3xl p-8 select-none text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/[0.04] flex items-center justify-center mb-4 text-slate-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
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
                <h3 className="text-xs sm:text-sm font-extrabold text-white">This profile is private</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {profile.is_requested 
                    ? 'Wait for the owner to accept your follow request.' 
                    : 'Follow to see their photos and videos.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center sm:justify-start gap-8 border-b border-white/[0.04]">
              
              <button
                onClick={() => setActiveSubTab('posts')}
                className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider pb-4 -mb-[1px] transition-all border-b-2 ${
                  activeSubTab === 'posts'
                    ? 'text-brand-500 border-brand-500'
                    : 'text-slate-550 border-transparent hover:text-slate-350'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Posts
              </button>

              {isOwnProfile && (
                <button
                  onClick={() => setActiveSubTab('saved')}
                  className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider pb-4 -mb-[1px] transition-all border-b-2 ${
                    activeSubTab === 'saved'
                      ? 'text-brand-500 border-brand-500'
                      : 'text-slate-550 border-transparent hover:text-slate-350'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Saved
                </button>
              )}

            </div>

            {/* Tab display */}
            {activeSubTab === 'posts' && (
              posts.length === 0 ? (
                <div className="text-center py-20 text-slate-600 text-xs font-semibold select-none">
                  No posts shared yet.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 md:gap-4 animate-fade-in">
                  {posts.map((post) => (
                    <div 
                      key={post.id} 
                      onClick={() => {
                        window.history.pushState({}, '', `/?post=${post.id}`);
                        onNavigate('feed');
                      }}
                      className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-white/[0.03] group cursor-pointer shadow-md"
                    >
                      {post.media && post.media[0] ? (
                        <img 
                          src={`/api/media/file/${post.media[0].r2_key}`} 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-800 text-xs">Media error</div>
                      )}
                      
                      {/* Stats hover Overlay */}
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-1.5 text-white">
                            <Heart className="w-4.5 h-4.5 fill-white" />
                            <span className="text-xs font-extrabold">{post.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-white">
                            <MessageCircle className="w-4.5 h-4.5 fill-white" />
                            <span className="text-xs font-extrabold">{post.comments_count}</span>
                          </div>
                        </div>

                        {/* Top-right Trash Button inside overlay if owner/admin */}
                        {(isOwnProfile || currentUser?.is_admin || currentUser?.is_top_admin) && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                            className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-all flex items-center justify-center shadow cursor-pointer active:scale-95"
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
                <div className="text-center py-20 text-slate-655 text-xs font-semibold select-none">
                  No saved posts yet.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-4 animate-fade-in">
                  {savedPosts.map((post) => (
                    <div 
                      key={post.id}
                      onClick={() => onNavigate('feed')}
                      className="aspect-square relative rounded-2xl overflow-hidden border border-white/[0.03] bg-slate-950/20 group cursor-pointer"
                    >
                      {post.media && post.media[0] && (
                        <img 
                          src={`/api/media/file/${post.media[0].r2_key}`} 
                          alt={post.caption || ''} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 z-10">
                        <div className="flex items-center gap-1.5 text-white">
                          <Heart className="w-4.5 h-4.5 fill-white" />
                          <span className="text-xs font-extrabold">{post.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white">
                          <MessageCircle className="w-4.5 h-4.5 fill-white" />
                          <span className="text-xs font-extrabold">{post.comments_count}</span>
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
          <div className="w-full max-w-sm bg-[#030303] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[60vh] max-h-[450px] shadow-2xl animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-white/[0.04] flex items-center justify-between bg-slate-950/40">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                {modalTitle}
              </h3>
              <button 
                onClick={() => setShowConnectionsModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
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
                <div className="h-full flex items-center justify-center text-slate-550 text-xs font-semibold text-center px-6">
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
                          <img src={`/api/media/file/${u.avatar_url}`} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                          u.username.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                          {u.display_name || u.username}
                          {!!u.is_verified && <VerifiedBadge size={11} />}
                        </span>
                        <span className="text-[10px] text-slate-555 block truncate">@{u.username}</span>
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
