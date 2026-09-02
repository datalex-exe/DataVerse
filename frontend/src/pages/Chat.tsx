import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { compressImage } from '../utils/compress';
import { 
  Search, 
  Send, 
  MessageSquare, 
  Plus, 
  Loader2, 
  ArrowLeft,
  Gamepad2,
  X,
  Mic,
  Image as ImageIcon,
  Play,
  Pause,
  Lock,
  Unlock,
  Volume2,
  Trash,
  Forward,
  Shield,
  Camera,
  CircleDot,
  Users,
  UserPlus,
  LogOut as LeaveIcon,
  Crown,
  Coins,
  Flame,
  Club,
  Target,
  Grid,
  RotateCw,
  CornerUpLeft,
  Maximize2,
  MoreVertical
} from 'lucide-react';

interface Member {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
  nickname: string | null;
}

interface LastMessage {
  body: string;
  created_at: number;
  sender_id: string;
}

interface Conversation {
  id: string;
  is_group: boolean;
  group_name: string | null;
  creator_id: string | null;
  created_at: number;
  last_message: LastMessage | null;
  members: Member[];
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
}

interface GameState {
  gameType?: 'tic-tac-toe' | 'chess' | 'rps' | 'higher-lower' | 'whack-a-mole' | 'coin-toss' | 'spin-wheel' | 'car-racing' | 'snake' | 'flappy-space' | 'memory-match' | 'brick-breaker';
  board?: (string | null)[];
  chessBoard?: (string | null)[];
  chessFen?: string;
  chessHistory?: string[];
  rpsPlayerMoves?: Record<string, 'rock' | 'paper' | 'scissors' | null>;
  wheelQuestion?: string;
  wheelOptions?: string[];
  wheelResultIndex?: number | null;
  hlCard?: { suit: string; value: number } | null;
  hlScore?: number;
  hlStreak?: number;
  moleScore?: Record<string, number>;
  status: 'idle' | 'playing' | 'won' | 'draw';
  playerX: string | null;
  playerO: string | null;
  turn: string | null;
  winner: string | null;
  memoryCards?: { id: number; symbol: string; isFlipped: boolean; isMatched: boolean }[];
  memorySelected?: number[];
  memoryScores?: Record<string, number>;
}

// Secure Audio Player Component
const AudioPlayer: React.FC<{ url: string; allowSave: boolean }> = ({ url, allowSave }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  return (
    <div 
      className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-white/[0.04] w-52 select-none"
      onContextMenu={(e) => !allowSave && e.preventDefault()}
    >
      <button 
        type="button"
        onClick={togglePlay} 
        className="w-8 h-8 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 transition-all duration-100" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block mt-1.5 flex items-center gap-1 select-none">
          <Volume2 className="w-3 h-3" />
          Voice Note
        </span>
      </div>

      <audio
        ref={audioRef}
        src={`/api/media/file/${url}`}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        onTimeUpdate={(e) => {
          const aud = e.currentTarget;
          setProgress((aud.currentTime / aud.duration) * 100 || 0);
        }}
        controlsList={allowSave ? "" : "nodownload"}
      />
    </div>
  );
};

