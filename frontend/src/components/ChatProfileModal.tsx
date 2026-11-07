import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, 
  Phone, 
  User as UserIcon, 
  ExternalLink, 
  Copy, 
  Check, 
  FileText, 
  Download, 
  Play, 
  Pause, 
  Shield, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Folder as FolderIcon, 
  Mic, 
  Loader2, 
  Users, 
  Film,
  Eye
} from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';

export interface SharedSender {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
}

export interface SharedMediaItem {
  id: string;
  message_id: string;
  url: string;
  media_type: 'image' | 'video';
  file_name?: string;
  allow_save?: boolean;
  created_at: number;
  sender: SharedSender;
}

export interface SharedLinkItem {
  id: string;
  message_id: string;
  url: string;
  domain: string;
  snippet?: string;
  created_at: number;
  sender: SharedSender;
}

export interface SharedFileItem {
  id: string;
  message_id: string;
  url: string;
  file_name?: string;
  allow_save?: boolean;
  created_at: number;
  sender: SharedSender;
}

export interface SharedAudioItem {
  id: string;
  message_id: string;
  url: string;
  file_name?: string;
  created_at: number;
  sender: SharedSender;
}

export interface SharedData {
  media: SharedMediaItem[];
  links: SharedLinkItem[];
  files: SharedFileItem[];
  audio: SharedAudioItem[];
  counts: {
    media: number;
    links: number;
    files: number;
    audio: number;
  };
}

interface ChatProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: {
    id: string;
    is_group: boolean;
    group_name: string | null;
    members: Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      is_verified?: boolean;
      nickname: string | null;
    }>;
  };
  currentUserId: string;
  token: string;
  messages?: any[];
  isOnline?: boolean;
  onStartCall?: () => void;
  onNavigate?: (tab: string, username?: string) => void;
  onOpenFullscreenVideo?: (url: string, allowSave: boolean) => void;
}

// Module-level in-memory cache to guarantee 0ms instant display on subsequent opens
const sharedDataCache = new Map<string, SharedData>();

// Fast pure function to synchronously extract shared assets from loaded messages
export function extractSharedFromMessages(rawMessages: any[]): SharedData {
  const media: SharedMediaItem[] = [];
  const links: SharedLinkItem[] = [];
  const files: SharedFileItem[] = [];
  const audio: SharedAudioItem[] = [];

  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`]+)/gi;

  for (let i = 0; i < rawMessages.length; i++) {
    const msg = rawMessages[i];
    if (!msg || !msg.body) continue;

    const sender: SharedSender = {
      id: msg.sender_id,
      username: msg.username || 'user',
      display_name: msg.display_name || null,
      avatar_url: msg.avatar_url || null,
      is_verified: !!msg.is_verified
    };

    let parsedMedia: any = null;
    let textToScan = msg.body;

    if (typeof msg.body === 'string' && msg.body.startsWith('{') && msg.body.endsWith('}')) {
      try {
        const parsed = JSON.parse(msg.body);
        if (parsed && parsed.type === 'secure_media') {
          parsedMedia = parsed;
        } else if (parsed && parsed.type === 'reply') {
          textToScan = parsed.text || '';
        }
      } catch {}
    }

    if (parsedMedia) {
      const item = {
        id: msg.id,
        message_id: msg.id,
        created_at: msg.created_at || Date.now(),
        sender,
        url: parsedMedia.url,
        media_type: parsedMedia.media_type,
        file_name: parsedMedia.file_name,
        allow_save: parsedMedia.allow_save !== false
      };

      if (parsedMedia.media_type === 'image' || parsedMedia.media_type === 'video') {
        media.push(item);
      } else if (parsedMedia.media_type === 'voice') {
        audio.push(item);
      } else {
        files.push(item);
      }
    }

    if (textToScan && typeof textToScan === 'string') {
      const matches = textToScan.match(urlRegex);
      if (matches && matches.length > 0) {
        const uniqueUrls = Array.from(new Set(matches));
        for (let j = 0; j < uniqueUrls.length; j++) {
          const linkUrl = uniqueUrls[j];
          let domain = '';
          try {
            domain = new URL(linkUrl).hostname.replace(/^www\./, '');
          } catch {
            domain = linkUrl;
          }
          links.push({
            id: `${msg.id}-${j}`,
            message_id: msg.id,
            url: linkUrl,
            domain,
            snippet: textToScan,
            created_at: msg.created_at || Date.now(),
            sender
          });
        }
      }
    }
  }

  // Sort newest first
  media.sort((a, b) => b.created_at - a.created_at);
  links.sort((a, b) => b.created_at - a.created_at);
  files.sort((a, b) => b.created_at - a.created_at);
  audio.sort((a, b) => b.created_at - a.created_at);

  return {
    media,
    links,
    files,
    audio,
    counts: {
      media: media.length,
      links: links.length,
      files: files.length,
      audio: audio.length
    }
  };
}

// Ultra-lightweight inline audio player (preload="none" to prevent network/main-thread lock)
const InlineAudioPlayer: React.FC<{ url: string; fileName?: string }> = React.memo(({ url, fileName }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 bg-[var(--input)]/80 hover:bg-[var(--input)] border border-[var(--line)] p-2.5 rounded-xl w-full transition-colors">
      <audio
        ref={audioRef}
        src={`/api/media/file/${url}`}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const aud = e.currentTarget;
          if (aud.duration) {
            setProgress((aud.currentTime / aud.duration) * 100);
          }
        }}
        preload="none"
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-2)] text-white flex items-center justify-center flex-shrink-0 shadow-sm active:scale-95 transition-all"
        title={isPlaying ? 'Pause' : 'Play audio'}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="font-medium text-[var(--text)] truncate">{fileName || 'Voice Note'}</span>
          <span className="text-[10px] text-[var(--muted)] font-mono flex-shrink-0 ml-2">
            {formatTime(audioRef.current?.currentTime || 0)} / {formatTime(duration)}
          </span>
        </div>
        <div 
          className="h-1.5 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = clickPos * duration;
          }}
        >
          <div className="h-full bg-[var(--accent-2)] transition-all duration-100 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
});

const ChatProfileModalComponent: React.FC<ChatProfileModalProps> = ({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  token,
  messages,
  isOnline = false,
  onStartCall,
  onNavigate,
  onOpenFullscreenVideo
}) => {
  const [activeTab, setActiveTab] = useState<'media' | 'links' | 'files' | 'audio'>('media');

  // Synchronous cache / message hydration: zero blank screen, zero waiting
  const [sharedData, setSharedData] = useState<SharedData>(() => {
    if (sharedDataCache.has(conversation.id)) {
      return sharedDataCache.get(conversation.id)!;
    }
    if (messages && messages.length > 0) {
      const extracted = extractSharedFromMessages(messages);
      sharedDataCache.set(conversation.id, extracted);
      return extracted;
    }
    return {
      media: [],
      links: [],
      files: [],
      audio: [],
      counts: { media: 0, links: 0, files: 0, audio: 0 }
    };
  });

  // Only show spinner on very first open if we have absolutely 0 cached or local data
  const [loading, setLoading] = useState<boolean>(() => {
    if (sharedDataCache.has(conversation.id)) return false;
    if (messages && messages.length > 0) return false;
    return true;
  });

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Stable memoized partner
  const partner = useMemo(() => {
    if (conversation.is_group) return null;
    return conversation.members.find(m => m.id !== currentUserId) || conversation.members[0];
  }, [conversation.is_group, conversation.members, currentUserId]);

  const avatarUrl = useMemo(() => {
    return partner?.avatar_url ? `/api/media/file/${partner.avatar_url}` : null;
  }, [partner?.avatar_url]);

  const initials = useMemo(() => {
    return partner?.username ? partner.username.substring(0, 2).toUpperCase() : 'DV';
  }, [partner?.username]);

  // Background SWR revalidation
  useEffect(() => {
    if (!isOpen || !conversation.id) return;

    let isMounted = true;

    // Check if we already have local data
    const hasExistingData = sharedDataCache.has(conversation.id) || (messages && messages.length > 0);
    if (!hasExistingData) {
      setLoading(true);
    }

    fetch(`/api/conversations/${conversation.id}/shared`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data && !data.error) {
          const formatted: SharedData = {
            media: data.media || [],
            links: data.links || [],
            files: data.files || [],
            audio: data.audio || [],
            counts: data.counts || {
              media: data.media?.length || 0,
              links: data.links?.length || 0,
              files: data.files?.length || 0,
              audio: data.audio?.length || 0
            }
          };
          sharedDataCache.set(conversation.id, formatted);
          setSharedData(formatted);
        }
      })
      .catch(err => {
        console.error('Failed to load shared content:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, conversation.id, token, messages]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  }, []);

  const formatDate = useCallback((timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const getFileExtensionColor = useCallback((fileName?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'zip':
      case 'rar':
      case '7z': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'doc':
      case 'docx': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'xls':
      case 'xlsx':
      case 'csv': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'ppt':
      case 'pptx': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      default: return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    }
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Chat details and shared media"
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      >
        <div 
          className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-xl bg-[var(--card)] border-0 sm:border border-[var(--line)] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[var(--text)] animate-scale-up"
        >
          {/* Top Bar / Close button */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line)] bg-[var(--card)]/90 backdrop-blur-md sticky top-0 z-20">
            <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              {conversation.is_group ? 'Group Details' : 'Contact Info'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--input)] hover:bg-[var(--hover)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors active:scale-95"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Profile Overview Header Card */}
            <div className="flex flex-col items-center px-6 pt-6 pb-5 text-center border-b border-[var(--line)] bg-gradient-to-b from-[var(--input)]/40 to-transparent">
              
              {/* Avatar without dark hover dimming or layout shifts */}
              <div 
                className="relative mb-3 cursor-pointer select-none"
                onClick={() => {
                  if (avatarUrl) setFullscreenImage(avatarUrl);
                }}
                title={avatarUrl ? "View profile photo" : undefined}
              >
                <div className="w-20 h-20 rounded-full bg-[var(--input)] border-2 border-[var(--line)] hover:border-[var(--accent-2)] ring-0 hover:ring-2 hover:ring-[var(--accent-2)]/30 overflow-hidden shadow-lg flex items-center justify-center text-xl font-bold text-[var(--accent-2)] transition-[border-color,box-shadow] duration-200">
                  {conversation.is_group ? (
                    <Users className="w-9 h-9 text-[var(--accent-2)]" />
                  ) : avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={partner?.display_name || partner?.username || 'User avatar'} 
                      width={80}
                      height={80}
                      loading="eager"
                      decoding="async"
                      draggable={false}
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    initials
                  )}
                </div>

                {/* Corner zoom badge (clean and non-dimming) */}
                {avatarUrl && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[var(--card)] border border-[var(--line)] shadow-md flex items-center justify-center text-[var(--muted)] hover:text-[var(--accent-2)] transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Online Indicator */}
                {!conversation.is_group && isOnline && (
                  <span 
                    className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--card)] shadow" 
                    title="Active now" 
                  />
                )}
              </div>

              {/* Name & Username */}
              <h4 className="text-lg font-bold text-[var(--text)] flex items-center justify-center gap-1.5 max-w-full">
                <span className="truncate">
                  {conversation.is_group 
                    ? (conversation.group_name || 'Group Chat') 
                    : (partner?.display_name || partner?.username)}
                </span>
                {!conversation.is_group && partner?.is_verified && <VerifiedBadge />}
              </h4>

              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted)]">
                {conversation.is_group ? (
                  <span>{conversation.members.length} members</span>
                ) : (
                  <>
                    <span>@{partner?.username}</span>
                    <span>•</span>
                    {isOnline ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active now
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-[var(--accent-2)]" />
                        Encrypted
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 mt-4 w-full max-w-xs">
                {!conversation.is_group && onStartCall && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartCall();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </button>
                )}

                {!conversation.is_group && partner && onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('profile', partner.username);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-[var(--input)] hover:bg-[var(--hover)] border border-[var(--line)] text-[var(--text)] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[var(--accent-2)]" />
                    <span>View Profile</span>
                  </button>
                )}

                {!conversation.is_group && partner && (
                  <button
                    type="button"
                    onClick={() => handleCopy(`https://dataverse-datalex.pages.dev/profile/${partner.username}`, 'profile-link')}
                    className="py-2 px-3 rounded-xl bg-[var(--input)] hover:bg-[var(--hover)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                    title="Copy profile link"
                  >
                    {copiedLink === 'profile-link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Separate Headings / Content Tabs */}
            <div className="p-4 sm:p-5">
              <div 
                role="tablist"
                aria-label="Shared content categories"
                className="flex items-center gap-1.5 p-1 bg-[var(--input)]/80 rounded-2xl border border-[var(--line)] mb-4"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'media'}
                  onClick={() => setActiveTab('media')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'media'
                      ? 'bg-[var(--card)] text-[var(--accent-2)] shadow border border-[var(--line)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Media</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'media' ? 'bg-[var(--accent-2)]/15 text-[var(--accent-2)]' : 'bg-black/10 dark:bg-white/10 text-[var(--muted)]'
                  }`}>
                    {sharedData.counts.media}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'links'}
                  onClick={() => setActiveTab('links')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'links'
                      ? 'bg-[var(--card)] text-[var(--accent-2)] shadow border border-[var(--line)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Links</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'links' ? 'bg-[var(--accent-2)]/15 text-[var(--accent-2)]' : 'bg-black/10 dark:bg-white/10 text-[var(--muted)]'
                  }`}>
                    {sharedData.counts.links}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'files'}
                  onClick={() => setActiveTab('files')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'files'
                      ? 'bg-[var(--card)] text-[var(--accent-2)] shadow border border-[var(--line)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <FolderIcon className="w-3.5 h-3.5" />
                  <span>Files</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'files' ? 'bg-[var(--accent-2)]/15 text-[var(--accent-2)]' : 'bg-black/10 dark:bg-white/10 text-[var(--muted)]'
                  }`}>
                    {sharedData.counts.files}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'audio'}
                  onClick={() => setActiveTab('audio')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'audio'
                      ? 'bg-[var(--card)] text-[var(--accent-2)] shadow border border-[var(--line)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Audio</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'audio' ? 'bg-[var(--accent-2)]/15 text-[var(--accent-2)]' : 'bg-black/10 dark:bg-white/10 text-[var(--muted)]'
                  }`}>
                    {sharedData.counts.audio}
                  </span>
                </button>
              </div>

              {/* Tab Content Display with GPU-accelerated transition */}
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center text-[var(--muted)] gap-2 animate-fade-in">
                  <Loader2 className="w-7 h-7 animate-spin text-[var(--accent-2)]" />
                  <span className="text-xs font-medium">Loading shared media...</span>
                </div>
              ) : (
                <div key={activeTab} className="animate-tab-slide will-change-transform min-h-[220px]">
                  {/* MEDIA TAB */}
                  {activeTab === 'media' && (
                    <div>
                      {sharedData.media.length === 0 ? (
                        <div className="py-12 text-center text-[var(--muted)] flex flex-col items-center justify-center animate-fade-in">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--input)] border border-[var(--line)] flex items-center justify-center mb-2.5 text-[var(--muted)]">
                            <ImageIcon className="w-6 h-6 opacity-60" />
                          </div>
                          <p className="text-xs font-semibold text-[var(--text)]">No media shared yet</p>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5">Photos and videos sent in this chat will appear here</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {sharedData.media.map((item) => {
                            const isVideo = item.media_type === 'video';
                            const mediaUrl = `/api/media/file/${item.url}`;

                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  if (isVideo) {
                                    if (onOpenFullscreenVideo) {
                                      onOpenFullscreenVideo(mediaUrl, !!item.allow_save);
                                    }
                                  } else {
                                    setFullscreenImage(mediaUrl);
                                  }
                                }}
                                className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--input)] border border-[var(--line)] cursor-pointer hover:border-[var(--accent-2)] transition-colors shadow-sm"
                              >
                                {isVideo ? (
                                  <div className="w-full h-full relative bg-black/60 flex items-center justify-center">
                                    <video 
                                      src={mediaUrl} 
                                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
                                      preload="none"
                                    />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                      <div className="w-8 h-8 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                      </div>
                                    </div>
                                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-bold text-white flex items-center gap-1">
                                      <Film className="w-2.5 h-2.5" />
                                      <span>Video</span>
                                    </div>
                                  </div>
                                ) : (
                                  <img 
                                    src={mediaUrl} 
                                    alt="Shared media" 
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                                  />
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-[9px] text-white/90">
                                  <span className="truncate max-w-[70%]">@{item.sender.username}</span>
                                  <span>{formatDate(item.created_at)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* LINKS TAB */}
                  {activeTab === 'links' && (
                    <div className="space-y-2">
                      {sharedData.links.length === 0 ? (
                        <div className="py-12 text-center text-[var(--muted)] flex flex-col items-center justify-center animate-fade-in">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--input)] border border-[var(--line)] flex items-center justify-center mb-2.5 text-[var(--muted)]">
                            <LinkIcon className="w-6 h-6 opacity-60" />
                          </div>
                          <p className="text-xs font-semibold text-[var(--text)]">No links shared yet</p>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5">URLs and web links sent in this chat will appear here</p>
                        </div>
                      ) : (
                        sharedData.links.map((link) => (
                          <div
                            key={link.id}
                            className="p-3 rounded-2xl bg-[var(--input)]/60 hover:bg-[var(--input)] border border-[var(--line)] hover:border-[var(--line-strong)] transition-colors flex items-start gap-3 group"
                          >
                            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent-2)] flex-shrink-0 mt-0.5">
                              <LinkIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-2)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">
                                  {link.domain}
                                </span>
                                <span className="text-[10px] text-[var(--muted)]">•</span>
                                <span className="text-[10px] text-[var(--muted)]">@{link.sender.username}</span>
                                <span className="text-[10px] text-[var(--muted)] ml-auto">{formatDate(link.created_at)}</span>
                              </div>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-[var(--text)] hover:text-[var(--accent-2)] hover:underline truncate block"
                                title={link.url}
                              >
                                {link.url}
                              </a>
                              {link.snippet && link.snippet !== link.url && (
                                <p className="text-[11px] text-[var(--muted)] line-clamp-1 mt-0.5">
                                  {link.snippet}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopy(link.url, link.id)}
                                className="p-1.5 rounded-lg bg-[var(--card)] hover:bg-[var(--hover)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                title="Copy link"
                              >
                                {copiedLink === link.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-[var(--card)] hover:bg-[var(--hover)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                title="Open link"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* FILES TAB */}
                  {activeTab === 'files' && (
                    <div className="space-y-2">
                      {sharedData.files.length === 0 ? (
                        <div className="py-12 text-center text-[var(--muted)] flex flex-col items-center justify-center animate-fade-in">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--input)] border border-[var(--line)] flex items-center justify-center mb-2.5 text-[var(--muted)]">
                            <FolderIcon className="w-6 h-6 opacity-60" />
                          </div>
                          <p className="text-xs font-semibold text-[var(--text)]">No files shared yet</p>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5">Documents, archives, and attachments will appear here</p>
                        </div>
                      ) : (
                        sharedData.files.map((file) => {
                          const extColorClass = getFileExtensionColor(file.file_name);
                          const downloadUrl = `/api/media/file/${file.url}`;

                          return (
                            <div
                              key={file.id}
                              className="p-3 rounded-2xl bg-[var(--input)]/60 hover:bg-[var(--input)] border border-[var(--line)] hover:border-[var(--line-strong)] transition-colors flex items-center gap-3"
                            >
                              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${extColorClass}`}>
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[var(--text)] truncate" title={file.file_name || 'Shared Document'}>
                                  {file.file_name || 'Shared Document'}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-[var(--muted)] mt-0.5">
                                  <span>@{file.sender.username}</span>
                                  <span>•</span>
                                  <span>{formatDate(file.created_at)}</span>
                                </div>
                              </div>
                              <a
                                href={downloadUrl}
                                download={file.file_name || 'download'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-2)] text-white text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-sm flex-shrink-0"
                                title="Download file"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Download</span>
                              </a>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* AUDIO TAB */}
                  {activeTab === 'audio' && (
                    <div className="space-y-2.5">
                      {sharedData.audio.length === 0 ? (
                        <div className="py-12 text-center text-[var(--muted)] flex flex-col items-center justify-center animate-fade-in">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--input)] border border-[var(--line)] flex items-center justify-center mb-2.5 text-[var(--muted)]">
                            <Mic className="w-6 h-6 opacity-60" />
                          </div>
                          <p className="text-xs font-semibold text-[var(--text)]">No voice messages shared yet</p>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5">Voice notes and audio clips sent in this chat will appear here</p>
                        </div>
                      ) : (
                        sharedData.audio.map((audioItem) => (
                          <div
                            key={audioItem.id}
                            className="p-3 rounded-2xl bg-[var(--input)]/60 border border-[var(--line)] transition-colors flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                              <span className="font-semibold text-[var(--text)]">@{audioItem.sender.username}</span>
                              <span>{formatDate(audioItem.created_at)}</span>
                            </div>
                            <InlineAudioPlayer url={audioItem.url} fileName={audioItem.file_name} />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {fullscreenImage && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 animate-fade-in select-none cursor-zoom-out"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
            <a
              href={fullscreenImage}
              download="image"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl transition-colors border border-white/10 active:scale-95 flex items-center justify-center"
              title="Download image"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={() => setFullscreenImage(null)}
              className="p-2.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl transition-colors border border-white/10 active:scale-95 flex items-center justify-center"
              title="Close image preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img 
            src={fullscreenImage} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export const ChatProfileModal = React.memo(ChatProfileModalComponent);