interface ChatInputProps {
  onSend: (text: string) => void;
  openCamera: (mode: 'photo' | 'video') => void;
  uploadingMedia: boolean;
  handleSelectMedia: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startRecording: () => void;
  replyingToMessage: Message | null;
  onCancelReply: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  openCamera,
  uploadingMedia,
  handleSelectMedia,
  startRecording,
  replyingToMessage,
  onCancelReply
}) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || uploadingMedia) return;
    onSend(text.trim());
    setText('');
  };

  const getReplyBodyText = (msg: Message) => {
    try {
      const parsed = JSON.parse(msg.body);
      if (parsed.type === 'secure_media') {
        return `🔒 [Secure ${parsed.media_type || 'Media'}]`;
      }
      if (parsed.type === 'reply') {
        return parsed.text || '';
      }
      return msg.body;
    } catch {
      return msg.body;
    }
  };

  return (
    <div className="flex flex-col w-full gap-2">
      {/* Replying to Message Preview Box */}
      {replyingToMessage && (
        <div className="flex items-center justify-between bg-slate-900/50 border border-white/[0.04] rounded-xl px-3 py-2 text-xs animate-fade-in select-none">
          <div className="flex flex-col min-w-0 flex-1 border-l-2 border-brand-500 pl-2">
            <span className="text-[10px] font-black text-brand-400 font-extrabold">
              Replying to @{replyingToMessage.username}
            </span>
            <span className="text-slate-400 truncate text-[11px] mt-0.5">
              {getReplyBodyText(replyingToMessage)}
            </span>
          </div>
          <button 
            type="button" 
            onClick={onCancelReply} 
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-center w-full max-w-full overflow-hidden">
        {/* Camera capture button */}
        <button
          type="button"
          onClick={() => openCamera('photo')}
          className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
          title="Take photo or record video"
          disabled={uploadingMedia}
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* File selector icon trigger */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
          title="Send secure photo/video/file"
          disabled={uploadingMedia}
        >
          {uploadingMedia ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleSelectMedia}
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
        />

        {/* Microphone icon trigger */}
        <button
          type="button"
          onClick={startRecording}
          className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
          title="Record voice note"
          disabled={uploadingMedia}
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 min-w-0 w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-2.5 text-base md:text-xs text-slate-200 placeholder:text-slate-500 outline-none transition-all"
          disabled={uploadingMedia}
          autoComplete="off"
          autoCapitalize="sentences"
        />

        <button 
          type="submit"
          onMouseDown={(e) => e.preventDefault()}
          disabled={!text.trim() || uploadingMedia}
          className="p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all shadow-md shadow-brand-500/10 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

interface ChatProps {
  onToggleBottomNav?: (hide: boolean) => void;
  onNavigate?: (view: string, param?: string) => void;
  targetConvoId?: string;
}

export const Chat: React.FC<ChatProps> = ({ onToggleBottomNav, onNavigate, targetConvoId }) => {
  const { user, token } = useAuth();
  
  // Conversations list states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState<boolean>(true);
  
  // Active conversation states
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [activeFullscreenVideo, setActiveFullscreenVideo] = useState<{ url: string; allowSave: boolean } | null>(null);
  const modalOpenTimeRef = useRef<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);



  // Secure Media State
  const [revealedMessages, setRevealedMessages] = useState<Record<string, boolean>>({});
  const [uploadingMedia, setUploadingMedia] = useState<boolean>(false);

  // Camera modal state
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [cameraRecording, setCameraRecording] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraChunksRef = useRef<Blob[]>([]);
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  // Audio Recording States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Game Session States
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showGameBoard, setShowGameBoard] = useState<boolean>(true);

  // User search DM states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);

  // Create Group Modal states
  const [showCreateGroup, setShowCreateGroup] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [groupMemberSearch, setGroupMemberSearch] = useState<string>('');
  const [groupMemberResults, setGroupMemberResults] = useState<any[]>([]);
  const [groupSelectedMembers, setGroupSelectedMembers] = useState<any[]>([]);
  const [groupSearching, setGroupSearching] = useState<boolean>(false);
  const [creatingGroup, setCreatingGroup] = useState<boolean>(false);

  // Group Members list & Nickname states
  const [showMembersModal, setShowMembersModal] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newNickname, setNewNickname] = useState<string>('');

  // Forwarding states
  const [forwardingMessageBody, setForwardingMessageBody] = useState<string | null>(null);
  const [showForwardModal, setShowForwardModal] = useState<boolean>(false);

  // Replying state
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);

  // Game Selector states
  const [showGameSelectorModal, setShowGameSelectorModal] = useState<boolean>(false);

  // Three-dot header menu
  const [showHeaderMenu, setShowHeaderMenu] = useState<boolean>(false);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);

  // Chess Game State
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);

  // Higher/Lower (Local Card Game) State
  const [hlCard, setHlCard] = useState<{ suit: string; value: number; label: string } | null>(null);
  const [hlScore, setHlScore] = useState<number>(0);
  const [hlStreak, setHlStreak] = useState<number>(0);
  const [hlGameOver, setHlGameOver] = useState<boolean>(false);
  const [hlCardHistory, setHlCardHistory] = useState<any[]>([]);

  // Whack-a-Mole (Local Reaction Game) State
  const [moleActiveIndex, setMoleActiveIndex] = useState<number | null>(null);
  const [moleScore, setMoleScore] = useState<number>(0);
  const [moleTimeLeft, setMoleTimeLeft] = useState<number>(0);
  const [moleIsPlaying, setMoleIsPlaying] = useState<boolean>(false);
  const moleTimerRef = useRef<number | null>(null);
  const moleSpawnTimerRef = useRef<number | null>(null);

  // Coin Toss States
  const [coinFlipping, setCoinFlipping] = useState<boolean>(false);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);

  // Spin the Wheel States
  const [wheelQuestion, setWheelQuestion] = useState<string>('Who pays for dinner?');
  const [wheelOptions, setWheelOptions] = useState<string[]>(['Me', 'You', 'Split Bill', 'Double or Nothing']);
  const [wheelRotationDegrees, setWheelRotationDegrees] = useState<number>(0);
  const [wheelIsSpinning, setWheelIsSpinning] = useState<boolean>(false);
  const [wheelWinner, setWheelWinner] = useState<string | null>(null);
  const [newWheelOption, setNewWheelOption] = useState<string>('');

  // Car Racing (Local Canvas Game) State
  const carCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const carGameLoopRef = useRef<number | null>(null);
  const [carRaceStarted, setCarRaceStarted] = useState<boolean>(false);
  const [carScore, setCarScore] = useState<number>(0);
  const [carGameOver, setCarGameOver] = useState<boolean>(false);
  const carStateRef = useRef<{
    playerX: number;
    playerY: number;
    targetX: number;
    speed: number;
    score: number;
    obstacles: { x: number; y: number; w: number; h: number; color: string }[];
    roadOffset: number;
    gameOver: boolean;
    keys: { left: boolean; right: boolean };
  }>({
    playerX: 110,
    playerY: 380,
    targetX: 110,
    speed: 3,
    score: 0,
    obstacles: [],
    roadOffset: 0,
    gameOver: false,
    keys: { left: false, right: false },
  });

  // Snake Game State
  const snakeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const snakeGameLoopRef = useRef<number | null>(null);
  const [snakeRaceStarted, setSnakeRaceStarted] = useState<boolean>(false);
  const [snakeScore, setSnakeScore] = useState<number>(0);
  const [snakeGameOver, setSnakeGameOver] = useState<boolean>(false);
  const snakeStateRef = useRef<{
    snake: { x: number; y: number }[];
    dir: { x: number; y: number };
    food: { x: number; y: number };
    score: number;
    gameOver: boolean;
  }>({
    snake: [{ x: 10, y: 10 }],
    dir: { x: 1, y: 0 },
    food: { x: 5, y: 5 },
    score: 0,
    gameOver: false
  });

  // Flappy Space Game State
  const flappyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const flappyGameLoopRef = useRef<number | null>(null);
  const [flappyStarted, setFlappyStarted] = useState<boolean>(false);
  const [flappyScore, setFlappyScore] = useState<number>(0);
  const [flappyGameOver, setFlappyGameOver] = useState<boolean>(false);
  const flappyStateRef = useRef<{
    birdY: number;
    velocity: number;
    obstacles: { x: number; top: number; bottom: number; passed: boolean }[];
    score: number;
    gameOver: boolean;
  }>({
    birdY: 200,
    velocity: 0,
    obstacles: [],
    score: 0,
    gameOver: false
  });

  // Brick Breaker Game State
  const brickCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const brickGameLoopRef = useRef<number | null>(null);
  const [brickStarted, setBrickStarted] = useState<boolean>(false);
  const [brickScore, setBrickScore] = useState<number>(0);
  const [brickGameOver, setBrickGameOver] = useState<boolean>(false);
  const brickStateRef = useRef<{
    paddleX: number;
    ballX: number;
    ballY: number;
    ballDX: number;
    ballDY: number;
    bricks: { x: number; y: number; w: number; h: number; active: boolean; color: string }[];
    score: number;
    gameOver: boolean;
    keys: { left: boolean; right: boolean };
  }>({
    paddleX: 135,
    ballX: 160,
    ballY: 350,
    ballDX: 2,
    ballDY: -2,
    bricks: [],
    score: 0,
    gameOver: false,
    keys: { left: false, right: false }
  });

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingForwardRef = useRef<string | null>(null);

  // Close three-dot header menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setShowHeaderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle mobile bottom navigation bar
  useEffect(() => {
    if (onToggleBottomNav) onToggleBottomNav(!!activeConvo);
    return () => { if (onToggleBottomNav) onToggleBottomNav(false); };
  }, [activeConvo, onToggleBottomNav]);

  // PrintScreen / Blur screenshot protection
  useEffect(() => {
    const isAdmin = user?.is_admin || user?.is_top_admin;
    if (isAdmin) return;
    const handleBlur = () => { setRevealedMessages({}); };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.key === 'p' && (e.ctrlKey || e.metaKey))) setRevealedMessages({});
    };
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('blur', handleBlur); window.removeEventListener('keydown', handleKeyDown); };
  }, [user]);

  // Memory Game Sync Initializer
  useEffect(() => {
    if (gameState && gameState.gameType === 'memory-match' && !gameState.memoryCards && user && user.id === gameState.playerX) {
      const symbols = ['🦄','🐱','🦊','🐶','🐷','🐸','🐵','🦁','🦄','🐱','🦊','🐶','🐷','🐸','🐵','🦁'];
      const shuffled = symbols.map((s, idx) => ({ id: idx, symbol: s, isFlipped: false, isMatched: false })).sort(() => Math.random() - 0.5);
      const updated = { ...gameState, memoryCards: shuffled, memorySelected: [], memoryScores: { [gameState.playerX]: 0, [gameState.playerO || '']: 0 }, turn: gameState.playerX };
      setGameState(updated);
      sendGameUpdate(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, user]);

  // Fetch conversations
  const fetchConversations = async (showLoading = false) => {
    if (!token) return;
    if (showLoading) setLoadingConvos(true);
    try {
      const res = await fetch('/api/conversations', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const convos = data.conversations || [];
        setConversations(convos);
        const unreadCount = convos.filter((c: any) => c.unread_count && c.unread_count > 0).length;
        window.dispatchEvent(new CustomEvent('unread-chats-update-value', { detail: unreadCount }));
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      if (showLoading) setLoadingConvos(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchConversations(true);
    const interval = setInterval(() => fetchConversations(false), 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Synchronize activeConvo with targetConvoId prop
  useEffect(() => {
    if (!token || loadingConvos) return;
    
    if (targetConvoId) {
      const found = conversations.find(c => c.id === targetConvoId);
      if (found) {
        // Always update activeConvo with fresh data from conversations list
        if (!activeConvo || activeConvo.id !== found.id) {
          setActiveConvo(found);
        } else {
          // Update members/metadata even if already active
          setActiveConvo(prev => prev ? { ...prev, ...found } : found);
        }
      } else if (targetConvoId.startsWith('room_')) {
        const roomName = targetConvoId.replace('room_', '').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!activeConvo || activeConvo.id !== targetConvoId) {
          setActiveConvo({
            id: targetConvoId,
            is_group: true,
            group_name: roomName,
            creator_id: null,
            created_at: Date.now(),
            last_message: null,
            members: []
          });
        }
      } else {
        // Conversation not found in list — try fetching once, but DON'T clear activeConvo
        // if it already matches the targetConvoId (race condition on page load)
        if (!fetchedIdsRef.current.has(targetConvoId)) {
          fetchedIdsRef.current.add(targetConvoId);
          fetchConversations(false);
        }
        // NOTE: We intentionally do NOT call setActiveConvo(null) here anymore.
        // The activeConvo is only cleared when the user explicitly navigates away
        // (targetConvoId becomes null/undefined) or when the delete button is pressed.
      }
    } else {
      if (activeConvo !== null) setActiveConvo(null);
    }
  }, [targetConvoId, conversations, loadingConvos, token]);

  // Debounced search
  useEffect(() => {
    if (!token || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults((data.users || []).filter((u: any) => u.id !== user?.id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [searchQuery, token]);

  // Load message history & WebSocket
  useEffect(() => {
    if (!activeConvo || !token || !user) {
      setMessages([]);
      setGameState(null);
      return;
    }

    let reconnectTimeout: number | null = null;
    let isCleanup = false;

    const connectWebSocket = () => {
      if (isCleanup) return;

      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/chat/ws/${activeConvo.id}?userId=${user.id}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Chat WebSocket connected:', activeConvo.id);
        ws.send(JSON.stringify({ type: 'get_game_state' }));

        if (pendingForwardRef.current) {
          const body = pendingForwardRef.current;
          pendingForwardRef.current = null;
          try {
            const parsed = JSON.parse(body);
            parsed.allow_save = true;
            parsed.allow_forward = true;
            ws.send(JSON.stringify({
              type: 'chat',
              body: JSON.stringify(parsed)
            }));
          } catch (err) {
            console.error('Failed to parse forwarded message:', err);
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'error') {
            alert(data.error);
            return;
          }

          if (data.type === 'game_state') {
            setGameState(data.game);
            return;
          }

          // Handle game invite in real-time
          if (data.type === 'game_invite') {
            setConversations(prevConvos => {
              return prevConvos.map(convo => {
                if (convo.id === data.conversationId) {
                  return {
                    ...convo,
                    last_message: {
                      body: `🎮 Game Invite: ${data.gameType}`,
                      created_at: Date.now(),
                      sender_id: data.senderId
                    }
                  };
                }
                return convo;
              });
            });
            return;
          }

          // Handle group kick in real-time
          if (data.type === 'group_kick') {
            if (activeConvo && activeConvo.id === data.conversationId) {
              if (data.kickedUserId === user.id) {
                alert('You have been kicked from this group.');
                onNavigate?.('messages');
              } else {
                setActiveConvo(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    members: prev.members.filter(m => m.id !== data.kickedUserId)
                  };
                });
              }
            }
            setConversations(prevConvos => {
              if (data.kickedUserId === user.id) {
                return prevConvos.filter(convo => convo.id !== data.conversationId);
              }
              return prevConvos.map(convo => {
                if (convo.id === data.conversationId) {
                  return {
                    ...convo,
                    members: convo.members.filter(m => m.id !== data.kickedUserId)
                  };
                }
                return convo;
              });
            });
            return;
          }

          // Handle chat deletion in real-time (only for the user who deleted it)
          if (data.type === 'chat_deleted') {
            if (data.deletedByUserId && data.deletedByUserId !== user?.id) {
              // Another participant's deletion - don't affect our sidebar at all
              return;
            }
            if (activeConvo && activeConvo.id === data.conversationId) {
              onNavigate?.('messages');
            }
            setConversations(prevConvos => prevConvos.filter(convo => convo.id !== data.conversationId));
            return;
          }

          // Handle nickname updates in real-time
          if (data.type === 'nickname_update') {
            setActiveConvo(prev => {
              if (!prev || prev.id !== data.conversationId) return prev;
              return {
                ...prev,
                members: prev.members.map(m => {
                  if (m.id === data.userId) {
                    return { ...m, nickname: data.nickname };
                  }
                  return m;
                })
              };
            });
            setConversations(prevConvos => {
              return prevConvos.map(convo => {
                if (convo.id === data.conversationId) {
                  return {
                    ...convo,
                    members: convo.members.map(m => {
                      if (m.id === data.userId) {
                        return { ...m, nickname: data.nickname };
                      }
                      return m;
                    })
                  };
                }
                return convo;
              });
            });
            return;
          }

          // Handle message unsend in real-time
          if (data.type === 'message_unsend') {
            setMessages(prev => prev.filter(m => m.id !== data.messageId));
            setConversations(prevConvos => {
              return prevConvos.map(convo => {
                if (convo.id === data.conversationId) {
                  if (convo.last_message) {
                    return {
                      ...convo,
                      last_message: {
                        ...convo.last_message,
                        body: 'Message was unsent'
                      }
                    };
                  }
                }
                return convo;
              });
            });
            return;
          }

          if (data.type === 'message' && activeConvo && data.message.conversation_id === activeConvo.id) {
            setMessages(prev => {
              // Already have the real message — skip
              if (prev.some(m => m.id === data.message.id)) return prev;
              // Swap out the optimistic placeholder sent by this user
              const optimisticIdx = prev.findIndex(
                m => m.id.startsWith('optimistic-') &&
                  m.sender_id === data.message.sender_id &&
                  m.body === data.message.body
              );
              if (optimisticIdx !== -1) {
                const next = [...prev];
                next[optimisticIdx] = data.message;
                return next;
              }
              return [...prev, data.message];
            });

            if (data.message.sender_id !== user?.id) {
              fetch(`/api/conversations/${activeConvo.id}/read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
              }).catch(err => console.error('Failed to mark incoming message as read:', err));
            }

            setConversations(prevConvos => {
              return prevConvos.map(convo => {
                if (convo.id === activeConvo.id) {
                  return {
                    ...convo,
                    last_message: {
                      body: data.message.body,
                      created_at: data.message.created_at,
                      sender_id: data.message.sender_id
                    }
                  };
                }
                return convo;
              }).sort((a, b) => {
                const aTime = a.last_message?.created_at || a.created_at;
                const bTime = b.last_message?.created_at || b.created_at;
                return bTime - aTime;
              });
            });
          }
        } catch (err) {
          console.error(err);
        }
      };

      ws.onclose = () => {
        console.log('Chat WebSocket closed:', activeConvo.id);
        if (!isCleanup) {
          reconnectTimeout = window.setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connectWebSocket();
          }, 3000);
        }
      };

      wsRef.current = ws;
    };

    const loadMessagesAndConnect = async () => {
      setLoadingMessages(true);
      setMessages([]);
      
      try {
        const res = await fetch(`/api/conversations/${activeConvo.id}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMessages(false);
      }

      connectWebSocket();
    };

    loadMessagesAndConnect();

    return () => {
      isCleanup = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [activeConvo?.id, token, user, onNavigate]);

  React.useLayoutEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Audio Recorder logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        // Release mic stream
        stream.getTracks().forEach(track => track.stop());

        // Upload and send voice note
        await uploadAndSendSecureMedia(audioBlob, 'voice', 'audio/webm');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      alert('Could not access microphone.');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Discard recorded chunks
      mediaRecorderRef.current.onstop = () => {
        // Just release mic stream
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Secure Media Upload & Send helper
  const uploadAndSendSecureMedia = async (blob: Blob, mediaType: 'voice' | 'image' | 'video' | 'file', contentType: string) => {
    if (!token || !user || !wsRef.current) return;
    setUploadingMedia(true);

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB request limit
    if (blob.size > MAX_FILE_SIZE) {
      alert(`File size (${(blob.size / 1024 / 1024).toFixed(1)}MB) exceeds the 100MB system limit. Please select or record a smaller file.`);
      setUploadingMedia(false);
      return;
    }

    try {
      // Strip codec params before building key: 'video/webm;codecs=vp9' -> 'webm'
      const baseContentType = contentType.split(';')[0].trim();
      const fileExt = (blob as File).name ? (blob as File).name.split('.').pop() : (baseContentType.split('/')[1] || 'bin');
      const r2Key = `secure/${user.id}-${Date.now()}.${fileExt}`;

      // 1. Upload to R2
      const uploadRes = await fetch(`/api/media/upload?key=${encodeURIComponent(r2Key)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': baseContentType
        },
        body: blob
      });

      if (!uploadRes.ok) {
        let errMsg = 'Secure media upload failed';
        try {
          const errData = await uploadRes.json();
          if (errData.error) {
            errMsg = `${errMsg}: ${errData.error}`;
          }
        } catch {}
        throw new Error(errMsg);
      }

      // 2. Format JSON secure message payload
      const secureMsgBody = JSON.stringify({
        type: 'secure_media',
        media_type: mediaType,
        url: r2Key,
        allow_save: true,
        allow_forward: true,
        file_name: (blob as File).name || `file.${fileExt}`
      });

      // 3. Send over WebSocket
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        body: secureMsgBody
      }));

    } catch (err: any) {
      alert(err.message || 'Failed to send secure media.');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Select photo / video / file from device
  const handleSelectMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let type: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';

      if (type === 'image') {
        try {
          const compressedBlob = await compressImage(file, 1080, 0.8);
          const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
          await uploadAndSendSecureMedia(compressedFile, 'image', 'image/jpeg');
        } catch (err) {
          console.error('Image compression failed, sending original:', err);
          await uploadAndSendSecureMedia(file, 'image', file.type);
        }
      } else {
        await uploadAndSendSecureMedia(file, type, file.type);
      }
    }
  };

  // Toggling permissions inside REST API
  const handleToggleAccess = async (messageId: string, currentAllowSave: boolean, currentAllowForward: boolean, changeType: 'save' | 'forward') => {
    if (!token) return;
    
    const newSave = changeType === 'save' ? !currentAllowSave : currentAllowSave;
    const newForward = changeType === 'forward' ? !currentAllowForward : currentAllowForward;

    try {
      const res = await fetch(`/api/conversations/messages/${messageId}/access`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          allow_save: newSave,
          allow_forward: newForward
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update media permissions');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // Unsend / Delete message API
  const handleUnsend = async (messageId: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to unsend this message?')) return;

    try {
      const res = await fetch(`/api/conversations/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to unsend message');
      }

      // Optimistically remove from state
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Unsend failed');
    }
  };

  const handleInitiateReply = (msg: Message) => {
    setReplyingToMessage(msg);
  };

  const parseReplyBody = (rawBody: string) => {
    if (rawBody.startsWith('{') && rawBody.endsWith('}')) {
      try {
        const obj = JSON.parse(rawBody);
        if (obj && obj.type === 'reply') {
          return obj;
        }
      } catch {}
    }
    return null;
  };

  const getReplyPreviewText = (body: string) => {
    try {
      const parsed = JSON.parse(body);
      if (parsed.type === 'secure_media') {
        return `🔒 [Secure ${parsed.media_type || 'Media'}]`;
      }
      if (parsed.type === 'reply') {
        return parsed.text || '';
      }
      return body;
    } catch {
      return body;
    }
  };

  const handleScrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-brand-500/10', 'transition-all', 'duration-500');
      setTimeout(() => {
        el.classList.remove('bg-brand-500/10');
      }, 1500);
    }
  };

  const handleSelectForwardTarget = (targetConvo: Conversation) => {
    if (!forwardingMessageBody) return;
    pendingForwardRef.current = forwardingMessageBody;
    onNavigate?.('messages', targetConvo.id);
    setShowForwardModal(false);
    setForwardingMessageBody(null);
  };

  // Start DM
  const handleStartDM = async (targetUser: any) => {
    if (!token) return;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_group: false,
          members: [targetUser.id]
        })
      });

      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        
        onNavigate?.('messages', data.conversationId);
        setIsSearchMode(false);
        setSearchQuery('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Group Chat Helpers ─────────────────────────────────────────────────

  // Debounced search for group member selector
  useEffect(() => {
    if (!token || !groupMemberSearch.trim()) {
      setGroupMemberResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setGroupSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(groupMemberSearch)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const filtered = (data.users || []).filter(
            (u: any) => u.id !== user?.id && !groupSelectedMembers.some(m => m.id === u.id)
          );
          setGroupMemberResults(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setGroupSearching(false);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [groupMemberSearch, token, groupSelectedMembers]);

  const handleCreateGroup = async () => {
    if (!token || !groupName.trim() || groupSelectedMembers.length === 0) return;
    setCreatingGroup(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          is_group: true,
          group_name: groupName.trim(),
          members: groupSelectedMembers.map(m => m.id)
        })
      });
      if (res.ok) {
        const data = await res.json();
        // Refresh conversations list
        await fetchConversations();
        // Open the new group directly
        onNavigate?.('messages', data.conversationId);
        // Reset modal state
        setShowCreateGroup(false);
        setGroupName('');
        setGroupMemberSearch('');
        setGroupSelectedMembers([]);
        setGroupMemberResults([]);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create group');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeConvo || !activeConvo.is_group || !token) return;
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      const res = await fetch(`/api/conversations/${activeConvo.id}/members/me`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onNavigate?.('messages');
        await fetchConversations();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to leave group');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async () => {
    if (!activeConvo || !token) return;
    const msg = activeConvo.is_group
      ? 'Are you sure you want to delete this group chat? This will remove all members and messages from the database forever.'
      : 'Are you sure you want to delete this chat? All messages will be permanently removed from the database.';
    
    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/conversations/${activeConvo.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        onNavigate?.('messages');
        await fetchConversations();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete chat');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting chat');
    }
  };

  const handleKickMember = async (targetUserId: string) => {
    if (!activeConvo || !activeConvo.is_group || !token) return;
    if (!confirm('Are you sure you want to kick this member from the group?')) return;
    try {
      const res = await fetch(`/api/conversations/${activeConvo.id}/members/${targetUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Optimistically remove the member from activeConvo state
        setActiveConvo(prev => {
          if (!prev) return null;
          return {
            ...prev,
            members: prev.members.filter(m => m.id !== targetUserId)
          };
        });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to kick member');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNickname = async (targetUserId: string, nicknameVal: string) => {
    if (!activeConvo || !token) return;
    try {
      const res = await fetch(`/api/conversations/${activeConvo.id}/members/${targetUserId}/nickname`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nickname: nicknameVal })
      });
      if (res.ok) {
        const data = await res.json();
        // Update state locally
        setActiveConvo(prev => {
          if (!prev) return null;
          return {
            ...prev,
            members: prev.members.map(m => {
              if (m.id === targetUserId) {
                return { ...m, nickname: data.nickname };
              }
              return m;
            })
          };
        });
        setEditingMemberId(null);
        setNewNickname('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update nickname');
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleSendMessage = (bodyText: string) => {
    if (!bodyText.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!user || !activeConvo) return;

    const now = Date.now();
    const optimisticId = `optimistic-${now}-${Math.random()}`;

    if (replyingToMessage) {
      const replyPayload = JSON.stringify({
        type: 'reply',
        reply_to: {
          id: replyingToMessage.id,
          body: replyingToMessage.body,
          sender_id: replyingToMessage.sender_id,
          username: replyingToMessage.username
        },
        text: bodyText.trim()
      });

      // Optimistically show message immediately
      const optimisticMsg: Message = {
        id: optimisticId,
        conversation_id: activeConvo.id,
        sender_id: user.id,
        body: replyPayload,
        created_at: now,
        username: user.username,
        display_name: user.display_name || null,
        avatar_url: user.avatar_url || null,
        is_verified: user.is_verified
      };
      setMessages(prev => [...prev, optimisticMsg]);

      wsRef.current.send(JSON.stringify({
        type: 'chat',
        body: replyPayload
      }));

      setReplyingToMessage(null);
    } else {
      // Optimistically show message immediately
      const optimisticMsg: Message = {
        id: optimisticId,
        conversation_id: activeConvo.id,
        sender_id: user.id,
        body: bodyText.trim(),
        created_at: now,
        username: user.username,
        display_name: user.display_name || null,
        avatar_url: user.avatar_url || null,
        is_verified: user.is_verified
      };
      setMessages(prev => [...prev, optimisticMsg]);

      wsRef.current.send(JSON.stringify({
        type: 'chat',
        body: bodyText.trim()
      }));
    }
  };

  // ─── Camera helpers ──────────────────────────────────────────────────────
  const openCamera = async (mode: 'photo' | 'video', facing?: 'user' | 'environment') => {
    setCameraMode(mode);
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setCameraRecording(false);
    setShowCameraModal(true);

    const targetFacing = facing || cameraFacing;
    if (facing) {
      setCameraFacing(facing);
    }

    // Release current camera hardware before starting a new one
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: targetFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === 'video'
      });
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access denied', err);
      // Close modal only if there's no camera running at all
      if (!cameraStream) {
        setShowCameraModal(false);
      }
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    openCamera(cameraMode, nextFacing);
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setCameraRecording(false);
    setShowCameraModal(false);
  };

  const takePhoto = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontal canvas drawing if front camera is active to match the live stream preview
    if (cameraFacing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      stopCameraStream();
      setCapturedBlob(blob);
      setCapturedPreviewUrl(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.92);
  };

  const startCameraRecording = () => {
    if (!cameraStream) return;
    cameraChunksRef.current = [];
    const recorder = new MediaRecorder(cameraStream, { mimeType: 'video/webm;codecs=vp9,opus' });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) cameraChunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(cameraChunksRef.current, { type: 'video/webm' });
      stopCameraStream();
      setCapturedBlob(blob);
      setCapturedPreviewUrl(URL.createObjectURL(blob));
      setCameraRecording(false);
    };
    cameraRecorderRef.current = recorder;
    recorder.start();
    setCameraRecording(true);
  };

  const stopCameraRecording = () => {
    cameraRecorderRef.current?.stop();
  };

  const sendCameraCapture = async () => {
    if (!capturedBlob) return;
    const mediaType: 'image' | 'video' = cameraMode === 'photo' ? 'image' : 'video';
    // Use base content-type only (strip codec params)
    const baseType = capturedBlob.type.split(';')[0].trim() || (cameraMode === 'photo' ? 'image/jpeg' : 'video/webm');
    closeCameraModal();
    await uploadAndSendSecureMedia(capturedBlob, mediaType, baseType);
  };

  // Attach stream to video element once ref is ready after modal opens
  const setCameraVideoRef = (el: HTMLVideoElement | null) => {
    (cameraVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    if (el && cameraStream) {
      el.srcObject = cameraStream;
      el.play();
    }
  };

  // Game interaction helpers
  const handleInviteGame = () => {
    setShowGameSelectorModal(true);
  };

  const handleStartSelectedGame = (gameType: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'game_invite', gameType }));
    setShowGameSelectorModal(false);
    setShowGameBoard(true);

    // Reset local card/mole states on game start
    if (gameType === 'higher-lower') {
      handleHlStart();
    } else if (gameType === 'whack-a-mole') {
      setMoleIsPlaying(false);
      setMoleScore(0);
    }
  };

  const handleMakeMove = (cellIndex: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'game_move', index: cellIndex }));
  };

  const handleResetGame = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'game_reset' }));
  };

  const handleCloseGame = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'game_close' }));
    setShowGameBoard(false);
  };

  const sendGameUpdate = (updatedGame: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'game_update', game: updatedGame }));
  };

  // Chess sandbox handlers
  const pieceUnicode: Record<string, string> = {
    'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
  };

  const isValidChessMove = (fromIdx: number, toIdx: number, piece: string, board: (string | null)[]): boolean => {
    if (fromIdx === toIdx) return false;
    
    const fromRow = Math.floor(fromIdx / 8);
    const fromCol = fromIdx % 8;
    const toRow = Math.floor(toIdx / 8);
    const toCol = toIdx % 8;
    
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    
    const targetPiece = board[toIdx];
    if (targetPiece) {
      const isPieceUpper = piece === piece.toUpperCase();
      const isTargetUpper = targetPiece === targetPiece.toUpperCase();
      if (isPieceUpper === isTargetUpper) {
        return false; // Can't capture own piece
      }
    }
    
    const pieceType = piece.toLowerCase();
    
    if (pieceType === 'p') {
      const direction = piece === 'P' ? -1 : 1;
      const startRow = piece === 'P' ? 6 : 1;
      
      // Moving 1 square forward
      if (colDiff === 0 && rowDiff === direction) {
        return targetPiece === null;
      }
      
      // Moving 2 squares forward from starting position
      if (colDiff === 0 && rowDiff === 2 * direction && fromRow === startRow) {
        const intermediateIdx = fromIdx + direction * 8;
        return targetPiece === null && board[intermediateIdx] === null;
      }
      
      // Capturing diagonally
      if (Math.abs(colDiff) === 1 && rowDiff === direction) {
        return targetPiece !== null;
      }
      
      return false;
    }
    
    if (pieceType === 'r') {
      if (rowDiff !== 0 && colDiff !== 0) return false;
      
      const rowStep = rowDiff === 0 ? 0 : (rowDiff > 0 ? 1 : -1);
      const colStep = colDiff === 0 ? 0 : (colDiff > 0 ? 1 : -1);
      
      let currRow = fromRow + rowStep;
      let currCol = fromCol + colStep;
      
      while (currRow !== toRow || currCol !== toCol) {
        const currIdx = currRow * 8 + currCol;
        if (board[currIdx] !== null) return false; // Path blocked
        currRow += rowStep;
        currCol += colStep;
      }
      
      return true;
    }
    
    if (pieceType === 'b') {
      if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
      
      const rowStep = rowDiff > 0 ? 1 : -1;
      const colStep = colDiff > 0 ? 1 : -1;
      
      let currRow = fromRow + rowStep;
      let currCol = fromCol + colStep;
      
      while (currRow !== toRow || currCol !== toCol) {
        const currIdx = currRow * 8 + currCol;
        if (board[currIdx] !== null) return false; // Path blocked
        currRow += rowStep;
        currCol += colStep;
      }
      
      return true;
    }
    
    if (pieceType === 'q') {
      const isRookMove = rowDiff === 0 || colDiff === 0;
      const isBishopMove = Math.abs(rowDiff) === Math.abs(colDiff);
      
      if (!isRookMove && !isBishopMove) return false;
      
      const rowStep = rowDiff === 0 ? 0 : (rowDiff > 0 ? 1 : -1);
      const colStep = colDiff === 0 ? 0 : (colDiff > 0 ? 1 : -1);
      
      let currRow = fromRow + rowStep;
      let currCol = fromCol + colStep;
      
      while (currRow !== toRow || currCol !== toCol) {
        const currIdx = currRow * 8 + currCol;
        if (board[currIdx] !== null) return false; // Path blocked
        currRow += rowStep;
        currCol += colStep;
      }
      
      return true;
    }
    
    if (pieceType === 'n') {
      const absR = Math.abs(rowDiff);
      const absC = Math.abs(colDiff);
      return (absR === 2 && absC === 1) || (absR === 1 && absC === 2);
    }
    
    if (pieceType === 'k') {
      return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;
    }
    
    return false;
  };

  const handleChessSquareClick = (squareIdx: number) => {
    if (!gameState) return;
    const isWhiteTurn = gameState.turn === gameState.playerX || !gameState.turn;
    const isMe = (isWhiteTurn && user?.id === gameState.playerX) ||
                 (!isWhiteTurn && user?.id === gameState.playerO) ||
                 (user?.id === gameState.playerX && !gameState.playerO);
    if (!isMe) return; // Not my turn

    const isMyPiece = (piece: string | null) => {
      if (!piece) return false;
      const isUpper = piece === piece.toUpperCase();
      return isWhiteTurn ? isUpper : !isUpper;
    };

    const clickedPiece = gameState.chessBoard?.[squareIdx] || null;

    if (selectedSquare === null) {
      if (isMyPiece(clickedPiece)) {
        setSelectedSquare(squareIdx);
      }
    } else {
      if (selectedSquare === squareIdx) {
        setSelectedSquare(null);
        return;
      }
      if (isMyPiece(clickedPiece)) {
        setSelectedSquare(squareIdx);
        return;
      }

      // Move execution
      const nextBoard = [...(gameState.chessBoard || Array(64).fill(null))];
      const movingPiece = nextBoard[selectedSquare];
      
      if (!movingPiece || !isValidChessMove(selectedSquare, squareIdx, movingPiece, nextBoard)) {
        if (isMyPiece(clickedPiece)) {
          setSelectedSquare(squareIdx);
        } else {
          setSelectedSquare(null);
        }
        return;
      }
      
      let status = gameState.status;
      let winner = gameState.winner;
      const targetPiece = nextBoard[squareIdx];
      
      // Sandbox rules - capture King to win!
      let turn = gameState.turn;
      if (targetPiece && targetPiece.toLowerCase() === 'k') {
        status = 'won';
        winner = user?.id || null;
        turn = null;
      } else {
        turn = isWhiteTurn ? gameState.playerO : gameState.playerX;
      }

      nextBoard[selectedSquare] = null;
      nextBoard[squareIdx] = movingPiece;

      const updatedGame = {
        ...gameState,
        chessBoard: nextBoard,
        status,
        winner,
        turn
      };

      sendGameUpdate(updatedGame);
      setSelectedSquare(null);
    }
  };

  // Rock Paper Scissors handlers
  const handleRpsChoice = (choice: 'rock' | 'paper' | 'scissors') => {
    if (!gameState || !user) return;
    const moves = { ...(gameState.rpsPlayerMoves || {}) };
    moves[user.id] = choice;

    const opponentId = user.id === gameState.playerX ? gameState.playerO : gameState.playerX;
    const hasOpponentMoved = opponentId ? !!moves[opponentId] : false;

    let status = gameState.status;
    let winner = gameState.winner;
    let turn = gameState.turn;

    if (opponentId && hasOpponentMoved) {
      const move1 = moves[gameState.playerX || ''];
      const move2 = moves[gameState.playerO || ''];
      
      if (move1 === move2) {
        status = 'draw';
      } else if (
        (move1 === 'rock' && move2 === 'scissors') ||
        (move1 === 'paper' && move2 === 'rock') ||
        (move1 === 'scissors' && move2 === 'paper')
      ) {
        status = 'won';
        winner = gameState.playerX;
      } else {
        status = 'won';
        winner = gameState.playerO;
      }
      turn = null;
    } else {
      turn = opponentId;
    }

    const updatedGame = {
      ...gameState,
      rpsPlayerMoves: moves,
      status,
      winner,
      turn
    };
    sendGameUpdate(updatedGame);
  };

  // Higher/Lower card handlers (Local Singleplayer)
  const CARD_SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];
  const CARD_SUITS_NAME = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];

  const drawRandomCard = () => {
    const value = Math.floor(Math.random() * 13) + 1;
    const suitIdx = Math.floor(Math.random() * 4);
    const suit = CARD_SUITS[suitIdx];
    const suitName = CARD_SUITS_NAME[suitIdx];
    
    let label = String(value);
    if (value === 1) label = 'Ace';
    else if (value === 11) label = 'Jack';
    else if (value === 12) label = 'Queen';
    else if (value === 13) label = 'King';

    return { suit, value, label: `${label} of ${suitName}` };
  };

  const handleHlStart = () => {
    const card = drawRandomCard();
    setHlCard(card);
    setHlScore(0);
    setHlStreak(0);
    setHlGameOver(false);
    setHlCardHistory([card]);
  };

  const handleHlGuess = (guess: 'higher' | 'lower') => {
    if (!hlCard || hlGameOver) return;
    const nextCard = drawRandomCard();
    const isHigher = nextCard.value > hlCard.value;
    const isLower = nextCard.value < hlCard.value;
    const isDraw = nextCard.value === hlCard.value;

    let correct = false;
    if (isDraw) {
      correct = true; // Tie goes to player
    } else if (guess === 'higher') {
      correct = isHigher;
    } else if (guess === 'lower') {
      correct = isLower;
    }

    const nextHistory = [...hlCardHistory, nextCard];
    setHlCardHistory(nextHistory);

    if (correct) {
      setHlScore(prev => prev + 1);
      setHlStreak(prev => prev + 1);
      setHlCard(nextCard);
    } else {
      setHlGameOver(true);
    }
  };

  // Whack-a-Mole handlers (Local Singleplayer)
  const startWhackAMole = () => {
    if (moleTimerRef.current) clearInterval(moleTimerRef.current);
    if (moleSpawnTimerRef.current) clearInterval(moleSpawnTimerRef.current);

    setMoleScore(0);
    setMoleTimeLeft(30);
    setMoleIsPlaying(true);
    setMoleActiveIndex(null);

    moleTimerRef.current = window.setInterval(() => {
      setMoleTimeLeft(prev => {
        if (prev <= 1) {
          if (moleTimerRef.current) clearInterval(moleTimerRef.current);
          if (moleSpawnTimerRef.current) clearInterval(moleSpawnTimerRef.current);
          setMoleIsPlaying(false);
          setMoleActiveIndex(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const spawnMole = () => {
      const idx = Math.floor(Math.random() * 9);
      setMoleActiveIndex(idx);
    };

    spawnMole();
    moleSpawnTimerRef.current = window.setInterval(spawnMole, 850);
  };

  const handleWhackMole = (idx: number) => {
    if (!moleIsPlaying || moleActiveIndex !== idx) return;
    setMoleScore(prev => prev + 1);
    setMoleActiveIndex(null);
  };

  // Clean up mole timers on unmount
  useEffect(() => {
    return () => {
      if (moleTimerRef.current) clearInterval(moleTimerRef.current);
      if (moleSpawnTimerRef.current) clearInterval(moleSpawnTimerRef.current);
    };
  }, []);

  // ─── Car Racing Game ─────────────────────────────────────────────────────
  const startCarRace = () => {
    const s = carStateRef.current;
    s.playerX = 110;
    s.targetX = 110;
    s.playerY = 340;
    s.speed = 3;
    s.score = 0;
    s.obstacles = [];
    s.roadOffset = 0;
    s.gameOver = false;
    s.keys = { left: false, right: false };
    setCarScore(0);
    setCarGameOver(false);
    setCarRaceStarted(true);
  };

  const stopCarRace = () => {
    if (carGameLoopRef.current) cancelAnimationFrame(carGameLoopRef.current);
    carGameLoopRef.current = null;
  };

  useEffect(() => {
    if (!carRaceStarted || carGameOver) return;

    const canvas = carCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ROAD_LEFT = 60;
    const ROAD_RIGHT = 260;
    const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
    const CAR_W = 32;
    const CAR_H = 56;
    let lastObstacleTime = 0;
    let frameCount = 0;

    const OBSTACLE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

    const drawRoad = () => {
      const s = carStateRef.current;
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 160);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Road
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(ROAD_LEFT, 0, ROAD_W, canvas.height);

      // Road edge lines
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ROAD_LEFT, 0); ctx.lineTo(ROAD_LEFT, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ROAD_RIGHT, 0); ctx.lineTo(ROAD_RIGHT, canvas.height); ctx.stroke();

      // Dashed center line
      ctx.setLineDash([20, 15]);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.lineDashOffset = -(s.roadOffset % 35);
      ctx.beginPath(); ctx.moveTo((ROAD_LEFT + ROAD_RIGHT) / 2, 0); ctx.lineTo((ROAD_LEFT + ROAD_RIGHT) / 2, canvas.height); ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    };

    const drawCar = (x: number, y: number, color: string, isPlayer: boolean) => {
      const w = isPlayer ? CAR_W : 30;
      const h = isPlayer ? CAR_H : 48;

      // Car body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
      ctx.fill();

      // Windshield
      ctx.fillStyle = 'rgba(148,216,255,0.5)';
      ctx.beginPath();
      ctx.roundRect(x - w / 2 + 4, y - h / 2 + 6, w - 8, h * 0.3, 4);
      ctx.fill();

      // Wheels
      ctx.fillStyle = '#0f172a';
      [-1, 1].forEach(side => {
        ctx.fillRect(x + side * (w / 2) - (side === -1 ? 6 : 0), y - h / 2 + 4, 6, 12);
        ctx.fillRect(x + side * (w / 2) - (side === -1 ? 6 : 0), y + h / 2 - 16, 6, 12);
      });

      if (isPlayer) {
        // Headlights
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.arc(x - 8, y - h / 2 + 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 8, y - h / 2 + 3, 3, 0, Math.PI * 2); ctx.fill();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') carStateRef.current.targetX = 110;
      if (e.key === 'ArrowRight') carStateRef.current.targetX = 210;
    };

    window.addEventListener('keydown', handleKeyDown);

    const loop = (timestamp: number) => {
      const s = carStateRef.current;
      if (s.gameOver) return;

      frameCount++;
      s.speed = 3 + s.score * 0.003;
      s.roadOffset += s.speed;

      // Player movement (lane switching with smooth interpolation)
      s.playerX += (s.targetX - s.playerX) * 0.22;

      // Spawn obstacles
      const obstacleCooldown = Math.max(800, 2000 - s.score * 0.5);
      if (timestamp - lastObstacleTime > obstacleCooldown) {
        const laneW = ROAD_W / 2;
        const lane = Math.random() < 0.5 ? 0 : 1;
        const obX = ROAD_LEFT + lane * laneW + laneW / 2;
        s.obstacles.push({
          x: obX, y: -40, w: 30, h: 48,
          color: OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)]
        });
        lastObstacleTime = timestamp;
      }

      // Move & cull obstacles
      s.obstacles = s.obstacles
        .map(o => ({ ...o, y: o.y + s.speed }))
        .filter(o => o.y < canvas.height + 60);

      // Increment score
      s.score++;

      // Collision detection
      const px = s.playerX, py = s.playerY;
      for (const o of s.obstacles) {
        const collide =
          Math.abs(px - o.x) < (CAR_W / 2 + o.w / 2 - 4) &&
          Math.abs(py - o.y) < (CAR_H / 2 + o.h / 2 - 6);
        if (collide) {
          s.gameOver = true;
          setCarGameOver(true);
          setCarScore(Math.floor(s.score / 10));
          stopCarRace();
          return;
        }
      }

      // Draw everything
      drawRoad();
      s.obstacles.forEach(o => drawCar(o.x, o.y, o.color, false));
      drawCar(s.playerX, s.playerY, '#6366f1', true);

      // HUD
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${Math.floor(s.score / 10)}`, ROAD_LEFT + 8, 22);
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 10px system-ui';
      ctx.fillText(`Speed: ${s.speed.toFixed(1)}x`, ROAD_LEFT + 8, 38);

      carGameLoopRef.current = requestAnimationFrame(loop);
    };

    carGameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      stopCarRace();
      window.removeEventListener('keydown', handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carRaceStarted, carGameOver]);

  // Clean up car race on unmount
  useEffect(() => {
    return () => stopCarRace();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Snake Game ────────────────────────────────────────────────────────────
  const startSnakeGame = () => {
    const s = snakeStateRef.current;
    s.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    s.dir = { x: 1, y: 0 };
    s.food = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
    s.score = 0;
    s.gameOver = false;
    setSnakeScore(0);
    setSnakeGameOver(false);
    setSnakeRaceStarted(true);
  };

  const stopSnakeGame = () => {
    if (snakeGameLoopRef.current) cancelAnimationFrame(snakeGameLoopRef.current);
    snakeGameLoopRef.current = null;
  };

  useEffect(() => {
    if (!snakeRaceStarted || snakeGameOver) return;

    const canvas = snakeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const GRID_SIZE = 20;
    const TILE_COUNT = 16; // 320x320 canvas / 20 = 16 tiles
    let lastRenderTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const s = snakeStateRef.current;
      if (e.key === 'ArrowUp' && s.dir.y !== 1) { s.dir = { x: 0, y: -1 }; }
      if (e.key === 'ArrowDown' && s.dir.y !== -1) { s.dir = { x: 0, y: 1 }; }
      if (e.key === 'ArrowLeft' && s.dir.x !== 1) { s.dir = { x: -1, y: 0 }; }
      if (e.key === 'ArrowRight' && s.dir.x !== -1) { s.dir = { x: 1, y: 0 }; }
    };

    window.addEventListener('keydown', handleKeyDown);

    const loop = (currentTime: number) => {
      const s = snakeStateRef.current;
      if (s.gameOver) return;

      snakeGameLoopRef.current = requestAnimationFrame(loop);

      const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
      if (secondsSinceLastRender < 0.13) return; // Snake speed limit
      lastRenderTime = currentTime;

      // Move snake
      const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

      // Wall collision
      if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        s.gameOver = true;
        setSnakeGameOver(true);
        setSnakeScore(s.score);
        stopSnakeGame();
        return;
      }

      // Self collision
      if (s.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        s.gameOver = true;
        setSnakeGameOver(true);
        setSnakeScore(s.score);
        stopSnakeGame();
        return;
      }

      s.snake.unshift(head);

      // Food collision
      if (head.x === s.food.x && head.y === s.food.y) {
        s.score += 10;
        setSnakeScore(s.score);
        s.food = {
          x: Math.floor(Math.random() * TILE_COUNT),
          y: Math.floor(Math.random() * TILE_COUNT)
        };
      } else {
        s.snake.pop();
      }

      // Clear Canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 1;
      for (let i = 0; i < TILE_COUNT; i++) {
        ctx.beginPath(); ctx.moveTo(i * GRID_SIZE, 0); ctx.lineTo(i * GRID_SIZE, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * GRID_SIZE); ctx.lineTo(canvas.width, i * GRID_SIZE); ctx.stroke();
      }

      // Draw Food
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(s.food.x * GRID_SIZE + GRID_SIZE / 2, s.food.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw Snake
      s.snake.forEach((segment, idx) => {
        ctx.fillStyle = idx === 0 ? '#10b981' : '#34d399';
        ctx.beginPath();
        ctx.roundRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2, 4);
        ctx.fill();
      });
    };

    snakeGameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      stopSnakeGame();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [snakeRaceStarted, snakeGameOver]);

  // Clean up snake on unmount
  useEffect(() => {
    return () => stopSnakeGame();
  }, []);

  // ─── Flappy Space Game ──────────────────────────────────────────────────────
  const startFlappyGame = () => {
    const s = flappyStateRef.current;
    s.birdY = 200;
    s.velocity = 0;
    s.obstacles = [];
    s.score = 0;
    s.gameOver = false;
    setFlappyScore(0);
    setFlappyGameOver(false);
    setFlappyStarted(true);
  };

  const stopFlappyGame = () => {
    if (flappyGameLoopRef.current) cancelAnimationFrame(flappyGameLoopRef.current);
    flappyGameLoopRef.current = null;
  };

  const handleFlappyJump = () => {
    if (flappyGameOver) return;
    flappyStateRef.current.velocity = -4.8;
  };

  useEffect(() => {
    if (!flappyStarted || flappyGameOver) return;

    const canvas = flappyCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;
    let lastObstacleTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleFlappyJump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const loop = (timestamp: number) => {
      const s = flappyStateRef.current;
      if (s.gameOver) return;

      frameCount++;
      s.velocity += 0.22; // Gravity
      s.birdY += s.velocity;

      // Check bounds
      if (s.birdY < 0 || s.birdY > canvas.height - 20) {
        s.gameOver = true;
        setFlappyGameOver(true);
        stopFlappyGame();
        return;
      }

      // Spawn space rocks
      if (timestamp - lastObstacleTime > 1800) {
        const gap = 110;
        const minHeight = 50;
        const maxHeight = canvas.height - gap - minHeight;
        const topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
        const bottomHeight = canvas.height - gap - topHeight;

        s.obstacles.push({
          x: canvas.width,
          top: topHeight,
          bottom: bottomHeight,
          passed: false
        });
        lastObstacleTime = timestamp;
      }

      // Move & filter obstacles
      s.obstacles.forEach(o => {
        o.x -= 2.2; // Move speed
      });

      // Score track
      s.obstacles.forEach(o => {
        if (!o.passed && o.x < 100) {
          o.passed = true;
          s.score += 1;
          setFlappyScore(s.score);
        }
      });

      s.obstacles = s.obstacles.filter(o => o.x > -60);

      // Collision check
      const bx = 100; // Rocket fixed position
      const by = s.birdY;
      const bRadius = 10;

      for (const o of s.obstacles) {
        if (bx + bRadius > o.x && bx - bRadius < o.x + 50) {
          if (by - bRadius < o.top || by + bRadius > canvas.height - o.bottom) {
            s.gameOver = true;
            setFlappyGameOver(true);
            stopFlappyGame();
            return;
          }
        }
      }

      // Clear Canvas
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw starry background
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 20; i++) {
        const sx = (Math.sin(i * 999) + 1) * 160;
        const sy = ((Math.cos(i * 123) + 1) * 240 + frameCount) % canvas.height;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Draw obstacles (asteroids/rocks)
      s.obstacles.forEach(o => {
        ctx.fillStyle = '#374151';
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 2;
        // Top block
        ctx.beginPath(); ctx.roundRect(o.x, 0, 50, o.top, [0, 0, 8, 8]); ctx.fill(); ctx.stroke();
        // Bottom block
        ctx.beginPath(); ctx.roundRect(o.x, canvas.height - o.bottom, 50, o.bottom, [8, 8, 0, 0]); ctx.fill(); ctx.stroke();
      });

      // Draw Rocket ship (purple neon jet)
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.roundRect(bx - 12, by - 8, 24, 16, 6);
      ctx.fill();

      // Flame
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by);
      ctx.lineTo(bx - 12, by - 4);
      ctx.lineTo(bx - 12, by + 4);
      ctx.fill();

      // HUD
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${s.score}`, 12, 24);

      flappyGameLoopRef.current = requestAnimationFrame(loop);
    };

    flappyGameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      stopFlappyGame();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [flappyStarted, flappyGameOver]);

  // Clean up flappy on unmount
  useEffect(() => {
    return () => stopFlappyGame();
  }, []);

  // ─── Brick Breaker Game ─────────────────────────────────────────────────────
  const startBrickGame = () => {
    const s = brickStateRef.current;
    s.paddleX = 120;
    s.ballX = 160;
    s.ballY = 320;
    s.ballDX = 2.5;
    s.ballDY = -2.5;
    s.score = 0;
    s.gameOver = false;
    s.keys = { left: false, right: false };

    // Setup bricks grid (5 rows, 7 columns)
    s.bricks = [];
    const colors = ['#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#3b82f6'];
    const brickW = 38;
    const brickH = 15;
    const offsetLeft = 18;
    const offsetTop = 45;
    const padding = 5;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 7; c++) {
        s.bricks.push({
          x: offsetLeft + c * (brickW + padding),
          y: offsetTop + r * (brickH + padding),
          w: brickW,
          h: brickH,
          active: true,
          color: colors[r]
        });
      }
    }

    setBrickScore(0);
    setBrickGameOver(false);
    setBrickStarted(true);
  };

  const stopBrickGame = () => {
    if (brickGameLoopRef.current) cancelAnimationFrame(brickGameLoopRef.current);
    brickGameLoopRef.current = null;
  };

  useEffect(() => {
    if (!brickStarted || brickGameOver) return;

    const canvas = brickCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const PADDLE_W = 65;
    const PADDLE_H = 10;
    const BALL_RADIUS = 6;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') brickStateRef.current.keys.left = true;
      if (e.key === 'ArrowRight') brickStateRef.current.keys.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') brickStateRef.current.keys.left = false;
      if (e.key === 'ArrowRight') brickStateRef.current.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const loop = () => {
      const s = brickStateRef.current;
      if (s.gameOver) return;

      // Steer paddle
      const paddleSpeed = 5;
      if (s.keys.left && s.paddleX > 4) s.paddleX -= paddleSpeed;
      if (s.keys.right && s.paddleX < canvas.width - PADDLE_W - 4) s.paddleX += paddleSpeed;

      // Ball physics
      s.ballX += s.ballDX;
      s.ballY += s.ballDY;

      // Ball wall bounces
      if (s.ballX - BALL_RADIUS < 0 || s.ballX + BALL_RADIUS > canvas.width) {
        s.ballDX = -s.ballDX;
      }
      if (s.ballY - BALL_RADIUS < 0) {
        s.ballDY = -s.ballDY;
      }

      // Ball drop / Game over
      if (s.ballY + BALL_RADIUS > canvas.height) {
        s.gameOver = true;
        setBrickGameOver(true);
        stopBrickGame();
        return;
      }

      // Paddle bounce
      if (
        s.ballY + BALL_RADIUS > canvas.height - PADDLE_H - 15 &&
        s.ballX > s.paddleX &&
        s.ballX < s.paddleX + PADDLE_W
      ) {
        s.ballDY = -Math.abs(s.ballDY);
        // Add dynamic bounce angle based on hit position
        const hitPos = (s.ballX - (s.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
        s.ballDX = hitPos * 3;
      }

      // Brick collisions
      s.bricks.forEach(b => {
        if (!b.active) return;
        if (
          s.ballX + BALL_RADIUS > b.x &&
          s.ballX - BALL_RADIUS < b.x + b.w &&
          s.ballY + BALL_RADIUS > b.y &&
          s.ballY - BALL_RADIUS < b.y + b.h
        ) {
          b.active = false;
          s.ballDY = -s.ballDY;
          s.score += 100;
          setBrickScore(s.score);
        }
      });

      // Clear & Draw
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Paddle
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(s.paddleX, canvas.height - PADDLE_H - 15, PADDLE_W, PADDLE_H, 4);
      ctx.fill();

      // Draw Ball
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Draw Bricks
      s.bricks.forEach(b => {
        if (!b.active) return;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 3);
        ctx.fill();
      });

      // HUD
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${s.score}`, 15, 25);

      brickGameLoopRef.current = requestAnimationFrame(loop);
    };

    brickGameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      stopBrickGame();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [brickStarted, brickGameOver]);

  // Clean up brick breaker on unmount
  useEffect(() => {
    return () => stopBrickGame();
  }, []);

  // ─── Memory Match Game Handlers ─────────────────────────────────────────────
  const handleMemoryCardClick = (index: number) => {
    if (!gameState || !user) return;
    if (gameState.turn !== user.id || gameState.status !== 'playing') return;

    const cards = [...(gameState.memoryCards || [])];
    const selected = [...(gameState.memorySelected || [])];
    const scores = { ...(gameState.memoryScores || {}) };

    if (cards[index].isFlipped || cards[index].isMatched || selected.includes(index)) return;

    cards[index].isFlipped = true;
    selected.push(index);

    let updatedSelected = selected;
    let turn: string | null = gameState.turn;
    let status: 'idle' | 'playing' | 'won' | 'draw' = gameState.status;
    let winner: string | null = gameState.winner;

    if (selected.length === 2) {
      const [idx1, idx2] = selected;
      if (cards[idx1].symbol === cards[idx2].symbol) {
        cards[idx1].isMatched = true;
        cards[idx2].isMatched = true;
        scores[user.id] = (scores[user.id] || 0) + 1;
        updatedSelected = [];

        if (cards.every(c => c.isMatched)) {
          status = 'won';
          const oppId = user.id === gameState.playerX ? gameState.playerO : gameState.playerX;
          const myScore = scores[user.id] || 0;
          const oppScore = scores[oppId || ''] || 0;
          if (myScore > oppScore) {
            winner = user.id;
          } else if (oppScore > myScore) {
            winner = oppId;
          } else {
            status = 'draw';
          }
          turn = null;
        }
      } else {
        turn = user.id === gameState.playerX ? gameState.playerO : gameState.playerX;
        setTimeout(() => {
          setGameState(current => {
            if (!current || !current.memoryCards) return current;
            const nextCards = [...current.memoryCards];
            nextCards[idx1].isFlipped = false;
            nextCards[idx2].isFlipped = false;
            const updated = {
              ...current,
              memoryCards: nextCards,
              memorySelected: []
            };
            sendGameUpdate(updated);
            return updated;
          });
        }, 1000);
      }
    }

    const updatedGame = {
      ...gameState,
      memoryCards: cards,
      memorySelected: updatedSelected,
      memoryScores: scores,
      turn,
      status,
      winner
    };

    setGameState(updatedGame);
    sendGameUpdate(updatedGame);
  };

  // Coin Toss handlers
  const handleCoinToss = (prediction: 'heads' | 'tails') => {
    if (coinFlipping) return;
    setCoinFlipping(true);
    setCoinResult(null);

    setTimeout(() => {
      const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
      setCoinResult(outcome);
      setCoinFlipping(false);

      if (gameState && user) {
        const isWinner = outcome === prediction;
        const updatedGame = {
          ...gameState,
          status: 'won',
          winner: isWinner ? user.id : (user.id === gameState.playerX ? gameState.playerO : gameState.playerX)
        };
        sendGameUpdate(updatedGame);
      }
    }, 1500);
  };

  // Spin the Wheel handlers
  const handleSpinWheel = () => {
    if (wheelIsSpinning || wheelOptions.length === 0) return;
    setWheelIsSpinning(true);
    setWheelWinner(null);

    const winnerIdx = Math.floor(Math.random() * wheelOptions.length);
    const rotationAmount = 360 * 5 + (360 - (winnerIdx * (360 / wheelOptions.length)));
    setWheelRotationDegrees(prev => prev + rotationAmount);

    setTimeout(() => {
      setWheelIsSpinning(false);
      const winnerName = wheelOptions[winnerIdx];
      setWheelWinner(winnerName);

      if (gameState) {
        const updatedGame = {
          ...gameState,
          wheelQuestion: wheelQuestion,
          wheelOptions: wheelOptions,
          wheelResultIndex: winnerIdx,
          status: 'won',
          winner: null
        };
        sendGameUpdate(updatedGame);
      }
    }, 4000);
  };

  const addWheelOption = () => {
    if (!newWheelOption.trim() || wheelOptions.length >= 8) return;
    setWheelOptions(prev => [...prev, newWheelOption.trim()]);
    setNewWheelOption('');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChatPartner = (convo: Conversation) => {
    return convo.members.find(m => m.id !== user?.id) || convo.members[0];
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Safe Message Content Parser
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

  // Chess Board Renderer
  const renderChessBoard = () => {
    if (!gameState) return null;
    const board = gameState.chessBoard || Array(64).fill(null);
    const isDarkSquare = (row: number, col: number) => (row + col) % 2 === 1;
    
    // Flip the board when it is the Black player's (playerO) turn
    const shouldFlip = gameState.turn === gameState.playerO;

    const squares = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        // Map visual row/col to rotated 1D index if flipped
        const idx = shouldFlip ? (63 - (row * 8 + col)) : (row * 8 + col);
        const isDark = isDarkSquare(row, col);
        const piece = board[idx];
        const isSelected = selectedSquare === idx;

        squares.push(
          <button
            key={idx}
            type="button"
            onClick={() => handleChessSquareClick(idx)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-2xl font-bold transition-all relative border border-transparent select-none ${
              isSelected 
                ? 'bg-brand-500/40 border-brand-400 z-10 scale-105 shadow-md shadow-brand-500/10' 
                : isDark 
                ? 'bg-slate-900/60 hover:bg-slate-800/40 text-slate-400' 
                : 'bg-slate-800/15 hover:bg-slate-800/30 text-white'
            }`}
          >
            {piece ? (
              <span className={`${piece === piece.toUpperCase() ? 'text-slate-100 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.85)]' : 'text-slate-950 drop-shadow-[0_0.75px_0.75px_rgba(255,255,255,0.75)]'} text-3xl md:text-4xl font-extrabold select-none`}>
                {pieceUnicode[piece]}
              </span>
            ) : ''}
            {col === 0 && (
              <span className="absolute top-0.5 left-1 text-[7px] font-black text-slate-650/80">
                {shouldFlip ? row + 1 : 8 - row}
              </span>
            )}
            {row === 7 && (
              <span className="absolute bottom-0.5 right-1 text-[7px] font-black text-slate-655/80">
                {String.fromCharCode(97 + (shouldFlip ? 7 - col : col))}
              </span>
            )}
          </button>
        );
      }
    }

    return (
      <div className="grid grid-cols-8 gap-0 border border-white/[0.04] rounded-2xl overflow-hidden shadow-2xl bg-slate-950/20 p-1 select-none">
        {squares}
      </div>
    );
  };

  // Unified Game Renderer
  const renderActiveGame = () => {
    if (!gameState) return null;
    const gameType = gameState.gameType || 'tic-tac-toe';

    switch (gameType) {
      case 'tic-tac-toe':
        return (
          <div className="w-full max-w-xs flex flex-col items-center gap-5 p-6 bg-slate-950/60 border border-white/[0.04] rounded-3xl shadow-2xl animate-zoom select-none">
            
            {/* Scoreboard */}
            <div className="flex items-center justify-between w-full border-b border-white/[0.03] pb-4 mb-1">
              <div className="flex flex-col items-center gap-1 w-20 text-center">
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Player X</span>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                  gameState.playerX === user?.id 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                    : 'bg-slate-900 border-slate-850 text-slate-400'
                }`}>
                  {gameState.playerX === user?.id ? 'You' : 'Opponent'}
                </span>
                <span className="text-lg font-black text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)] mt-1">X</span>
              </div>
              
              <div className="text-[9px] font-black text-slate-650 uppercase tracking-widest">VS</div>
              
              <div className="flex flex-col items-center gap-1 w-20 text-center">
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Player O</span>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                  gameState.playerO === user?.id 
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                    : 'bg-slate-900 border-slate-850 text-slate-400'
                }`}>
                  {gameState.playerO === user?.id ? 'You' : 'Opponent'}
                </span>
                <span className="text-lg font-black text-blue-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.4)] mt-1">O</span>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-2.5 bg-slate-900/10 p-2 rounded-2xl border border-white/[0.01] w-48 h-48">
              {(gameState.board || Array(9).fill(null)).map((cell, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={gameState.status !== 'playing' || gameState.turn !== user?.id || cell !== null}
                  onClick={() => handleMakeMove(idx)}
                  className={`rounded-xl flex items-center justify-center font-black text-2xl select-none transition-all duration-75 active:scale-95 ${
                    cell === 'X'
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                      : cell === 'O'
                      ? 'bg-blue-500/10 border border-blue-500/30 text-blue-450 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                      : gameState.status === 'playing' && gameState.turn === user?.id
                      ? 'bg-slate-900/60 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-850 cursor-pointer'
                      : 'bg-slate-950/20 border border-slate-900/40 opacity-40 cursor-not-allowed'
                  }`}
                >
                  {cell}
                </button>
              ))}
            </div>

            {/* Game Result Banner */}
            {gameState.status === 'won' && (
              <div className="text-center font-black text-[10px] uppercase tracking-wider text-green-400 bg-green-500/10 border border-green-500/20 px-4 py-1.5 rounded-full w-full animate-bounce mt-2">
                🎉 {gameState.winner === user?.id ? 'You won the match!' : 'Opponent won!'}
              </div>
            )}
            {gameState.status === 'draw' && (
              <div className="text-center font-black text-[10px] uppercase tracking-wider text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-4 py-1.5 rounded-full w-full mt-2">
                🤝 Ended in a draw!
              </div>
            )}
          </div>
        );

      case 'chess':
        return (
          <div className="flex flex-col items-center gap-6 animate-zoom">
            {renderChessBoard()}
            <div className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {gameState.status === 'playing' ? (
                <span>Sandbox chess · Click piece to select, click tile to move/capture</span>
              ) : (
                <span className="text-emerald-400 font-extrabold">King Captured! Game Over</span>
              )}
            </div>
          </div>
        );

      case 'rps': {
        const myMove = gameState.rpsPlayerMoves?.[user?.id || ''];
        const opponentId = user?.id === gameState.playerX ? gameState.playerO : gameState.playerX;
        const opponentMove = opponentId ? gameState.rpsPlayerMoves?.[opponentId] : null;
        
        return (
          <div className="flex flex-col items-center gap-6 animate-zoom max-w-md w-full">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">Rock Paper Scissors</h4>
              <p className="text-[10px] text-slate-500 font-medium">Choose your weapon. Selections are hidden until both players choose.</p>
            </div>

            {gameState.status === 'playing' ? (
              <div className="flex flex-col items-center gap-6">
                {!myMove ? (
                  <div className="flex gap-4">
                    {[
                      { id: 'rock', emoji: '✊', label: 'Rock' },
                      { id: 'paper', emoji: '✋', label: 'Paper' },
                      { id: 'scissors', emoji: '✌️', label: 'Scissors' },
                    ].map(move => (
                      <button
                        key={move.id}
                        type="button"
                        onClick={() => handleRpsChoice(move.id as any)}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-950 border border-slate-900 hover:border-brand-500 hover:bg-brand-550/5 flex flex-col items-center justify-center gap-1.5 text-2xl active:scale-95 transition-all shadow-lg"
                      >
                        <span>{move.emoji}</span>
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-450">{move.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center space-y-2 bg-slate-955/60 border border-white/[0.03] px-6 py-4 rounded-2xl">
                    <span className="text-3xl animate-bounce block">⏳</span>
                    <span className="text-xs font-bold text-slate-450">You chose <span className="text-white font-extrabold capitalize">{myMove}</span></span>
                    <p className="text-[9px] text-slate-650 font-semibold">Waiting for partner choice...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 bg-slate-950/60 border border-white/[0.03] p-6 rounded-2xl w-full">
                <div className="flex justify-around items-center w-full">
                  <div className="text-center space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">You</span>
                    <span className="text-4xl block">{myMove === 'rock' ? '✊' : myMove === 'paper' ? '✋' : '✌️'}</span>
                    <span className="text-xs font-bold text-white capitalize">{myMove}</span>
                  </div>
                  <div className="text-lg font-black text-slate-655">VS</div>
                  <div className="text-center space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Opponent</span>
                    <span className="text-4xl block">{opponentMove === 'rock' ? '✊' : opponentMove === 'paper' ? '✋' : '✌️'}</span>
                    <span className="text-xs font-bold text-white capitalize">{opponentMove || 'no move'}</span>
                  </div>
                </div>

                <div className="border-t border-white/[0.04] w-full pt-4 mt-2 text-center">
                  {gameState.status === 'draw' ? (
                    <span className="text-yellow-500 font-extrabold text-xs">It's a draw! 🤝</span>
                  ) : gameState.winner === user?.id ? (
                    <span className="text-green-400 font-extrabold text-xs">🎉 You Won the RPS battle!</span>
                  ) : (
                    <span className="text-red-400 font-extrabold text-xs">💀 You Lost the RPS battle!</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'higher-lower':
        return (
          <div className="flex flex-col items-center gap-6 animate-zoom max-w-sm w-full">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">Higher or Lower</h4>
              <p className="text-[10px] text-slate-500 font-medium">Guess if the next card is higher or lower!</p>
            </div>

            {hlCard ? (
              <div className="flex flex-col items-center gap-6 w-full">
                {/* Score Board */}
                <div className="flex gap-10 text-center bg-slate-950/45 px-6 py-2.5 rounded-full border border-white/[0.02]">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Score</span>
                    <span className="text-sm font-extrabold text-white">{hlScore}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Streak</span>
                    <span className="text-sm font-extrabold text-brand-400">{hlStreak}</span>
                  </div>
                </div>

                {/* Card Container */}
                <div className={`w-36 h-52 bg-slate-900 border ${hlGameOver ? 'border-red-900/60 shadow-red-900/10' : 'border-slate-850 shadow-slate-950/50'} rounded-2xl flex flex-col justify-between p-4 shadow-2xl relative select-none transform hover:scale-[1.02] transition-all`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-base font-extrabold ${['\u2665', '\u2666'].includes(hlCard.suit) ? 'text-red-500' : 'text-slate-400'}`}>
                      {hlCard.label.split(' ')[0]}
                    </span>
                    <span className={`text-lg ${['\u2665', '\u2666'].includes(hlCard.suit) ? 'text-red-500' : 'text-slate-400'}`}>
                      {hlCard.suit}
                    </span>
                  </div>
                  
                  <span className={`text-6xl self-center ${['\u2665', '\u2666'].includes(hlCard.suit) ? 'text-red-500' : 'text-slate-400'}`}>
                    {hlCard.suit}
                  </span>

                  <div className="flex justify-between items-end rotate-180">
                    <span className={`text-base font-extrabold ${['\u2665', '\u2666'].includes(hlCard.suit) ? 'text-red-500' : 'text-slate-400'}`}>
                      {hlCard.label.split(' ')[0]}
                    </span>
                    <span className={`text-lg ${['\u2665', '\u2666'].includes(hlCard.suit) ? 'text-red-500' : 'text-slate-400'}`}>
                      {hlCard.suit}
                    </span>
                  </div>
                </div>

                {!hlGameOver ? (
                  <div className="flex gap-4 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => handleHlGuess('higher')}
                      className="px-5 py-2 bg-emerald-650 hover:bg-emerald-600 active:scale-95 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow"
                    >
                      Higher ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHlGuess('lower')}
                      className="px-5 py-2 bg-brand-650 hover:bg-brand-600 active:scale-95 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow"
                    >
                      Lower ↓
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-3 bg-red-950/10 border border-red-950/20 px-6 py-4 rounded-xl w-full">
                    <h5 className="text-red-500 font-extrabold text-xs">Game Over!</h5>
                    <p className="text-[10px] text-slate-450 font-bold">Your final score was {hlScore} with a streak of {hlStreak}!</p>
                    <button
                      type="button"
                      onClick={handleHlStart}
                      className="py-1 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[9px] font-bold uppercase border border-slate-800 transition-colors"
                    >
                      Play Again
                    </button>
                  </div>
                )}

                {/* History list */}
                {hlCardHistory.length > 1 && (
                  <div className="w-full">
                    <span className="text-[8px] font-black uppercase text-slate-650 block tracking-wider mb-2">History</span>
                    <div className="flex gap-1.5 flex-wrap justify-center">
                      {hlCardHistory.slice(0, -1).map((c, i) => (
                        <span key={i} className={`text-[8px] font-bold px-2 py-0.5 rounded-full bg-slate-950 border border-white/5 ${['\u2665', '\u2666'].includes(c.suit) ? 'text-red-500' : 'text-slate-400'}`}>
                          {c.label.split(' ')[0]}{c.suit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleHlStart}
                className="py-2.5 px-6 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow"
              >
                Start Guessing
              </button>
            )}
          </div>
        );

      case 'whack-a-mole':
        return (
          <div className="flex flex-col items-center gap-6 animate-zoom max-w-sm w-full">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">Whack-a-Mole</h4>
              <p className="text-[10px] text-slate-500 font-medium">Whack the mole as fast as possible when it pops up!</p>
            </div>

            <div className="flex justify-between items-center w-full px-4 py-2 bg-slate-955/45 border border-white/[0.02] rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-450">
              <span>Score: <strong className="text-white text-xs font-black">{moleScore}</strong></span>
              <span>Time: <strong className="text-brand-400 text-xs font-black">{moleTimeLeft}s</strong></span>
            </div>

            {moleIsPlaying ? (
              <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-3xl border border-white/[0.02]">
                {Array(9).fill(null).map((_, idx) => {
                  const isActive = moleActiveIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleWhackMole(idx)}
                      className="h-16 w-16 md:h-20 md:w-20 bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:border-slate-800 rounded-2xl flex items-center justify-center relative overflow-hidden transition-all duration-75 active:scale-90"
                    >
                      <span className="absolute bottom-1 w-10 h-2 bg-black/60 rounded-full blur-[1px]"></span>
                      {isActive && (
                        <span className="text-3xl select-none animate-mole-pop relative z-10">🐹</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 bg-slate-950/60 border border-white/[0.03] p-6 rounded-2xl w-full text-center">
                {moleScore > 0 ? (
                  <div className="space-y-1.5">
                    <span className="text-3xl block">🏆</span>
                    <h5 className="text-white font-extrabold text-xs">Game Finished!</h5>
                    <p className="text-[10px] text-slate-400">You whacked {moleScore} moles in 30 seconds!</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500">Ready to test your reaction time?</p>
                )}
                <button
                  type="button"
                  onClick={startWhackAMole}
                  className="py-2.5 px-6 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow"
                >
                  {moleScore > 0 ? 'Play Again' : 'Start Whack Game'}
                </button>
              </div>
            )}
          </div>
        );

      case 'coin-toss':
        return (
          <div className="flex flex-col items-center gap-6 animate-zoom max-w-sm w-full">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">Coin Toss</h4>
              <p className="text-[10px] text-slate-500 font-medium">Flip a coin to make a quick decision!</p>
            </div>

            <div className="h-32 w-32 flex items-center justify-center relative select-none">
              <div className={`h-24 w-24 rounded-full border-4 border-amber-400 bg-gradient-to-tr from-amber-550 to-yellow-300 shadow-2xl flex items-center justify-center text-4xl select-none ${
                coinFlipping ? 'animate-coin-flip' : ''
              }`}>
                {coinResult === 'heads' ? '👑' : coinResult === 'tails' ? '🍂' : '🪙'}
              </div>
            </div>

            {coinResult && (
              <div className="text-center bg-slate-950/45 px-6 py-2.5 rounded-full border border-white/[0.02]">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">Result</span>
                <span className="text-xs font-extrabold text-white capitalize">{coinResult}!</span>
              </div>
            )}

            {!coinFlipping ? (
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleCoinToss('heads')}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow"
                >
                  Predict Heads 👑
                </button>
                <button
                  type="button"
                  onClick={() => handleCoinToss('tails')}
                  className="px-5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 active:scale-95 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow"
                >
                  Predict Tails 🍂
                </button>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-550 animate-pulse uppercase tracking-wider font-extrabold text-[10px]">Flipping coin...</span>
            )}
          </div>
        );

      case 'spin-wheel':
        return (
          <div className="flex flex-col md:flex-row items-center justify-around gap-8 animate-zoom w-full max-w-2xl">
            
            {/* Left Inputs panel */}
            <div className="w-full md:w-64 space-y-4 bg-slate-950/45 border border-white/[0.02] p-5 rounded-2xl">
              <div>
                <label className="text-[8px] font-black uppercase text-slate-500 block tracking-widest mb-1.5">Question / Topic</label>
                <input
                  type="text"
                  value={wheelQuestion}
                  onChange={(e) => setWheelQuestion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-700 outline-none focus:border-brand-500"
                  placeholder="Enter topic"
                  maxLength={50}
                  disabled={wheelIsSpinning}
                />
              </div>

              <div>
                <label className="text-[8px] font-black uppercase text-slate-500 block tracking-widest mb-1.5">Options ({wheelOptions.length}/8)</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto mb-3 scrollbar-thin">
                  {wheelOptions.map((opt, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-900/60 border border-white/[0.01] px-2.5 py-1 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'][i % 8] }}></span>
                        <span className="text-slate-300 font-bold truncate max-w-[120px]">{opt}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWheelOptions(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-[10px] text-slate-550 hover:text-red-400 font-black px-1"
                        disabled={wheelIsSpinning || wheelOptions.length <= 2}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {wheelOptions.length < 8 && (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newWheelOption}
                      onChange={(e) => setNewWheelOption(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addWheelOption()}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-700 outline-none focus:border-brand-500"
                      placeholder="Add option..."
                      maxLength={30}
                      disabled={wheelIsSpinning}
                    />
                    <button
                      type="button"
                      onClick={addWheelOption}
                      className="px-2.5 bg-brand-650 hover:bg-brand-600 rounded-lg text-xs font-bold text-white"
                      disabled={wheelIsSpinning}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Wheel display */}
            <div className="flex flex-col items-center gap-6 relative">
              <div className="relative w-48 h-48 flex items-center justify-center bg-slate-950 rounded-full border border-white/[0.02] shadow-2xl p-2">
                <div className="absolute top-0 -mt-2.5 text-white text-base select-none z-20 font-bold">▼</div>

                <svg
                  viewBox="-50 -50 100 100"
                  className="w-full h-full transform transition-transform duration-[4000ms] ease-out z-10"
                  style={{
                    transform: `rotate(${-90 + wheelRotationDegrees}deg)`,
                  }}
                >
                  {(() => {
                    const total = wheelOptions.length;
                    if (total === 0) return null;
                    let accumulatedPercent = 0;
                    
                    return wheelOptions.map((_, i) => {
                      const percent = 1 / total;
                      const [startX, startY] = getCoordinatesForPercent(accumulatedPercent);
                      accumulatedPercent += percent;
                      const [endX, endY] = getCoordinatesForPercent(accumulatedPercent);
                      
                      const largeArcFlag = percent > 0.5 ? 1 : 0;
                      
                      const pathData = [
                        `M 0 0`,
                        `L ${startX * 45} ${startY * 45}`,
                        `A 45 45 0 ${largeArcFlag} 1 ${endX * 45} ${endY * 45}`,
                        `Z`
                      ].join(' ');
                      
                      const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];
                      const fill = colors[i % colors.length];
                      
                      return (
                        <path key={i} d={pathData} fill={fill} className="stroke-[#0c0c10] stroke-[0.8]" />
                      );
                    });
                  })()}
                  <circle cx="0" cy="0" r="6" fill="#0c0c10" className="stroke-white/10 stroke-[0.5]" />
                </svg>
              </div>

              {wheelWinner && (
                <div className="text-center space-y-1 animate-zoom">
                  <span className="text-[8px] font-black uppercase text-slate-550 block tracking-wider">Landed on</span>
                  <div className="text-xs font-black text-brand-400 bg-brand-500/10 border border-brand-500/20 px-4 py-1 rounded-full">{wheelWinner}!</div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSpinWheel}
                disabled={wheelIsSpinning || wheelOptions.length < 2}
                className="py-2.5 px-8 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-500/10 active:scale-[0.98]"
              >
                {wheelIsSpinning ? 'Spinning...' : 'Spin Wheel'}
              </button>
            </div>

          </div>
        );

      case 'car-racing':
        return (
          <div className="flex flex-col items-center gap-4 animate-zoom w-full max-w-sm">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">🏎️ Car Racing</h4>
              <p className="text-[10px] text-slate-500 font-medium">
                {carRaceStarted && !carGameOver
                  ? 'Use ← / → arrow keys or tap sides to steer'
                  : carGameOver
                  ? `Game Over! Score: ${carScore}`
                  : 'Dodge all obstacles and survive as long as you can!'}
              </p>
            </div>

            {/* Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-xl shadow-brand-500/5">
              <canvas
                ref={carCanvasRef}
                width={320}
                height={480}
                className="block touch-none"
                style={{ maxWidth: '100%' }}
              />

              {/* Touch steering overlay (mobile) */}
              {carRaceStarted && !carGameOver && (
                <div className="absolute inset-0 flex">
                  <div
                    className="flex-1 cursor-pointer select-none"
                    onTouchStart={() => { carStateRef.current.targetX = 110; }}
                    onMouseDown={() => { carStateRef.current.targetX = 110; }}
                  />
                  <div
                    className="flex-1 cursor-pointer select-none"
                    onTouchStart={() => { carStateRef.current.targetX = 210; }}
                    onMouseDown={() => { carStateRef.current.targetX = 210; }}
                  />
                </div>
              )}

              {/* Start / Game Over Overlay */}
              {(!carRaceStarted || carGameOver) && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  {carGameOver && (
                    <div className="text-center space-y-1">
                      <p className="text-2xl font-black text-red-400">💥 Crashed!</p>
                      <p className="text-base font-black text-white">Score: {carScore}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={startCarRace}
                    className="px-8 py-3 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-brand-500/20"
                  >
                    {carGameOver ? '🔄 Play Again' : '🏁 Start Race'}
                  </button>
                  {!carRaceStarted && (
                    <p className="text-[10px] text-slate-500 text-center max-w-[200px]">Arrow keys or tap left/right to steer your car</p>
                  )}
                </div>
              )}
            </div>

            {/* Mobile controls (Premium console styled buttons) */}
            {carRaceStarted && !carGameOver && (
              <div className="flex gap-10 mt-2">
                <button
                  type="button"
                  onTouchStart={() => { carStateRef.current.targetX = 110; }}
                  onMouseDown={() => { carStateRef.current.targetX = 110; }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-white/[0.08] hover:border-brand-500/40 hover:from-[#334155] hover:to-[#1e293b] active:scale-90 active:from-brand-600/20 active:to-brand-850/20 active:border-brand-500/60 shadow-lg shadow-black/40 flex items-center justify-center text-white transition-all select-none cursor-pointer"
                  aria-label="Steer Left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className="w-6 h-6 text-slate-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onTouchStart={() => { carStateRef.current.targetX = 210; }}
                  onMouseDown={() => { carStateRef.current.targetX = 210; }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-white/[0.08] hover:border-brand-500/40 hover:from-[#334155] hover:to-[#1e293b] active:scale-90 active:from-brand-600/20 active:to-brand-850/20 active:border-brand-500/60 shadow-lg shadow-black/40 flex items-center justify-center text-white transition-all select-none cursor-pointer"
                  aria-label="Steer Right"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className="w-6 h-6 text-slate-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );

      case 'snake':
        return (
          <div className="flex flex-col items-center gap-4 animate-zoom w-full max-w-sm">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">🐍 Retro Snake</h4>
              <p className="text-[10px] text-slate-500 font-medium">
                {snakeRaceStarted && !snakeGameOver ? 'Use arrow keys or touch buttons to steer' : `Score: ${snakeScore}`}
              </p>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-xl">
              <canvas ref={snakeCanvasRef} width={320} height={320} className="block" />

              {(!snakeRaceStarted || snakeGameOver) && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  {snakeGameOver && (
                    <div className="text-center space-y-1">
                      <p className="text-xl font-black text-red-400">💥 Game Over!</p>
                      <p className="text-sm font-bold text-white">Final Score: {snakeScore}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={startSnakeGame}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg transition-all"
                  >
                    {snakeGameOver ? '🔄 Play Again' : '🏁 Start Game'}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Controls D-Pad */}
            {snakeRaceStarted && !snakeGameOver && (
              <div className="flex flex-col items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => { const s = snakeStateRef.current; if (s.dir.y !== 1) s.dir = { x: 0, y: -1 }; }}
                  className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center active:bg-slate-800 text-white font-bold select-none cursor-pointer"
                >
                  ▲
                </button>
                <div className="flex gap-10">
                  <button
                    type="button"
                    onClick={() => { const s = snakeStateRef.current; if (s.dir.x !== 1) s.dir = { x: -1, y: 0 }; }}
                    className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center active:bg-slate-800 text-white font-bold select-none cursor-pointer"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => { const s = snakeStateRef.current; if (s.dir.x !== -1) s.dir = { x: 1, y: 0 }; }}
                    className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center active:bg-slate-800 text-white font-bold select-none cursor-pointer"
                  >
                    ▶
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { const s = snakeStateRef.current; if (s.dir.y !== -1) s.dir = { x: 0, y: 1 }; }}
                  className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center active:bg-slate-800 text-white font-bold select-none cursor-pointer"
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        );

      case 'flappy-space':
        return (
          <div className="flex flex-col items-center gap-4 animate-zoom w-full max-w-sm">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">🚀 Flappy Space</h4>
              <p className="text-[10px] text-slate-500 font-medium">
                {flappyStarted && !flappyGameOver ? 'Tap screen or press Space/Up to Fly!' : `Score: ${flappyScore}`}
              </p>
            </div>

            <div 
              className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-xl cursor-pointer select-none"
              onClick={handleFlappyJump}
            >
              <canvas ref={flappyCanvasRef} width={320} height={400} className="block" />

              {(!flappyStarted || flappyGameOver) && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  {flappyGameOver && (
                    <div className="text-center space-y-1">
                      <p className="text-xl font-black text-red-400">💥 Rocket Crashed!</p>
                      <p className="text-sm font-bold text-white">Score: {flappyScore}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); startFlappyGame(); }}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg transition-all"
                  >
                    {flappyGameOver ? '🔄 Restart Rocket' : '🚀 Launch Rocket'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'brick-breaker':
        return (
          <div className="flex flex-col items-center gap-4 animate-zoom w-full max-w-sm">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">🧱 Brick Breaker</h4>
              <p className="text-[10px] text-slate-500 font-medium">
                {brickStarted && !brickGameOver ? 'Use arrows or tap sides to steer paddle' : `Score: ${brickScore}`}
              </p>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-xl">
              <canvas ref={brickCanvasRef} width={320} height={380} className="block" />

              {/* Side tap triggers for mobile */}
              {brickStarted && !brickGameOver && (
                <div className="absolute inset-x-0 bottom-0 h-20 flex">
                  <div
                    className="flex-1 cursor-pointer select-none"
                    onTouchStart={() => { brickStateRef.current.keys.left = true; }}
                    onTouchEnd={() => { brickStateRef.current.keys.left = false; }}
                    onMouseDown={() => { brickStateRef.current.keys.left = true; }}
                    onMouseUp={() => { brickStateRef.current.keys.left = false; }}
                    onMouseLeave={() => { brickStateRef.current.keys.left = false; }}
                  />
                  <div
                    className="flex-1 cursor-pointer select-none"
                    onTouchStart={() => { brickStateRef.current.keys.right = true; }}
                    onTouchEnd={() => { brickStateRef.current.keys.right = false; }}
                    onMouseDown={() => { brickStateRef.current.keys.right = true; }}
                    onMouseUp={() => { brickStateRef.current.keys.right = false; }}
                    onMouseLeave={() => { brickStateRef.current.keys.right = false; }}
                  />
                </div>
              )}

              {(!brickStarted || brickGameOver) && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  {brickGameOver && (
                    <div className="text-center space-y-1">
                      <p className="text-xl font-black text-red-400">💥 Game Over!</p>
                      <p className="text-sm font-bold text-white">Score: {brickScore}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={startBrickGame}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg transition-all"
                  >
                    {brickGameOver ? '🔄 Play Again' : '🏁 Start Breaker'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'memory-match':
        return (
          <div className="flex flex-col items-center gap-4 animate-zoom w-full max-w-sm">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">🃏 Memory Match</h4>
              <p className="text-[10px] text-slate-500 font-medium">
                {gameState.status === 'playing' ? (
                  gameState.turn === user?.id ? (
                    <span className="text-emerald-400 font-extrabold">Your Turn! Find pairs.</span>
                  ) : (
                    <span className="text-slate-550">Waiting for partner's turn...</span>
                  )
                ) : gameState.status === 'won' ? (
                  `Game Over! Winner: ${gameState.winner === user?.id ? 'You 🎉' : 'Partner 🏆'}`
                ) : gameState.status === 'draw' ? (
                  "Game Over! It's a Draw 🤝"
                ) : (
                  'Find matching emoji pairs!'
                )}
              </p>
            </div>

            {/* Score HUD */}
            <div className="flex justify-between w-full px-4 py-2.5 bg-slate-950/60 border border-white/[0.02] rounded-xl text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <span>You: <strong className="text-white text-xs">{gameState.memoryScores?.[user?.id || ''] || 0}</strong></span>
              <span>Partner: <strong className="text-brand-400 text-xs">{gameState.memoryScores?.[(user?.id === gameState.playerX ? gameState.playerO : gameState.playerX) || ''] || 0}</strong></span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-3 bg-slate-950/40 p-4 rounded-3xl border border-white/[0.02] w-full aspect-square">
              {gameState.memoryCards?.map((card, idx) => {
                const isRevealed = card.isFlipped || card.isMatched;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleMemoryCardClick(idx)}
                    disabled={gameState.status !== 'playing' || gameState.turn !== user?.id || isRevealed}
                    className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all select-none duration-150 transform ${
                      isRevealed 
                        ? 'bg-slate-900 border border-slate-800 scale-100 rotate-0' 
                        : 'bg-gradient-to-tr from-brand-650 to-brand-500 hover:from-brand-500 hover:to-brand-400 border border-brand-500/20 active:scale-90'
                    }`}
                  >
                    {isRevealed ? card.symbol : '❓'}
                  </button>
                );
              })}
            </div>

            {gameState.status !== 'playing' && (
              <button
                type="button"
                onClick={handleResetGame}
                className="py-2 px-6 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow"
              >
                🔄 Play Again
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Helper coordinate generator for Spin Wheel slices
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <>
    <div className="h-full min-h-0 md:h-screen flex flex-col md:flex-row bg-[#030303] text-slate-100 overflow-hidden relative">
      
      {/* LEFT PANEL: CONVERSATIONS LIST */}
      <div className={`w-full md:w-80 border-r border-white/[0.04] bg-[#060608]/40 flex flex-col h-full ${activeConvo ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-white/[0.04] flex justify-between items-center bg-slate-950/20 select-none">
          <h2 className="text-sm font-black tracking-wider text-white uppercase">Chats</h2>
          <button 
            onClick={() => setIsSearchMode(!isSearchMode)}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition-all text-slate-400 hover:text-white"
            title="Start new DM"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => { setShowCreateGroup(true); setIsSearchMode(false); }}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:border-brand-600 hover:border-opacity-80 rounded-xl transition-all text-slate-400 hover:text-brand-400"
            title="Create group chat"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>

        {/* Search DM user */}
        {isSearchMode && (
          <div className="p-3 border-b border-white/[0.04] bg-slate-950/20 space-y-3 animate-zoom">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-650" />
              <input
                type="text"
                placeholder="Search username to chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-2 pl-9 pr-3 text-base md:text-xs text-slate-200 placeholder:text-slate-500 outline-none transition-all"
                autoFocus
                autoComplete="off"
              />
            </div>

            {/* Results */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
              {searching ? (
                <div className="flex justify-center p-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                </div>
              ) : searchQuery.trim() !== '' && searchResults.length === 0 ? (
                <div className="text-[10px] text-center text-slate-600 py-2">No users found</div>
              ) : (
                searchResults.map((su) => (
                  <div 
                    key={su.id}
                    onClick={() => handleStartDM(su)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900/60 cursor-pointer transition-colors border border-transparent hover:border-white/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 text-[10px] font-bold text-slate-400 select-none">
                        {su.avatar_url ? (
                          <img src={`/api/media/file/${su.avatar_url}`} alt={su.username} className="w-full h-full object-cover" />
                        ) : (
                          su.username.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate flex items-center">
                          {su.display_name || su.username}
                          {!!su.is_verified && <VerifiedBadge />}
                        </h4>
                        <p className="text-[9px] text-slate-500">@{su.username}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full select-none">Chat</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin select-none overscroll-contain">
          {loadingConvos ? (
            <div className="flex flex-col items-center py-10 text-slate-600 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-[10px]">Loading chats...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-20 text-slate-600 text-xs px-4">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-800 mb-2" />
              No active DMs. Click "+" to search users!
            </div>
          ) : (
            conversations.map((convo) => {
              const partner = getChatPartner(convo);
              const isActive = activeConvo?.id === convo.id;
              
              // Parse last message to check if secure media or reply
              let lastMsgText = 'No messages yet';
              if (convo.last_message) {
                const secure = parseMessageBody(convo.last_message.body);
                if (secure) {
                  lastMsgText = `🔒 Sent a secure ${secure.media_type}`;
                } else {
                  const isReply = convo.last_message.body.startsWith('{') && convo.last_message.body.endsWith('}');
                  if (isReply) {
                    try {
                      const parsed = JSON.parse(convo.last_message.body);
                      if (parsed && parsed.type === 'reply') {
                        lastMsgText = parsed.text || '';
                      } else {
                        lastMsgText = convo.last_message.body;
                      }
                    } catch {
                      lastMsgText = convo.last_message.body;
                    }
                  } else {
                    lastMsgText = convo.last_message.body;
                  }
                }
              }

              const convoTitle = convo.is_group
                ? (convo.group_name || 'Group Chat')
                : (partner.display_name || partner.username);

              const hasUnread = !!(convo.unread_count && convo.unread_count > 0);
              return (
                <div
                  key={convo.id}
                  onClick={async () => { 
                    onNavigate?.('messages', convo.id);
                    setIsSearchMode(false); 
                    if (hasUnread) {
                      // Optimistically clear unread count in state and dispatch event
                      setConversations(prev => {
                        const updated = prev.map(c => c.id === convo.id ? { ...c, unread_count: 0 } : c);
                        const nextUnreadCount = updated.filter(c => c.unread_count && c.unread_count > 0).length;
                        window.dispatchEvent(new CustomEvent('unread-chats-update-value', { detail: nextUnreadCount }));
                        return updated;
                      });
                      // Notify backend
                      try {
                        await fetch(`/api/conversations/${convo.id}/read`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                      } catch (err) {
                        console.error('Failed to mark conversation as read:', err);
                      }
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                      : hasUnread
                        ? 'bg-slate-900/50 border border-brand-500/20 shadow-sm'
                        : 'hover:bg-slate-900/30 border border-transparent hover:border-white/[0.02]'
                  }`}
                >
                  {/* Avatar */}
                  {convo.is_group ? (
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-white/15 border border-white/20' : 'bg-brand-600/20 border border-brand-600/30'
                    }`}>
                      <Users className={`w-5 h-5 ${isActive ? 'text-white' : 'text-brand-400'}`} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 text-xs font-bold text-slate-400">
                      {partner.avatar_url ? (
                        <img src={`/api/media/file/${partner.avatar_url}`} alt={partner.username} className="w-full h-full object-cover" />
                      ) : (
                        partner.username.substring(0, 2).toUpperCase()
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className={`text-xs truncate flex items-center gap-1.5 ${
                        isActive 
                          ? 'text-white font-bold' 
                          : hasUnread 
                            ? 'text-white font-extrabold' 
                            : 'text-slate-200 font-bold'
                      }`}>
                        {convoTitle}
                        {!convo.is_group && !!partner.is_verified && <VerifiedBadge />}
                        {convo.is_group && (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-white/15 text-white' : 'bg-brand-500/15 text-brand-400'
                          }`}>Group</span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2">
                        {hasUnread && !isActive && (
                          <span className="flex items-center justify-center min-w-[16px] h-4 text-[9px] font-black text-white bg-brand-500 rounded-full px-1 shadow animate-pulse">
                            {convo.unread_count}
                          </span>
                        )}
                        {convo.last_message && (
                          <span className={`text-[9px] flex-shrink-0 ml-1 ${
                            isActive 
                              ? 'text-brand-200 font-bold' 
                              : hasUnread
                                ? 'text-brand-400 font-black'
                                : 'text-slate-550 font-bold'
                          }`}>
                            {formatTime(convo.last_message.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-[11px] truncate ${
                      isActive 
                        ? 'text-brand-100 font-medium' 
                        : hasUnread
                          ? 'text-slate-200 font-semibold' 
                          : 'text-slate-500 font-medium'
                    }`}>
                      {lastMsgText}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* RIGHT PANEL: CHAT WINDOW */}
      <div className={`flex-1 flex flex-col h-full bg-[#030303] ${!activeConvo ? 'hidden md:flex justify-center items-center text-slate-650 p-8' : 'flex'}`}>
        {activeConvo ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-white/[0.04] bg-slate-950/20 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => onNavigate?.('messages')}
                  className="p-1 md:hidden hover:bg-slate-900 rounded-lg text-slate-400"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                {/* Avatar */}
                {activeConvo.is_group ? (
                  <div className="w-10 h-10 rounded-2xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-brand-400" />
                  </div>
                ) : (
                  <div 
                    onClick={() => onNavigate && onNavigate('profile', getChatPartner(activeConvo).username)}
                    className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden text-xs font-bold text-slate-400 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    {getChatPartner(activeConvo).avatar_url ? (
                      <img src={`/api/media/file/${getChatPartner(activeConvo).avatar_url}`} alt="Active Partner" className="w-full h-full object-cover" />
                    ) : (
                      getChatPartner(activeConvo).username.substring(0, 2).toUpperCase()
                    )}
                  </div>
                )}
                
                <div 
                  onClick={() => {
                    if (!activeConvo.is_group && onNavigate) {
                      onNavigate('profile', getChatPartner(activeConvo).username);
                    }
                  }}
                  className={!activeConvo.is_group ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
                >
                  <h4 className="text-xs font-black text-white flex items-center gap-1">
                    {activeConvo.is_group
                      ? (activeConvo.group_name || 'Group Chat')
                      : (getChatPartner(activeConvo).display_name || getChatPartner(activeConvo).username)
                    }
                    {!activeConvo.is_group && !!getChatPartner(activeConvo).is_verified && <VerifiedBadge />}
                    {activeConvo.is_group && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 ml-1">Group</span>
                    )}
                  </h4>
                  {activeConvo.is_group ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMembersModal(true); }}
                      className="text-[10px] text-slate-400 hover:text-white font-medium mt-0.5 flex items-center gap-1.5 transition-colors"
                      title="View group members"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{activeConvo.members.length} members</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-brand-400 font-bold flex items-center gap-1 mt-0.5">
                      <Shield className="w-3.5 h-3.5 text-brand-400" />
                      Encrypted Session
                    </span>
                  )}
                </div>
              </div>

              {/* Header Right: Three-dot menu */}
              <div className="relative" ref={headerMenuRef}>
                <button
                  onClick={() => setShowHeaderMenu(prev => !prev)}
                  className="p-2 rounded-xl transition-all border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-slate-400 hover:text-white"
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showHeaderMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#0e0e16] border border-white/[0.06] rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-up">
                    {/* Play Game — 1:1 DM only */}
                    {!activeConvo.is_group && (
                      <button
                        onClick={() => {
                          setShowHeaderMenu(false);
                          if (gameState && gameState.status !== 'idle') {
                            setShowGameBoard(!showGameBoard);
                          } else {
                            handleInviteGame();
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-white/[0.04] hover:text-white transition-all"
                      >
                        <Gamepad2 className={`w-4 h-4 ${gameState && gameState.status !== 'idle' ? 'text-brand-400 animate-pulse' : 'text-slate-400'}`} />
                        {gameState && gameState.status !== 'idle'
                          ? (showGameBoard ? 'Go to Chat' : 'Resume Game')
                          : 'Play Game'}
                      </button>
                    )}

                    {/* Delete Chat — 1:1 DM only */}
                    {!activeConvo.is_group && (
                      <button
                        onClick={() => { setShowHeaderMenu(false); handleDeleteChat(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                      >
                        <Trash className="w-4 h-4" />
                        Delete Chat
                      </button>
                    )}

                    {/* Group actions */}
                    {activeConvo.is_group && activeConvo.creator_id === user?.id && (
                      <button
                        onClick={() => { setShowHeaderMenu(false); handleDeleteChat(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                      >
                        <Trash className="w-4 h-4" />
                        Delete Group
                      </button>
                    )}
                    {activeConvo.is_group && (
                      <button
                        onClick={() => { setShowHeaderMenu(false); handleLeaveGroup(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                      >
                        <LeaveIcon className="w-4 h-4" />
                        Leave Group
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Unified Game Dashboard Layout */}
            {gameState && gameState.status !== 'idle' && showGameBoard ? (
              <div className="flex-1 w-full flex flex-col bg-[#07070c]/40 overflow-hidden relative select-none">
                
                {/* Game Header Status Banner */}
                <div className="px-5 py-3 bg-slate-950/60 border-b border-white/[0.04] flex items-center justify-between text-[11px] font-bold text-slate-350 select-none relative z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Gamepad2 className="w-4 h-4 text-brand-400" />
                    <span className="text-white capitalize">{gameState.gameType?.replace('-', ' ')} Game</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                    
                    {gameState.status === 'playing' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping"></span>
                        <span className="text-[10px] text-slate-400">
                          {gameState.turn === user?.id ? 'Your Turn' : 'Waiting for opponent'}
                        </span>
                      </div>
                    ) : gameState.status === 'won' ? (
                      <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
                        🏆 {gameState.winner === user?.id ? 'You Won!' : 'You Lost'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-yellow-500 font-bold">Draw / Ended</span>
                    )}
                  </div>
                  
                  {/* Reset/New Game and Close button */}
                  <div className="flex items-center gap-3">
                    {['tic-tac-toe', 'chess', 'rps', 'coin-toss', 'spin-wheel'].includes(gameState.gameType || '') && (
                      <button
                        onClick={handleResetGame}
                        className="py-1 px-3 bg-slate-900 hover:bg-slate-800 text-[9px] font-extrabold text-slate-300 rounded-lg border border-slate-800 transition-all uppercase tracking-wider active:scale-95"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={handleCloseGame}
                      className="py-1 px-3 bg-red-950/20 border border-red-950/30 hover:bg-red-900/20 text-[9px] font-extrabold text-red-400 rounded-lg transition-all uppercase tracking-wider active:scale-95"
                    >
                      Exit Game
                    </button>
                    <button
                      onClick={() => setShowGameBoard(false)}
                      className="p-1 text-slate-500 hover:text-white transition-colors"
                      title="Return to chat"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Game Body Pane */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto min-h-0 relative z-0">
                  {renderActiveGame()}
                </div>

              </div>
            ) : (
              <>

            {/* Messages Bubbles Flow */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#030303] to-[#07070c]/20 scrollbar-thin overscroll-contain will-change-transform transform-gpu">
              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 text-slate-700 text-[10px] font-bold uppercase select-none">
                  This is the start of your secure conversation history.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const isSystem = msg.sender_id === 'system';
                  const isAdmin = user?.is_admin || user?.is_top_admin;

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2 select-none">
                        <span className="text-[9px] bg-slate-950 border border-white/5 text-slate-550 font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                          {msg.body}
                        </span>
                      </div>
                    );
                  }

                  // Check if body contains secure media details
                  const secureMedia = parseMessageBody(msg.body);

                  return (
                    <div key={msg.id} id={`msg-${msg.id}`} className={`flex flex-col gap-1.5 max-w-[85%] ${isMe ? 'ml-auto items-end' : 'items-start'}`}>
                      
                      {/* Group Chat: sender name label */}
                      {activeConvo?.is_group && !isMe && (() => {
                        const member = activeConvo.members.find(m => m.id === msg.sender_id);
                        const displayName = member?.nickname 
                          ? `${member.nickname} (@${msg.username})`
                          : (msg.display_name || msg.username);
                        return (
                          <span 
                            onClick={() => onNavigate && onNavigate('profile', msg.username)}
                            className="text-[9px] font-bold text-slate-550 pl-11 select-none cursor-pointer hover:text-white transition-colors"
                          >
                            {displayName}
                          </span>
                        );
                      })()}

                      {/* Message Sender and Profile */}
                      <div className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        
                        {!isMe && (
                          <div 
                            onClick={() => onNavigate && onNavigate('profile', msg.username)}
                            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 text-[10px] font-bold text-slate-400 select-none mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            {msg.avatar_url ? (
                              <img src={`/api/media/file/${msg.avatar_url}`} alt={msg.username} className="w-full h-full object-cover" />
                            ) : (
                              msg.username.substring(0, 2).toUpperCase()
                            )}
                          </div>
                        )}

                        {/* Speech Bubble Container */}
                        <div className="flex flex-col">
                          
                          {/* Secure Media Rendering */}
                          {secureMedia ? (
                            <div className="space-y-1.5">
                              {secureMedia.media_type === 'voice' ? (
                                <AudioPlayer url={secureMedia.url} allowSave={secureMedia.allow_save || isAdmin} />
                              ) : secureMedia.media_type === 'image' ? (
                                <div 
                                  className="relative rounded-2xl overflow-hidden border border-white/[0.04] bg-[#020202] w-56 sm:w-64 max-w-xs shadow-md select-none"
                                  onContextMenu={(e) => !(secureMedia.allow_save || isAdmin) && e.preventDefault()}
                                >
                                  <img 
                                    src={`/api/media/file/${secureMedia.url}`} 
                                    alt="Secure media" 
                                    className={`w-full max-h-60 object-cover transition-all duration-300 ${
                                      !isMe && !secureMedia.allow_save && !revealedMessages[msg.id] && !isAdmin
                                        ? 'blur-xl scale-95 pointer-events-none'
                                        : ''
                                    }`}
                                    draggable={secureMedia.allow_save || isAdmin}
                                  />
                                  
                                  {/* Hold-to-reveal gesture blocker overlay (For Receiver only if protected) */}
                                  {!isMe && !secureMedia.allow_save && !isAdmin && (
                                    <div 
                                      className={`absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-opacity ${
                                        revealedMessages[msg.id] ? 'opacity-0 pointer-events-none' : 'opacity-100'
                                      }`}
                                      onMouseDown={() => setRevealedMessages(prev => ({ ...prev, [msg.id]: true }))}
                                      onMouseUp={() => setRevealedMessages(prev => ({ ...prev, [msg.id]: false }))}
                                      onMouseLeave={() => setRevealedMessages(prev => ({ ...prev, [msg.id]: false }))}
                                      onTouchStart={() => setRevealedMessages(prev => ({ ...prev, [msg.id]: true }))}
                                      onTouchEnd={() => setRevealedMessages(prev => ({ ...prev, [msg.id]: false }))}
                                    >
                                      <Lock className="w-5 h-5 text-brand-400 mb-1 animate-pulse" />
                                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Hold to View</span>
                                      <span className="text-[8px] text-slate-500 mt-1 select-none font-medium">Screenshots blocked</span>
                                    </div>
                                  )}
                                </div>
                              ) : secureMedia.media_type === 'video' ? (
                                // Video secure media
                                <div onClick={() => { if (secureMedia.allow_save || revealedMessages[msg.id] || isAdmin) { setActiveFullscreenVideo({ url: `/api/media/file/${secureMedia.url}`, allowSave: !!(secureMedia.allow_save || isAdmin) }); modalOpenTimeRef.current = Date.now(); } }} 
                                  className="relative rounded-2xl overflow-hidden border border-white/[0.04] bg-[#020202] w-56 sm:w-64 max-w-xs shadow-md select-none cursor-pointer"
                                  onContextMenu={(e) => !(secureMedia.allow_save || isAdmin) && e.preventDefault()}
                                >
                                  <video playsInline 
                                    src={`/api/media/file/${secureMedia.url}`} 
                                    className={`w-full max-h-60 object-cover transition-all duration-300 ${
                                      !isMe && !secureMedia.allow_save && !revealedMessages[msg.id] && !isAdmin
                                        ? 'blur-xl scale-95 pointer-events-none'
                                        : ''
                                    }`}
                                    controls={secureMedia.allow_save || revealedMessages[msg.id] || isAdmin}
                                    controlsList={secureMedia.allow_save || isAdmin ? "" : "nodownload"}
                                  />
                                   {/* Custom Maximize Button */}
                                   {(secureMedia.allow_save || revealedMessages[msg.id] || isAdmin) && (
                                     <button
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setActiveFullscreenVideo({
                                           url: `/api/media/file/${secureMedia.url}`,
                                           allowSave: !!(secureMedia.allow_save || isAdmin)
                                         });
                                         modalOpenTimeRef.current = Date.now();
                                       }}
                                       className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/85 text-white rounded-lg transition-all z-20 shadow border border-white/10 active:scale-95 flex items-center justify-center"
                                       title="Open in Fullscreen"
                                     >
                                       <Maximize2 className="w-3.5 h-3.5" />
                                     </button>
                                   )}
                                  
                                  {/* Hold-to-reveal gesture blocker overlay */}
                                  {!isMe && !secureMedia.allow_save && !isAdmin && (
                                    <div 
                                      className={`absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-opacity ${
                                        revealedMessages[msg.id] ? 'opacity-0 pointer-events-none' : 'opacity-100'
                                      }`}
                                      onMouseDown={() => setRevealedMessages(prev => ({ ...prev, [msg.id]: true }))}
                                      onMouseUp={() => setRevealedMessages(prev => ({ ...prev, [msg.id]: false }))}
                                      onMouseLeave={() => setRevealedMessages(prev => ({ ...prev, [msg.id]: false }))}
                                      onTouchStart={() => setRevealedMessages(prev => ({ ...prev, [msg.id]: true }))}
                                      onTouchEnd={() => setRevealedMessages(prev => ({ ...prev, [msg.id]: false }))}
                                    >
                                      <Lock className="w-5 h-5 text-brand-400 mb-1 animate-pulse" />
                                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Hold to View</span>
                                      <span className="text-[8px] text-slate-500 mt-1 select-none font-medium">Screenshots blocked</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // File secure media card
                                <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-white/[0.04] max-w-xs shadow-md select-none">
                                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                                    <Send className="w-5 h-5 transform rotate-[-25deg] translate-y-[-1px] text-brand-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate" title={secureMedia.file_name || 'Attached File'}>
                                      {secureMedia.file_name || 'Attached File'}
                                    </p>
                                    <a
                                      href={`/api/media/file/${secureMedia.url}`}
                                      download={secureMedia.file_name || 'file'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] font-black text-brand-400 hover:text-brand-350 uppercase tracking-wider block mt-1 hover:underline cursor-pointer"
                                    >
                                      Download File
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (() => {
                            const replyObj = parseReplyBody(msg.body);
                            return (
                              // Standard Text Message (or Reply)
                              <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                isMe 
                                  ? 'bg-brand-600 text-white rounded-tr-none' 
                                  : 'bg-slate-900/60 border border-white/[0.02] text-slate-200 rounded-tl-none'
                              }`}>
                                {replyObj && (
                                  <div 
                                    onClick={() => handleScrollToMessage(replyObj.reply_to.id)}
                                    className="mb-1.5 bg-white/[0.03] hover:bg-white/[0.06] border-l-2 border-brand-500 rounded-r-lg px-2.5 py-1.5 text-[10px] cursor-pointer transition-colors max-w-full overflow-hidden text-left"
                                  >
                                    <span className="font-extrabold text-brand-400 block mb-0.5">
                                      @{replyObj.reply_to.username}
                                    </span>
                                    <span className="text-slate-400 truncate block text-[10px]">
                                      {getReplyPreviewText(replyObj.reply_to.body)}
                                    </span>
                                  </div>
                                )}

                                {replyObj ? (
                                  <p>{replyObj.text}</p>
                                ) : msg.body.startsWith('[Shared Post] ') ? (() => {
                                  const parts = msg.body.substring(14).split(' | post_id: ');
                                  const textPart = parts[0];
                                  const username = textPart.split(':')[0].replace('@', '').trim();
                                  const caption = textPart.substring(textPart.indexOf(':') + 1).trim();

                                  return (
                                    <div className="bg-[#0b0c10]/95 border border-white/[0.04] p-3 rounded-2xl space-y-2.5 max-w-[200px] shadow-lg animate-fade-in select-none text-left">
                                      <div className="flex items-center gap-1.5">
                                        <img 
                                          src="/logo.png" 
                                          alt="DV" 
                                          className="w-5 h-5 object-contain flex-shrink-0"
                                        />
                                        <span className="text-[9px] font-black text-slate-400 tracking-wide uppercase">Shared Post</span>
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] font-extrabold text-white block">@{username}</span>
                                        <p className="text-[10px] text-slate-350 line-clamp-2 leading-relaxed italic">"{caption || 'Photo'}"</p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          const postId = parts[1]?.trim();
                                          if (postId) {
                                            window.history.pushState({}, document.title, `/?post=${postId}`);
                                            if (onNavigate) {
                                              onNavigate('feed_redirect');
                                            }
                                          } else {
                                            if (onNavigate) {
                                              onNavigate('profile', username);
                                            }
                                          }
                                        }}
                                        className="w-full py-1 bg-brand-500 hover:bg-brand-400 text-white text-[8px] font-black rounded-lg transition-all uppercase tracking-wider text-center cursor-pointer active:scale-95"
                                      >
                                        View Post
                                      </button>
                                    </div>
                                  );
                                })() : (
                                  <p>{msg.body}</p>
                                )}
                              </div>
                            );
                          })()}

                        </div>

                      </div>

                      {/* Action buttons (Toggles for sender, forward for receiver if allowed) */}
                      <div className={`flex items-center gap-3 px-1 text-[9px] font-extrabold text-slate-650 select-none ${isMe ? 'justify-end' : 'pl-10'}`}>
                        <span>{formatTime(msg.created_at)}</span>
                        
                        {/* Sender Control Toggles */}
                        {isMe && secureMedia && (
                          <div className="flex items-center gap-2 border-l border-white/[0.04] pl-2">
                            <button
                              type="button"
                              onClick={() => handleToggleAccess(msg.id, secureMedia.allow_save, secureMedia.allow_forward, 'save')}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
                                secureMedia.allow_save 
                                  ? 'text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10'
                                  : 'text-amber-500 bg-amber-500/5 hover:bg-amber-500/10'
                              }`}
                              title={secureMedia.allow_save ? "Revoke download access" : "Grant download access"}
                            >
                              {secureMedia.allow_save ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                              {secureMedia.allow_save ? 'Allow Save' : 'Block Save'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleAccess(msg.id, secureMedia.allow_save, secureMedia.allow_forward, 'forward')}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
                                secureMedia.allow_forward 
                                  ? 'text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10'
                                  : 'text-amber-500 bg-amber-500/5 hover:bg-amber-500/10'
                              }`}
                              title={secureMedia.allow_forward ? "Revoke forward access" : "Grant forward access"}
                            >
                              {secureMedia.allow_forward ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                              {secureMedia.allow_forward ? 'Allow Forward' : 'Block Forward'}
                            </button>
                          </div>
                        )}

                        {/* Unsend message button (only for sender or top admin) */}
                        {(isMe || user?.is_top_admin) && (
                          <button
                            type="button"
                            onClick={() => handleUnsend(msg.id)}
                            className="text-red-500/70 hover:text-red-400 flex items-center gap-0.5 transition-colors pl-2 border-l border-white/[0.04]"
                            title="Unsend this message"
                          >
                            Unsend
                          </button>
                        )}

                        {/* Receiver Forward Action (Only if sender allowed it or it is a standard text message) */}
                        {(!secureMedia || secureMedia.allow_forward) && (
                          <button
                            type="button"
                            onClick={() => {
                              setForwardingMessageBody(msg.body);
                              setShowForwardModal(true);
                            }}
                            className="text-slate-550 hover:text-white flex items-center gap-0.5 transition-colors"
                            title="Forward message"
                          >
                            <Forward className="w-3 h-3" />
                            Forward
                          </button>
                        )}

                        {/* Reply Action */}
                        <button
                          type="button"
                          onClick={() => handleInitiateReply(msg)}
                          className="text-slate-550 hover:text-white flex items-center gap-0.5 transition-colors pl-2 border-l border-white/[0.04]"
                          title="Reply to message"
                        >
                          <CornerUpLeft className="w-3 h-3" />
                          Reply
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form Box (Recording Waveform & Secure Uploader) */}
            <div className="p-3 border-t border-white/[0.04] bg-[#030303] z-20 shrink-0">
              
              {isRecording ? (
                // Recording Active state
                <div className="flex items-center justify-between bg-slate-950/80 border border-brand-500/20 rounded-xl px-4 py-2 animate-zoom">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span className="text-xs font-bold text-slate-350 tracking-wider">Recording Voice: {formatDuration(recordingDuration)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                      title="Discard audio"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="py-1 px-4 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black rounded-lg transition-all uppercase tracking-wider shadow"
                      title="Send Voice Note"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <ChatInput
                  onSend={handleSendMessage}
                  openCamera={openCamera}
                  uploadingMedia={uploadingMedia}
                  handleSelectMedia={handleSelectMedia}
                  startRecording={startRecording}
                  replyingToMessage={replyingToMessage}
                  onCancelReply={() => setReplyingToMessage(null)}
                />
              )}
            </div>
          </>
        )}
      </>
    ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-500">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-slate-200 font-extrabold text-sm uppercase tracking-wider">No Active Conversation</h3>
              <p className="text-xs text-slate-650 mt-1.5 leading-relaxed font-medium">
                Select a contact from the left list to open a chat session, or search for other registered usernames to start a new chat.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Camera Modal Overlay ────────────────────────────────────── */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-4 pb-6 md:p-8 select-none h-[100dvh]">
          
          {/* Header */}
          <div className="w-full max-w-md flex items-center justify-between py-2 z-10">
            <div className="flex bg-slate-900/80 p-0.5 rounded-full border border-white/[0.06]">
              <button
                onClick={() => { setCameraMode('photo'); }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  cameraMode === 'photo'
                    ? 'bg-white text-black shadow-md border-transparent'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                Photo
              </button>
              <button
                onClick={() => { setCameraMode('video'); }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  cameraMode === 'video'
                    ? 'bg-white text-black shadow-md border-transparent'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                Video
              </button>
            </div>
            <button onClick={closeCameraModal} className="p-2 rounded-full bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-white/[0.06]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview / Viewfinder */}
          <div className="w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden relative shadow-2xl mx-4 border border-white/[0.08] flex items-center justify-center">
            {capturedPreviewUrl ? (
              // Captured preview
              cameraMode === 'photo' ? (
                <img src={capturedPreviewUrl} className="w-full h-full object-cover" alt="Captured" />
              ) : (
                <video src={capturedPreviewUrl} controls playsInline className={`w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`} />
              )
            ) : (
              // Live viewfinder
              <video
                ref={setCameraVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
              />
            )}

            {/* Recording indicator */}
            {cameraRecording && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-600/90 backdrop-blur-md rounded-full px-3 py-1 border border-red-500/35">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">REC</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="w-full max-w-md flex flex-col items-center justify-center py-4">
            <div className="flex items-center justify-between w-full px-12 h-20">
              {capturedPreviewUrl ? (
                // Post-capture controls
                <>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(capturedPreviewUrl);
                      setCapturedBlob(null);
                      setCapturedPreviewUrl(null);
                      // Reopen camera stream
                      openCamera(cameraMode);
                    }}
                    className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-white transition-all shrink-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/[0.08] flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all">
                      <RotateCw className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">Retake</span>
                  </button>

                  <button
                    onClick={sendCameraCapture}
                    disabled={uploadingMedia}
                    className="flex flex-col items-center gap-1.5 text-white transition-all shrink-0"
                  >
                    <div className="w-16 h-16 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20 active:scale-[0.93] transition-all border border-brand-500/30">
                      {uploadingMedia ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5 translate-x-[1px] -translate-y-[1px]" />
                      )}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">Send</span>
                  </button>

                  {/* Balanced Spacer */}
                  <div className="w-12 h-12" />
                </>
              ) : (
                // Live capture controls
                <>
                  {/* Balanced Spacer */}
                  <div className="w-12 h-12" />

                  {cameraMode === 'photo' ? (
                    // Photo shutter
                    <button
                      onClick={takePhoto}
                      className="w-16 h-16 rounded-full bg-white hover:bg-slate-200 border-4 border-slate-900 flex items-center justify-center shadow-2xl active:scale-90 transition-all shrink-0"
                    >
                      <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center" />
                    </button>
                  ) : (
                    // Video record toggle
                    <button
                      onClick={cameraRecording ? stopCameraRecording : startCameraRecording}
                      className={`w-16 h-16 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-2xl active:scale-90 transition-all shrink-0 ${
                        cameraRecording
                          ? 'bg-red-650'
                          : 'bg-white'
                      }`}
                    >
                      {cameraRecording ? (
                        <div className="w-5 h-5 rounded-md bg-white" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-red-600" />
                      )}
                    </button>
                  )}

                  {/* Flip camera button */}
                  <button
                    onClick={toggleCameraFacing}
                    className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-white transition-all shrink-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/[0.08] flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all">
                      <RotateCw className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">Flip</span>
                  </button>
                </>
              )}
            </div>

            {/* Bottom hint */}
            {!capturedPreviewUrl && (
              <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {cameraMode === 'photo' ? 'Tap to capture photo' : cameraRecording ? 'Tap to stop recording' : 'Tap to start recording'}
              </p>
            )}
          </div>
        </div>
      )}

    </div>

      {/* ─── Create Group Modal ───────────────────────────────────────────────── */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c10] border border-white/[0.06] rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">New Group Chat</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Add a name and members to start</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCreateGroup(false); setGroupName(''); setGroupMemberSearch(''); setGroupSelectedMembers([]); setGroupMemberResults([]); }}
                className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
              
              {/* Group Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Friday Squad, Design Team..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
                  maxLength={60}
                />
              </div>

              {/* Member Search */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Members</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="text"
                    placeholder="Search username..."
                    value={groupMemberSearch}
                    onChange={(e) => setGroupMemberSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
                  />
                </div>

                {/* Search Results */}
                {(groupSearching || groupMemberResults.length > 0) && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-40 overflow-y-auto scrollbar-thin">
                    {groupSearching ? (
                      <div className="flex justify-center p-3">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                      </div>
                    ) : (
                      groupMemberResults.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => { setGroupSelectedMembers(prev => [...prev, u]); setGroupMemberSearch(''); setGroupMemberResults([]); }}
                          className="flex items-center gap-3 p-3 hover:bg-slate-900 cursor-pointer transition-colors border-b border-white/[0.03] last:border-0"
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 text-[10px] font-bold text-slate-400">
                            {u.avatar_url ? (
                              <img src={`/api/media/file/${u.avatar_url}`} alt={u.username} className="w-full h-full object-cover" />
                            ) : (
                              u.username.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{u.display_name || u.username}</p>
                            <p className="text-[10px] text-slate-500">@{u.username}</p>
                          </div>
                          <UserPlus className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Members */}
              {groupSelectedMembers.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Selected ({groupSelectedMembers.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {groupSelectedMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-1.5 bg-brand-600/15 border border-brand-600/25 text-brand-300 rounded-full pl-2 pr-1 py-1 text-[11px] font-bold"
                      >
                        <span>{m.display_name || m.username}</span>
                        <button
                          type="button"
                          onClick={() => setGroupSelectedMembers(prev => prev.filter(x => x.id !== m.id))}
                          className="w-4 h-4 rounded-full bg-brand-600/30 hover:bg-brand-600/60 flex items-center justify-center transition-all"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-white/[0.05]">
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || groupSelectedMembers.length === 0 || creatingGroup}
                className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-brand-500/15 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {creatingGroup ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating Group...</>
                ) : (
                  <><Users className="w-4 h-4" /> Create Group{groupSelectedMembers.length > 0 ? ` · ${groupSelectedMembers.length + 1} members` : ''}</>
                )}
              </button>
              {groupSelectedMembers.length === 0 && (
                <p className="text-center text-[10px] text-slate-600 mt-2 font-medium">Add at least 1 member to create a group</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── Group Members Modal ───────────────────────────────────────────────── */}
      {showMembersModal && activeConvo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c10] border border-white/[0.06] rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Group Members</h3>
                  <p className="text-[10px] text-slate-500 font-medium">{activeConvo.members.length} participants</p>
                </div>
              </div>
              <button
                onClick={() => { setShowMembersModal(false); setEditingMemberId(null); setNewNickname(''); }}
                className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
              {activeConvo.members.map((member) => {
                const isMemberAdmin = activeConvo.creator_id === member.id;
                const isMe = member.id === user?.id;
                const amIAdmin = activeConvo.creator_id === user?.id;
                const canKick = amIAdmin && !isMe;
                const canEditNickname = isMe || amIAdmin;

                return (
                  <div key={member.id} className="flex items-center justify-between gap-3 p-3 bg-slate-950/40 border border-white/[0.02] rounded-2xl">
                    
                    {/* User Avatar & Info wrapper clickable */}
                    <div 
                      onClick={() => {
                        setShowMembersModal(false);
                        if (onNavigate) {
                          onNavigate('profile', member.username);
                        }
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {/* User Avatar */}
                      <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 text-xs font-bold text-slate-400">
                        {member.avatar_url ? (
                          <img src={`/api/media/file/${member.avatar_url}`} alt={member.username} className="w-full h-full object-cover" />
                        ) : (
                          member.username.substring(0, 2).toUpperCase()
                        )}
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {member.display_name || member.username}
                          </span>
                          {isMemberAdmin && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-brand-400">
                              Admin
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-450 border border-white/5">
                              You
                            </span>
                          )}
                        </div>
                        
                        <div className="text-[10px] text-slate-500">@{member.username}</div>
                        
                        {/* Nickname display */}
                        {editingMemberId === member.id ? (
                          <div className="flex gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              placeholder="Set custom nickname..."
                              value={newNickname}
                              onChange={(e) => setNewNickname(e.target.value)}
                              className="flex-1 bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-colors"
                              maxLength={30}
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateNickname(member.id, newNickname)}
                              className="px-2.5 py-1 bg-brand-650 hover:bg-brand-600 text-white rounded-lg text-[10px] font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingMemberId(null); setNewNickname(''); }}
                              className="p-1 text-slate-500 hover:text-white rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          member.nickname && (
                            <div className="text-[10px] font-semibold text-brand-400 mt-1">
                              Nickname: <span className="text-slate-300">"{member.nickname}"</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    {/* Actions (Kick / Edit Nickname) */}
                    {editingMemberId !== member.id && (
                      <div className="flex items-center gap-2">
                        {canEditNickname && (
                          <button
                            onClick={() => { setEditingMemberId(member.id); setNewNickname(member.nickname || ''); }}
                            className="text-[10px] font-bold text-slate-450 hover:text-white px-2 py-1 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-lg transition-all"
                            title="Edit Nickname"
                          >
                            Nickname
                          </button>
                        )}
                        {canKick && (
                          <button
                            onClick={() => handleKickMember(member.id)}
                            className="p-2 bg-red-500/5 hover:bg-red-500/10 text-red-500/70 hover:text-red-400 border border-red-950/30 hover:border-red-900/50 rounded-lg transition-all"
                            title="Kick member"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ─── Forward Message Modal ─────────────────────────────────────────────── */}
      {showForwardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c10] border border-white/[0.06] rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center">
                  <Forward className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Forward Message</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Select a chat to forward this message to</p>
                </div>
              </div>
              <button
                onClick={() => { setShowForwardModal(false); setForwardingMessageBody(null); }}
                className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chats List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin">
              {conversations.length === 0 ? (
                <div className="text-center py-10 text-slate-650 text-xs font-semibold">
                  No active chats found.
                </div>
              ) : (
                conversations.map((convo) => {
                  const partner = !convo.is_group ? convo.members.find(m => m.id !== user?.id) : null;
                  const chatName = convo.is_group 
                    ? (convo.group_name || 'Group Chat')
                    : (partner?.display_name || partner?.username || 'Unknown Chat');
                  const avatarUrl = convo.is_group ? null : partner?.avatar_url;

                  return (
                    <div key={convo.id} className="flex items-center justify-between gap-3 p-3 bg-slate-950/40 border border-white/[0.02] rounded-2xl">
                      
                      {/* Chat Avatar */}
                      <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 text-xs font-bold text-slate-400">
                        {convo.is_group ? (
                          <Users className="w-4 h-4 text-brand-400" />
                        ) : avatarUrl ? (
                          <img src={`/api/media/file/${avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          chatName.substring(0, 2).toUpperCase()
                        )}
                      </div>

                      {/* Chat details */}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-white truncate block">
                          {chatName}
                        </span>
                        {convo.is_group && (
                          <span className="text-[8px] text-slate-550 font-bold uppercase tracking-wider block mt-0.5">{convo.members.length} members</span>
                        )}
                        {!convo.is_group && partner?.username && (
                          <span className="text-[9px] text-slate-550 truncate block mt-0.5">@{partner.username}</span>
                        )}
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => handleSelectForwardTarget(convo)}
                        className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95"
                      >
                        <Send className="w-3 h-3" />
                        Send
                      </button>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── Game Selector Modal ────────────────────────────────────────── */}
      {showGameSelectorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c10] border border-white/[0.06] rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gamepad2 className="w-5 h-5 text-brand-400" />
                <h3 className="text-sm font-black text-white">Select Game to Play</h3>
              </div>
              <button
                onClick={() => setShowGameSelectorModal(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Games Grid */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-4 scrollbar-thin">
              {[
                { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', desc: 'Classic 3x3 alignment game', icon: <Grid className="w-6 h-6 text-brand-400" />, multiplayer: true },
                { id: 'chess', name: 'Chess Sandbox', desc: 'Sandbox Chess board to play 1v1', icon: <Crown className="w-6 h-6 text-yellow-500" />, multiplayer: true },
                { id: 'rps', name: 'Rock Paper Scissors', desc: 'Classic choice battle', icon: <Flame className="w-6 h-6 text-red-400" />, multiplayer: true },
                { id: 'higher-lower', name: 'Higher or Lower', desc: 'Card guessing streak challenge', icon: <Club className="w-6 h-6 text-purple-400" />, multiplayer: false },
                { id: 'whack-a-mole', name: 'Whack-a-Mole', desc: 'Test your reaction times', icon: <Target className="w-6 h-6 text-emerald-400" />, multiplayer: false },
                { id: 'coin-toss', name: 'Coin Toss', desc: 'Simple Heads/Tails decider', icon: <Coins className="w-6 h-6 text-amber-400" />, multiplayer: true },
                { id: 'spin-wheel', name: 'Spin the Wheel', desc: 'Submit a question & spin to pick', icon: <CircleDot className="w-6 h-6 text-blue-400" />, multiplayer: true },
                { id: 'car-racing', name: 'Car Racing', desc: 'Dodge traffic & survive longest!', icon: <span className="text-2xl leading-none">ðŸŽï¸</span>, multiplayer: false },
              ].map(game => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleStartSelectedGame(game.id)}
                  className="bg-slate-950/60 border border-white/[0.03] hover:border-brand-500/35 hover:bg-brand-500/[0.02] p-4 rounded-2xl flex flex-col items-start text-left gap-3 transition-all active:scale-[0.98] group"
                >
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl group-hover:bg-brand-650/10 group-hover:border-brand-500/20 transition-all">
                    {game.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      {game.name}
                      {game.multiplayer ? (
                        <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-brand-550/10 text-brand-400">1v1 Sync</span>
                      ) : (
                        <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-800 text-slate-455">Local</span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium leading-relaxed">{game.desc}</p>
                  </div>
                </button>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* FULLSCREEN VIDEO MODAL */}
      {activeFullscreenVideo && (
        <div className="fixed inset-0 bg-black/95 z-[999] flex flex-col items-center justify-center animate-fade-in select-none">
          <button
            type="button"
            onClick={() => { if (Date.now() - modalOpenTimeRef.current > 400) { setActiveFullscreenVideo(null); } }}
            className="absolute top-4 right-4 p-2.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl transition-colors border border-white/10 z-[1000] active:scale-95 flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
          
          <video
            src={activeFullscreenVideo.url}
            autoPlay
            controls
            playsInline
            controlsList={activeFullscreenVideo.allowSave ? "" : "nodownload"}
            onContextMenu={(e) => !activeFullscreenVideo.allowSave && e.preventDefault()}
            className="w-full h-full max-h-screen object-contain"
          />
        </div>
      )}

    </>
  );
};

export default Chat;
