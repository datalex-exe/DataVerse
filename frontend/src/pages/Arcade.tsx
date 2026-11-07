import React, { useState, useRef, useEffect } from 'react';
import { 
  Gamepad2, 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Swords, 
  Users, 
  Send, 
  X, 
  Check,
  Loader2,
  Play,
  ShieldCheck,
  Trophy,
  Flame,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Retro8BitSuite } from '../components/Retro8BitSuite';

interface ArcadeProps {
  onNavigate: (view: string, param?: string) => void;
  initialParam?: string;
}

interface ChatContact {
  id: string;
  conversationId: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  is_online?: boolean;
}

interface GameItem {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  multiplayer: boolean;
}

// ONLY true 2-player multiplayer games under "Play with Friends"
const MULTIPLAYER_GAMES: GameItem[] = [
  { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', desc: 'Classic 3x3 alignment battle', emoji: '❌⭕', multiplayer: true },
  { id: 'chess', name: 'Sandbox Chess', desc: 'Move pieces and capture kings', emoji: '♟️', multiplayer: true },
  { id: 'rps', name: 'Rock Paper Scissors', desc: 'Hidden choices, real-time reveal', emoji: '✊✋✌️', multiplayer: true },
  { id: 'memory-match', name: 'Memory Match', desc: 'Turn cards to find emoji pairs', emoji: '🃏', multiplayer: true },
  { id: 'spin-wheel', name: 'Spin Wheel', desc: 'Spin & decide together in real-time', emoji: '🎡', multiplayer: true },
];

// Offline solo games switched to "Solo Retro"
const SOLO_RETRO_GAMES = [
  { id: '8bit-suite', name: '8-Bit Retro Suite', desc: 'Runner, Snake, Flappy & Breakout', emoji: '🕹️' },
  { id: 'higher-lower', name: 'Higher or Lower', desc: 'Predict card values & build streaks', emoji: '🎴' },
  { id: 'whack-a-mole', name: 'Whack-a-Mole', desc: '30s speed reaction tap challenge', emoji: '🐹' },
  { id: 'coin-toss', name: 'Coin Toss', desc: '3D coin flip physics & decision picker', emoji: '🪙' },
  { id: 'spin-wheel', name: 'Spin Wheel', desc: 'Customizable random picker wheel', emoji: '🎡' },
];

const pieceUnicode: Record<string, string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
};


// Helper to safely format media and avatar URLs
const getAvatarSrc = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
    return url;
  }
  return `/api/media/file/${url}`;
};

interface ArcadeAvatarProps {
  url?: string | null;
  name: string;
  size?: string;
  rounded?: string;
  className?: string;
}

const ArcadeAvatar: React.FC<ArcadeAvatarProps> = ({
  url,
  name,
  size = 'w-9 h-9',
  rounded = 'rounded-xl',
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);
  const src = getAvatarSrc(url);

  if (!src || hasError) {
    const initial = (name || 'P').trim().substring(0, 2).toUpperCase();
    return (
      <div 
        className={`${size} ${rounded} bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm select-none ${className}`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div className={`${size} ${rounded} overflow-hidden bg-slate-900 border border-white/10 flex-shrink-0 shadow-sm relative ${className}`}>
      <img
        src={src}
        alt=""
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export const Arcade: React.FC<ArcadeProps> = ({ onNavigate, initialParam }) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'retro' | 'multiplayer'>('retro');
  const [selectedSoloGame, setSelectedSoloGame] = useState<string>('8bit-suite');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Contacts from recent chats for multiplayer challenges
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Challenge modal
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [selectedGameType, setSelectedGameType] = useState('tic-tac-toe');
  const [isSendingChallenge, setIsSendingChallenge] = useState(false);

  // Active multiplayer game session
  const [activeSession, setActiveSession] = useState<{
    conversationId: string;
    gameType: string;
    opponentId?: string;
    opponentName?: string;
    opponentAvatar?: string | null;
  } | null>(null);

  const [gameState, setGameState] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Chess square selection
  const [selectedChessSquare, setSelectedChessSquare] = useState<number | null>(null);

  // 100% OFFLINE SOLO GAMES STATE & LOCALSTORAGE PERSISTENCE
  // Higher-Lower
  const [hlCard, setHlCard] = useState<{ suit: string; value: number; label: string } | null>(null);
  const [hlScore, setHlScore] = useState(0);
  const [hlStreak, setHlStreak] = useState(0);
  const [hlBestScore, setHlBestScore] = useState(() => {
    try { return parseInt(localStorage.getItem('arcade_offline_hl_best') || '0', 10); } catch { return 0; }
  });
  const [hlGameOver, setHlGameOver] = useState(false);

  // Whack-a-Mole
  const [moleScore, setMoleScore] = useState(0);
  const [moleBestScore, setMoleBestScore] = useState(() => {
    try { return parseInt(localStorage.getItem('arcade_offline_mole_best') || '0', 10); } catch { return 0; }
  });
  const [moleTimeLeft, setMoleTimeLeft] = useState(30);
  const [moleActiveIndex, setMoleActiveIndex] = useState<number | null>(null);
  const [moleIsPlaying, setMoleIsPlaying] = useState(false);
  const moleTimerRef = useRef<any>(null);

  // Coin Toss
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [coinHistory, setCoinHistory] = useState<Array<'heads' | 'tails'>>([]);

  // Spin Wheel
  const [wheelSegments, setWheelSegments] = useState<string[]>([
    'Coffee ☕', 'Pizza 🍕', 'Gaming 🎮', 'Walk 🚶', 'Code 💻', 'Sleep 😴'
  ]);
  const [wheelNewOption, setWheelNewOption] = useState('');
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelWinner, setWheelWinner] = useState<string | null>(null);

  // Parse initial navigation parameters (e.g. from Chat or Game Challenge Pop-up)
  useEffect(() => {
    if (initialParam) {
      try {
        const parsed = JSON.parse(initialParam);
        if (parsed.conversationId) {
          setActiveTab('multiplayer');
          setActiveSession({
            conversationId: parsed.conversationId,
            gameType: parsed.gameType || 'tic-tac-toe',
            opponentId: parsed.opponentId,
            opponentName: parsed.opponentName,
            opponentAvatar: parsed.opponentAvatar
          });
        }
      } catch {
        if (!initialParam.startsWith('{')) {
          setActiveTab('multiplayer');
        }
      }
    }
  }, [initialParam]);

  // Fetch recent chat contacts for multiplayer
  const fetchContacts = async (silent = false) => {
    if (!token) return;
    if (!silent) setLoadingContacts(true);
    try {
      const res = await fetch('/api/conversations?t=' + Date.now(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const convos = data.conversations || [];
        const contactList: ChatContact[] = [];
        const seenUserIds = new Set<string>();
        const onlineIds = new Set<string>();

        for (const c of convos) {
          if (c.is_group) continue;
          const other = (c.members || []).find((m: any) => m.id !== user?.id);
          if (other && !seenUserIds.has(other.id)) {
            seenUserIds.add(other.id);
            const isOnline = Boolean(other.is_online);
            if (isOnline) onlineIds.add(other.id);
            contactList.push({
              id: other.id,
              conversationId: c.id,
              username: other.username,
              display_name: other.display_name || other.username,
              avatar_url: other.avatar_url,
              is_online: isOnline
            });
          }
        }
        setContacts(contactList);
        setOnlineUserIds(prev => {
          const merged = new Set(prev);
          onlineIds.forEach(id => merged.add(id));
          return merged;
        });
      }
    } catch {
      // Ignore
    } finally {
      if (!silent) setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (!token || (activeTab !== 'multiplayer' && !showChallengeModal)) {
      return undefined;
    }
    fetchContacts(false);
    const interval = setInterval(() => {
      fetchContacts(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, showChallengeModal, token]);

  // Connect to active game session WebSocket for Multiplayer
  useEffect(() => {
    if (!activeSession || !user || !token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/chat/ws/${activeSession.conversationId}?userId=${user.id}&token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'get_game_state' }));
      ws.send(JSON.stringify({ type: 'get_presence' }));
      if (activeSession.gameType) {
        ws.send(JSON.stringify({ type: 'game_invite', gameType: activeSession.gameType }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'game_state') {
          setGameState(data.game);
        }
        if (data.type === 'presence_state') {
          const list = data.onlineUsers || data.userIds || [];
          if (Array.isArray(list)) {
            setOnlineUserIds(prev => {
              const next = new Set(prev);
              list.forEach((id: string) => next.add(id));
              return next;
            });
          }
        }
        if (data.type === 'user_presence') {
          setOnlineUserIds(prev => {
            const next = new Set(prev);
            if (data.status === 'online') next.add(data.userId);
            else next.delete(data.userId);
            return next;
          });
        }
      } catch {}
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [activeSession, user, token]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const reloadRetroGame = () => {
    if (iframeRef.current) {
      iframeRef.current.src = '/arcade-offline.html?t=' + Date.now();
    }
  };

  // Send multiplayer challenge to a friend
  const handleSendChallenge = async () => {
    if (!selectedContact || !token) return;
    setIsSendingChallenge(true);
    try {
      const res = await fetch('/api/arcade/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId: selectedContact.id,
          conversationId: selectedContact.conversationId,
          gameType: selectedGameType
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`🎮 Challenge sent to ${selectedContact.display_name}!`, 'success');
        setShowChallengeModal(false);

        // Open multiplayer room in Arcade
        setActiveSession({
          conversationId: data.conversationId,
          gameType: selectedGameType,
          opponentId: selectedContact.id,
          opponentName: selectedContact.display_name,
          opponentAvatar: selectedContact.avatar_url
        });
      } else {
        showToast('Failed to send challenge', 'error');
      }
    } catch {
      showToast('Network error sending challenge', 'error');
    } finally {
      setIsSendingChallenge(false);
    }
  };

  // Multiplayer Game Control Helpers
  const handleMakeMove = (cellIndex: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'game_move', index: cellIndex }));
    }
  };

  const handleResetGame = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'game_reset' }));
    }
    setSelectedChessSquare(null);
  };

  const handleCloseSession = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'game_close' }));
    }
    setActiveSession(null);
    setGameState(null);
    setSelectedChessSquare(null);
  };

  // Chess Move Validation
  const isValidChessMove = (fromIdx: number, toIdx: number, piece: string, board: (string | null)[]) => {
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
      if (isPieceUpper === isTargetUpper) return false;
    }
    
    const pieceType = piece.toLowerCase();
    
    if (pieceType === 'p') {
      const direction = piece === 'P' ? -1 : 1;
      const startRow = piece === 'P' ? 6 : 1;
      if (colDiff === 0 && rowDiff === direction) return targetPiece === null;
      if (colDiff === 0 && rowDiff === 2 * direction && fromRow === startRow) {
        const intermediateIdx = fromIdx + direction * 8;
        return targetPiece === null && board[intermediateIdx] === null;
      }
      if (Math.abs(colDiff) === 1 && rowDiff === direction) return targetPiece !== null;
      return false;
    }
    
    if (pieceType === 'r') {
      if (rowDiff !== 0 && colDiff !== 0) return false;
      const rowStep = rowDiff === 0 ? 0 : (rowDiff > 0 ? 1 : -1);
      const colStep = colDiff === 0 ? 0 : (colDiff > 0 ? 1 : -1);
      let currRow = fromRow + rowStep;
      let currCol = fromCol + colStep;
      while (currRow !== toRow || currCol !== toCol) {
        if (board[currRow * 8 + currCol] !== null) return false;
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
        if (board[currRow * 8 + currCol] !== null) return false;
        currRow += rowStep;
        currCol += colStep;
      }
      return true;
    }
    
    if (pieceType === 'q') {
      const isRook = rowDiff === 0 || colDiff === 0;
      const isBishop = Math.abs(rowDiff) === Math.abs(colDiff);
      if (!isRook && !isBishop) return false;
      const rowStep = rowDiff === 0 ? 0 : (rowDiff > 0 ? 1 : -1);
      const colStep = colDiff === 0 ? 0 : (colDiff > 0 ? 1 : -1);
      let currRow = fromRow + rowStep;
      let currCol = fromCol + colStep;
      while (currRow !== toRow || currCol !== toCol) {
        if (board[currRow * 8 + currCol] !== null) return false;
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
    if (!gameState || !user || gameState.status !== 'playing') return;

    const isPlayerWhite = user.id === gameState.playerX;
    const isPlayerBlack = user.id === gameState.playerO;
    const currentTurn = gameState.turn || gameState.playerX;
    const isMyTurn = currentTurn === user.id || (isPlayerWhite && !gameState.playerO);

    // Only allow moves when it is my turn
    if (!isMyTurn) return;

    // Only allow selecting/moving pieces belonging to player's assigned color
    const isMyPiece = (p: string | null) => {
      if (!p) return false;
      if (isPlayerWhite) return p === p.toUpperCase();
      if (isPlayerBlack) return p === p.toLowerCase();
      return p === p.toUpperCase();
    };

    const clickedPiece = gameState.chessBoard?.[squareIdx] || null;

    if (selectedChessSquare === null) {
      if (isMyPiece(clickedPiece)) {
        setSelectedChessSquare(squareIdx);
      }
    } else {
      if (selectedChessSquare === squareIdx) {
        setSelectedChessSquare(null);
        return;
      }
      if (isMyPiece(clickedPiece)) {
        setSelectedChessSquare(squareIdx);
        return;
      }

      const nextBoard = [...(gameState.chessBoard || Array(64).fill(null))];
      const movingPiece = nextBoard[selectedChessSquare];
      
      if (!movingPiece || !isValidChessMove(selectedChessSquare, squareIdx, movingPiece, nextBoard)) {
        return;
      }
      
      let status = gameState.status;
      let winner = gameState.winner;
      const targetPiece = nextBoard[squareIdx];
      let turn = gameState.turn;

      // Capture King to win
      if (targetPiece && targetPiece.toLowerCase() === 'k') {
        status = 'won';
        winner = user.id;
        turn = null;
      } else {
        turn = isPlayerWhite ? gameState.playerO : gameState.playerX;
      }

      nextBoard[selectedChessSquare] = null;
      nextBoard[squareIdx] = movingPiece;

      const updatedGame = {
        ...gameState,
        chessBoard: nextBoard,
        lastChessMove: { from: selectedChessSquare, to: squareIdx },
        status,
        winner,
        turn
      };

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'game_update', game: updatedGame }));
      }
      setSelectedChessSquare(null);
    }
  };

  // Rock Paper Scissors
  const handleRpsChoice = (choice: 'rock' | 'paper' | 'scissors') => {
    if (!gameState || !user || !wsRef.current) return;
    const moves = { ...(gameState.rpsPlayerMoves || {}) };
    moves[user.id] = choice;
    const opponentId = user.id === gameState.playerX ? gameState.playerO : gameState.playerX;
    
    let status = gameState.status;
    let winner = gameState.winner;
    let turn = gameState.turn;

    if (opponentId && moves[opponentId]) {
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
    }

    const updated = {
      ...gameState,
      status,
      winner,
      turn,
      rpsPlayerMoves: moves
    };

    wsRef.current.send(JSON.stringify({ type: 'game_update', game: updated }));
  };

  // Memory Match
  const handleMemoryCardClick = (idx: number) => {
    if (!gameState || !user || gameState.status !== 'playing' || gameState.turn !== user.id) return;
    const currentUserId = user.id;
    const cards = [...(gameState.memoryCards || [])];
    const selected = [...(gameState.memorySelected || [])];
    if (cards[idx].isFlipped || cards[idx].isMatched || selected.length >= 2) return;

    cards[idx].isFlipped = true;
    selected.push(idx);

    if (selected.length === 2) {
      const first = cards[selected[0]];
      const second = cards[selected[1]];
      const isMatch = first.symbol === second.symbol;

      const scores = { ...(gameState.memoryScores || {}) };
      if (isMatch) {
        first.isMatched = true;
        second.isMatched = true;
        scores[currentUserId] = (scores[currentUserId] || 0) + 1;
      }

      const allMatched = cards.every(c => c.isMatched);
      const opponentId = currentUserId === gameState.playerX ? gameState.playerO : gameState.playerX;
      let status = gameState.status;
      let winner = gameState.winner;

      if (allMatched) {
        const myScore = scores[currentUserId] || 0;
        const oppScore = scores[opponentId || ''] || 0;
        status = myScore === oppScore ? 'draw' : 'won';
        winner = myScore > oppScore ? currentUserId : opponentId;
      }

      const updated = {
        ...gameState,
        memoryCards: cards,
        memorySelected: selected,
        memoryScores: scores,
        status,
        winner,
        turn: isMatch ? currentUserId : opponentId
      };

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'game_update', game: updated }));
      }

      setTimeout(() => {
        if (!isMatch) {
          first.isFlipped = false;
          second.isFlipped = false;
        }
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'game_update',
            game: { ...updated, memoryCards: cards, memorySelected: [] }
          }));
        }
      }, 1000);
    } else {
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'game_update',
          game: { ...gameState, memoryCards: cards, memorySelected: selected }
        }));
      }
    }
  };

  // 100% OFFLINE SOLO GAME HANDLERS
  // Higher-Lower
  const drawCard = () => {
    const suits = ['♥', '♦', '♣', '♠'];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = Math.floor(Math.random() * 13) + 1;
    const labels = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    return { suit, value, label: `${labels[value - 1]} of ${suit}` };
  };

  const handleHlStart = () => {
    const first = drawCard();
    setHlCard(first);
    setHlScore(0);
    setHlStreak(0);
    setHlGameOver(false);
  };

  const handleHlGuess = (guess: 'higher' | 'lower') => {
    if (!hlCard || hlGameOver) return;
    const next = drawCard();
    const isCorrect = guess === 'higher' ? next.value >= hlCard.value : next.value <= hlCard.value;
    setHlCard(next);
    if (isCorrect) {
      const nextScore = hlScore + 10;
      const nextStreak = hlStreak + 1;
      setHlScore(nextScore);
      setHlStreak(nextStreak);
      if (nextScore > hlBestScore) {
        setHlBestScore(nextScore);
        try { localStorage.setItem('arcade_offline_hl_best', String(nextScore)); } catch {}
      }
    } else {
      setHlGameOver(true);
    }
  };

  // Whack-a-Mole
  const startWhackAMole = () => {
    setMoleScore(0);
    setMoleTimeLeft(30);
    setMoleIsPlaying(true);
    if (moleTimerRef.current) clearInterval(moleTimerRef.current);
    moleTimerRef.current = setInterval(() => {
      setMoleTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(moleTimerRef.current);
          setMoleIsPlaying(false);
          setMoleActiveIndex(null);
          return 0;
        }
        return prev - 1;
      });
      setMoleActiveIndex(Math.floor(Math.random() * 9));
    }, 700);
  };

  const handleWhackMole = (idx: number) => {
    if (idx === moleActiveIndex && moleIsPlaying) {
      const newScore = moleScore + 1;
      setMoleScore(newScore);
      if (newScore > moleBestScore) {
        setMoleBestScore(newScore);
        try { localStorage.setItem('arcade_offline_mole_best', String(newScore)); } catch {}
      }
      setMoleActiveIndex(null);
    }
  };

  // Coin Toss
  const handleCoinToss = (prediction: 'heads' | 'tails') => {
    if (coinFlipping) return;
    setCoinFlipping(true);
    setCoinResult(null);
    setTimeout(() => {
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      setCoinResult(result);
      setCoinHistory(prev => [result, ...prev.slice(0, 9)]);
      setCoinFlipping(false);
      if (result === prediction) {
        showToast(`Correct prediction: ${prediction.toUpperCase()}! 👑`, 'success');
      }
    }, 1100);
  };

  const WHEEL_COLORS = [
    '#0d9488', // Teal
    '#6366f1', // Indigo
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#3b82f6', // Sky Blue
    '#ef4444', // Red
    '#84cc16', // Lime
    '#d946ef', // Fuchsia
    '#14b8a6', // Light Teal
    '#eab308', // Yellow
    '#a855f7', // Violet
    '#22c55e', // Green
  ];

  // Pick cryptographically strong pseudo-random index
  const getCryptoRandomIndex = (len: number): number => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] % len;
    }
    return Math.floor(Math.random() * len);
  };

  // Reusable SVG Wheel renderer with visible slice labels & glowing rim
  const renderSvgWheel = (segments: string[], rotationDeg: number) => {
    const size = 320;
    const center = size / 2; // 160
    const radius = 138;
    const n = segments.length;

    return (
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center select-none">
        {/* Static Ambient Glow Layer */}
        <div className="absolute inset-2 rounded-full bg-teal-500/15 blur-xl pointer-events-none" />
        {/* Top Fixed Needle Pointer (Fixed at 12 o'clock, OUTSIDE rotating wheel) */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
          <div className="w-4 h-5 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 rounded-t-md shadow-md border-t border-x border-amber-200/50" />
          <div className="w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[18px] border-t-amber-500" />
        </div>

        {/* Rotating Wheel Body: Continuous cumulative rotation, never resets */}
        <div 
          className="w-full h-full rounded-full will-change-transform"
          style={{ 
            transform: `rotate(${rotationDeg}deg)`,
            transition: 'transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
          }}
        >
          <svg 
            viewBox={`0 0 ${size} ${size}`} 
            className="w-full h-full"
          >
            <defs>
              <radialGradient id="wheelCenterHub" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="60%" stopColor="#0f766e" />
                <stop offset="100%" stopColor="#042f2e" />
              </radialGradient>
              <linearGradient id="wheelRimGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>

            {/* Empty State when 0 options */}
            {n === 0 && (
              <g>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="#081e22"
                  stroke="#2dd4bf"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
                <text
                  x={center}
                  y={center - 8}
                  fill="#5eead4"
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Empty Wheel (0)
                </text>
                <text
                  x={center}
                  y={center + 14}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="middle"
                >
                  Add choices below to spin
                </text>
              </g>
            )}

            {/* Single Option (1 Slice = Full Disc) */}
            {n === 1 && (
              <g>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill={WHEEL_COLORS[0]}
                  stroke="#040b0d"
                  strokeWidth="2.5"
                />
                <text
                  x={center}
                  y={center - 38}
                  fill="#ffffff"
                  fontSize="13"
                  fontWeight="900"
                  textAnchor="middle"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                >
                  {segments[0].length > 15 ? segments[0].substring(0, 14) + '…' : segments[0]}
                </text>
              </g>
            )}

            {/* Multiple Slices: Slice i spans [i*sliceAngle, (i+1)*sliceAngle) measured clockwise from top (where pointer sits) */}
            {n >= 2 && segments.map((opt, i) => {
              const sliceAngle = 360 / n;
              const angleRad1 = (i * sliceAngle) * (Math.PI / 180);
              const angleRad2 = ((i + 1) * sliceAngle) * (Math.PI / 180);
              // Clockwise from 12 o'clock (top): x = center + r*sin(θ), y = center - r*cos(θ)
              const x1 = center + radius * Math.sin(angleRad1);
              const y1 = center - radius * Math.cos(angleRad1);
              const x2 = center + radius * Math.sin(angleRad2);
              const y2 = center - radius * Math.cos(angleRad2);
              const largeArc = sliceAngle > 180 ? 1 : 0;
              const pathData = `M ${center} ${center} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
              const sliceColor = WHEEL_COLORS[i % WHEEL_COLORS.length];
              const midAngleDeg = (i + 0.5) * sliceAngle;
              const fontSize = n > 16 ? "8" : n > 12 ? "9" : n > 8 ? "10" : "11";
              const maxChars = n > 16 ? 9 : n > 12 ? 11 : 14;

              return (
                <g key={i}>
                  <path
                    d={pathData}
                    fill={sliceColor}
                    stroke="#040b0d"
                    strokeWidth="2"
                  />
                  {/* Text positioned along slice radial centerline */}
                  <g transform={`rotate(${midAngleDeg}, ${center}, ${center})`}>
                    <text
                      x={center}
                      y={center - radius * 0.62}
                      fill="#ffffff"
                      fontSize={fontSize}
                      fontWeight="900"
                      textAnchor="middle"
                      className="select-none font-sans tracking-wide"
                      style={{
                        textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)'
                      }}
                    >
                      {opt.length > maxChars ? opt.substring(0, maxChars - 1) + '…' : opt}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Outer glowing border ring */}
            <circle 
              cx={center} 
              cy={center} 
              r={radius + 3} 
              fill="none" 
              stroke="url(#wheelRimGlow)" 
              strokeWidth="6" 
            />
            <circle 
              cx={center} 
              cy={center} 
              r={radius + 6} 
              fill="none" 
              stroke="#040b0d" 
              strokeWidth="2" 
            />

            {/* Golden studs around the rim aligned with top origin */}
            {Array.from({ length: Math.max(n, 8) }).map((_, i) => {
              const studAngleRad = i * ((2 * Math.PI) / Math.max(n, 8));
              const sx = center + (radius + 3) * Math.sin(studAngleRad);
              const sy = center - (radius + 3) * Math.cos(studAngleRad);
              return (
                <circle
                  key={`stud-${i}`}
                  cx={sx.toFixed(2)}
                  cy={sy.toFixed(2)}
                  r="3.5"
                  fill="#fde047"
                  stroke="#854d0e"
                  strokeWidth="1"
                />
              );
            })}

            {/* Center Hub */}
            <circle 
              cx={center} 
              cy={center} 
              r="28" 
              fill="url(#wheelCenterHub)" 
              stroke="#ffffff" 
              strokeWidth="2.5" 
              className="drop-shadow-lg"
            />
            <circle 
              cx={center} 
              cy={center} 
              r={12} 
              fill="#040b0d" 
              stroke="#2dd4bf" 
              strokeWidth="2" 
            />
            <text 
              x={center} 
              y={center + 4} 
              textAnchor="middle" 
              fill="#2dd4bf" 
              fontSize="12" 
              fontWeight="bold"
            >
              ★
            </text>
          </svg>
        </div>
      </div>
    );
  };

  // Solo Offline Spin Wheel Handlers (Deterministic single source of truth)
  const handleSpinWheel = () => {
    if (wheelSegments.length < 2) {
      showToast('Add at least 2 choices to spin the wheel!', 'error');
      return;
    }
    if (wheelSpinning) return;
    setWheelSpinning(true);
    setWheelWinner(null);

    // 1. Pick winnerIndex FIRST via crypto.getRandomValues
    const winnerIndex = getCryptoRandomIndex(wheelSegments.length);
    const winnerOpt = wheelSegments[winnerIndex];

    // 2. Slice i spans [i*sliceAngle, (i+1)*sliceAngle) measured clockwise from top
    const sliceAngle = 360 / wheelSegments.length;

    // 3. Angle needed to bring slice i's center under top pointer:
    let target = (360 - (winnerIndex * sliceAngle + sliceAngle / 2)) % 360;
    // Add jitter within the slice, strictly away from edges (±40% of slice half-width)
    target += (Math.random() - 0.5) * sliceAngle * 0.8;
    target = ((target % 360) + 360) % 360;

    // 4. Cumulative persistent rotation from current wheel pose without resetting
    const currentNorm = ((wheelRotation % 360) + 360) % 360;
    const delta = ((target - currentNorm) + 360) % 360;
    const fullTurns = 5 + Math.floor(Math.random() * 4); // 5 to 8 full revolutions
    const targetRotation = wheelRotation + fullTurns * 360 + delta;

    // Safety check assertion: compute slice directly from final angle
    const checkIdx = Math.floor(((((360 - (targetRotation % 360)) % 360) + 360) % 360) / sliceAngle) % wheelSegments.length;
    if (checkIdx !== winnerIndex) {
      console.error(`[Wheel Align] Assertion failed: expected index ${winnerIndex} (${winnerOpt}), pointer computed ${checkIdx}`);
    }

    setWheelRotation(targetRotation);

    setTimeout(() => {
      setWheelSpinning(false);
      setWheelWinner(winnerOpt);
      showToast(`🎡 Landed on: ${winnerOpt}! 🎉`, 'success');
    }, 4500);
  };

  const handleAddWheelOption = () => {
    if (!wheelNewOption.trim()) return;
    if (wheelSegments.length >= 30) {
      showToast('Maximum 30 choices supported', 'error');
      return;
    }
    setWheelSegments(prev => [...prev, wheelNewOption.trim()]);
    setWheelNewOption('');
  };

  const handleClearWheelOptions = () => {
    setWheelSegments([]);
    setWheelWinner(null);
    showToast('Wheel cleared to 0 options. Add your custom choices!', 'info');
  };

  const handleRemoveWheelOption = (idx: number) => {
    setWheelSegments(prev => prev.filter((_, i) => i !== idx));
    setWheelWinner(null);
  };

  // Multiplayer Spin Wheel Handlers
  // Multiplayer Spin Wheel Handlers (Synchronized single source of truth)
  const handleMultiplayerSpinWheel = () => {
    const opts = (gameState?.wheelOptions !== undefined) ? gameState.wheelOptions : wheelSegments;
    if (opts.length < 2) {
      showToast('Add at least 2 choices to spin the wheel!', 'error');
      return;
    }
    if (gameState?.wheelSpinning || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // 1. Pick winnerIndex FIRST via crypto.getRandomValues
    const winnerIndex = getCryptoRandomIndex(opts.length);
    const winnerOpt = opts[winnerIndex];

    // 2. Slice geometry measured clockwise from top pointer
    const sliceAngle = 360 / opts.length;

    // 3. Target angle with safe interior jitter
    let target = (360 - (winnerIndex * sliceAngle + sliceAngle / 2)) % 360;
    target += (Math.random() - 0.5) * sliceAngle * 0.8;
    target = ((target % 360) + 360) % 360;

    // 4. Cumulative continuous rotation
    const currRotation = gameState?.wheelRotation || 0;
    const currentNorm = ((currRotation % 360) + 360) % 360;
    const delta = ((target - currentNorm) + 360) % 360;
    const fullTurns = 5 + Math.floor(Math.random() * 4);
    const targetRotation = currRotation + fullTurns * 360 + delta;

    // Verification assertion
    const checkIdx = Math.floor(((((360 - (targetRotation % 360)) % 360) + 360) % 360) / sliceAngle) % opts.length;
    if (checkIdx !== winnerIndex) {
      console.error(`[Multiplayer Wheel Align] Assertion failed: expected ${winnerIndex}, got ${checkIdx}`);
    }

    // Broadcast spin start to opponent
    wsRef.current.send(JSON.stringify({
      type: 'game_update',
      game: {
        ...gameState,
        gameType: 'spin-wheel',
        status: 'playing',
        wheelSpinning: true,
        wheelRotation: targetRotation,
        wheelWinner: null,
        wheelWinnerIndex: winnerIndex,
        lastSpinnerId: user?.id,
        lastSpinnerName: user?.display_name || user?.username,
        wheelOptions: opts
      }
    }));

    // After 4.5s animation finishes, broadcast final winner
    setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'game_update',
          game: {
            ...gameState,
            gameType: 'spin-wheel',
            status: 'playing',
            wheelSpinning: false,
            wheelRotation: targetRotation,
            wheelWinner: winnerOpt,
            wheelWinnerIndex: winnerIndex,
            lastSpinnerId: user?.id,
            lastSpinnerName: user?.display_name || user?.username,
            wheelOptions: opts,
            turn: activeSession?.opponentId
          }
        }));
      }
    }, 4500);
  };

  const handleAddMultiplayerOption = () => {
    if (!wheelNewOption.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const opts = (gameState?.wheelOptions !== undefined) ? gameState.wheelOptions : wheelSegments;
    if (opts.length >= 30) {
      showToast('Maximum 30 choices supported', 'error');
      return;
    }
    const updated = [...opts, wheelNewOption.trim()];
    setWheelNewOption('');
    wsRef.current.send(JSON.stringify({
      type: 'game_update',
      game: {
        ...gameState,
        wheelOptions: updated,
        wheelWinner: null
      }
    }));
  };

  const handleClearMultiplayerOptions = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'game_update',
      game: {
        ...gameState,
        wheelOptions: [],
        wheelWinner: null
      }
    }));
    showToast('Multiplayer wheel cleared to 0 options for both players!', 'info');
  };

  const handleRemoveMultiplayerOption = (idx: number) => {
    const opts = (gameState?.wheelOptions !== undefined) ? gameState.wheelOptions : wheelSegments;
    const updated = opts.filter((_: any, i: number) => i !== idx);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'game_update',
        game: {
          ...gameState,
          wheelOptions: updated,
          wheelWinner: null
        }
      }));
    }
  };

  // Render 100% Offline Solo Games
  const renderSoloRetroGame = () => {
    switch (selectedSoloGame) {
      case '8bit-suite':
        return <Retro8BitSuite />;

      case 'higher-lower':
        return (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-6 gap-6 animate-zoom">
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white flex items-center justify-center gap-2">
                <span>🎴</span> Higher or Lower
              </h3>
              <p className="text-xs text-slate-400">Guess whether the next card will be higher or lower in value.</p>
            </div>

            {hlCard ? (
              <div className="flex flex-col items-center gap-5 w-full max-w-sm">
                {/* Score HUD */}
                <div className="flex gap-8 text-center bg-slate-900/80 px-7 py-2.5 rounded-full border border-teal-500/20 shadow-lg">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Score</span>
                    <span className="text-base font-black text-white">{hlScore}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Streak</span>
                    <span className="text-base font-black text-teal-400 flex items-center gap-0.5 justify-center">
                      <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      {hlStreak}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Best</span>
                    <span className="text-base font-black text-amber-400 flex items-center gap-0.5 justify-center">
                      <Trophy className="w-3.5 h-3.5" />
                      {hlBestScore}
                    </span>
                  </div>
                </div>

                {/* Card Container */}
                <div className={`w-40 h-56 bg-slate-900 border-2 ${hlGameOver ? 'border-rose-500 shadow-rose-500/20' : 'border-teal-500/40 shadow-teal-500/20'} rounded-3xl flex flex-col justify-between p-4 shadow-2xl relative select-none`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-lg font-black ${['♥', '♦'].includes(hlCard.suit) ? 'text-rose-500' : 'text-slate-200'}`}>
                      {hlCard.label.split(' ')[0]}
                    </span>
                    <span className={`text-xl ${['♥', '♦'].includes(hlCard.suit) ? 'text-rose-500' : 'text-slate-200'}`}>
                      {hlCard.suit}
                    </span>
                  </div>
                  
                  <span className={`text-6xl self-center ${['♥', '♦'].includes(hlCard.suit) ? 'text-rose-500' : 'text-slate-200'}`}>
                    {hlCard.suit}
                  </span>

                  <div className="flex justify-between items-end rotate-180">
                    <span className={`text-lg font-black ${['♥', '♦'].includes(hlCard.suit) ? 'text-rose-500' : 'text-slate-200'}`}>
                      {hlCard.label.split(' ')[0]}
                    </span>
                    <span className={`text-xl ${['♥', '♦'].includes(hlCard.suit) ? 'text-rose-500' : 'text-slate-200'}`}>
                      {hlCard.suit}
                    </span>
                  </div>
                </div>

                {!hlGameOver ? (
                  <div className="flex gap-4 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => handleHlGuess('higher')}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                      Higher ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHlGuess('lower')}
                      className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-teal-600/20 active:scale-95"
                    >
                      Lower ↓
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-3 bg-rose-500/10 border border-rose-500/25 p-5 rounded-2xl w-full">
                    <h5 className="text-rose-400 font-extrabold text-sm">Game Over! Score: {hlScore}</h5>
                    <button
                      type="button"
                      onClick={handleHlStart}
                      className="py-2 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow active:scale-95"
                    >
                      Play Again
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleHlStart}
                className="py-3.5 px-8 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-teal-500/25 active:scale-95"
              >
                Start Guessing Cards
              </button>
            )}
          </div>
        );

      case 'whack-a-mole':
        return (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-6 gap-6 animate-zoom">
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white flex items-center justify-center gap-2">
                <span>🐹</span> Whack-a-Mole
              </h3>
              <p className="text-xs text-slate-400">Whack the mole as fast as possible when it pops up!</p>
            </div>

            <div className="flex justify-between items-center w-full max-w-sm px-5 py-2.5 bg-slate-900/80 border border-teal-500/20 rounded-2xl text-xs font-bold text-slate-300 shadow-md">
              <span>Score: <strong className="text-teal-400 text-sm font-black">{moleScore}</strong></span>
              <span>Best: <strong className="text-amber-400 text-sm font-black">{moleBestScore}</strong></span>
              <span>Time: <strong className="text-rose-400 text-sm font-black">{moleTimeLeft}s</strong></span>
            </div>

            {moleIsPlaying ? (
              <div className="grid grid-cols-3 gap-3.5 bg-slate-950/80 p-5 rounded-3xl border border-white/10 shadow-2xl">
                {Array(9).fill(null).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleWhackMole(idx)}
                    className="h-18 w-18 sm:h-20 sm:w-20 bg-slate-900 border-2 border-slate-750 hover:bg-slate-850 rounded-2xl flex items-center justify-center text-4xl select-none transition-all active:scale-90"
                  >
                    {moleActiveIndex === idx ? '🐹' : ''}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center space-y-3 bg-slate-900/60 border border-white/10 p-6 rounded-3xl max-w-sm w-full shadow-xl">
                {moleScore > 0 ? (
                  <p className="text-xs text-teal-300 font-extrabold">You whacked {moleScore} moles in 30s!</p>
                ) : (
                  <p className="text-xs text-slate-400">Test your reaction time in 30 seconds.</p>
                )}
                <button
                  type="button"
                  onClick={startWhackAMole}
                  className="py-3 px-8 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-teal-500/25 active:scale-95"
                >
                  {moleScore > 0 ? 'Play Again' : 'Start 30s Game'}
                </button>
              </div>
            )}
          </div>
        );

      case 'coin-toss':
        return (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-6 gap-6 animate-zoom max-w-md mx-auto">
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white flex items-center justify-center gap-2">
                <span>🪙</span> Coin Toss
              </h3>
              <p className="text-xs text-slate-400">Flip a coin to make a quick decision!</p>
            </div>

            <div className={`h-28 w-28 rounded-full border-4 border-amber-400 bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-[0_0_40px_rgba(245,158,11,0.3)] flex items-center justify-center text-5xl select-none ${
              coinFlipping ? 'animate-spin' : ''
            }`}>
              {coinResult === 'heads' ? '👑' : coinResult === 'tails' ? '🍂' : '🪙'}
            </div>

            {coinResult && (
              <div className="text-center bg-slate-900/80 px-6 py-2 rounded-full border border-amber-500/30 text-xs font-extrabold text-white capitalize shadow-md">
                Result: <strong className="text-amber-400 uppercase">{coinResult}</strong>!
              </div>
            )}

            {!coinFlipping ? (
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleCoinToss('heads')}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase rounded-xl transition-all shadow active:scale-95"
                >
                  Predict Heads 👑
                </button>
                <button
                  type="button"
                  onClick={() => handleCoinToss('tails')}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase rounded-xl transition-all shadow border border-slate-700 active:scale-95"
                >
                  Predict Tails 🍂
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-400 animate-pulse font-mono font-bold">Flipping coin...</span>
            )}

            {coinHistory.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap justify-center mt-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">History:</span>
                {coinHistory.map((res, i) => (
                  <span key={i} className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    res === 'heads' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {res === 'heads' ? '👑 H' : '🍂 T'}
                  </span>
                ))}
              </div>
            )}
          </div>
        );

      case 'spin-wheel':
        return (
          <div className="w-full flex-1 flex flex-col md:flex-row items-center justify-around p-4 sm:p-6 gap-6 sm:gap-8 animate-zoom">
            {/* Wheel Canvas Section */}
            <div className="flex flex-col items-center gap-5">
              {renderSvgWheel(wheelSegments, wheelRotation)}

              {wheelWinner && (
                <div className="text-center bg-teal-500/15 border border-teal-500/40 px-6 py-2 rounded-full text-xs font-black text-teal-300 animate-bounce shadow-lg">
                  Landed on: <span className="text-amber-400">{wheelWinner}</span>! 🎉
                </div>
              )}

              <button
                type="button"
                disabled={wheelSpinning}
                onClick={handleSpinWheel}
                className={`py-3.5 px-8 text-slate-950 text-xs font-black uppercase tracking-wider rounded-2xl transition-all ${
                  wheelSpinning || wheelSegments.length < 2
                    ? 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed border border-white/5 shadow-none'
                    : 'bg-gradient-to-b from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.35),0_4px_6px_-1px_rgba(0,0,0,0.4),0_0_20px_rgba(45,212,191,0.25)] active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                }`}
              >
                {wheelSpinning ? 'Spinning...' : 'Spin The Wheel 🎡'}
              </button>
            </div>

            {/* Custom Options Config */}
            <div className="w-full max-w-xs space-y-3 p-4 bg-slate-900/60 rounded-2xl border border-white/10 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Wheel Choices</h4>
                  <span className="text-[10px] text-teal-400 font-mono font-bold">({wheelSegments.length})</span>
                </div>
                {wheelSegments.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearWheelOptions}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline transition-colors"
                  >
                    Clear to 0
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wheelNewOption}
                  onChange={(e) => setWheelNewOption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWheelOption()}
                  placeholder="Add custom option (up to 30)..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={handleAddWheelOption}
                  className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold active:scale-95 transition-all"
                >
                  Add
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {wheelSegments.length === 0 ? (
                  <div className="p-3 text-center rounded-xl bg-slate-950/40 border border-dashed border-white/10">
                    <p className="text-[11px] text-slate-400 font-medium">0 choices active.</p>
                    <p className="text-[10px] text-teal-400/80 mt-0.5">Type an option above and click Add!</p>
                  </div>
                ) : (
                  wheelSegments.map((seg, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-white/5 text-xs text-slate-300 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: WHEEL_COLORS[idx % WHEEL_COLORS.length] }} />
                        <span className="truncate">{seg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveWheelOption(idx)}
                        title="Remove choice"
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render True Versus Multiplayer Games
  const renderMultiplayerGame = () => {
    if (!activeSession) return null;
    const currentGameType = activeSession.gameType || 'tic-tac-toe';

    switch (currentGameType) {
      case 'tic-tac-toe':
        return (
          <div className="w-full max-w-sm flex flex-col items-center gap-5 p-6 bg-slate-950/80 border border-teal-500/20 rounded-3xl shadow-2xl select-none animate-zoom">
            {/* Scoreboard */}
            <div className="flex items-center justify-between w-full border-b border-white/10 pb-4">
              <div className="flex flex-col items-center gap-1 w-24 text-center">
                <span className="text-[9px] font-black uppercase text-slate-400">Player X</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  gameState?.playerX === user?.id ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-900 text-slate-400'
                }`}>
                  {gameState?.playerX === user?.id ? 'You' : (activeSession.opponentName || 'Opponent')}
                </span>
                <span className="text-xl font-black text-rose-500">X</span>
              </div>

              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">VS</div>

              <div className="flex flex-col items-center gap-1 w-24 text-center">
                <span className="text-[9px] font-black uppercase text-slate-400">Player O</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  gameState?.playerO === user?.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-900 text-slate-400'
                }`}>
                  {gameState?.playerO === user?.id ? 'You' : (activeSession.opponentName || 'Opponent')}
                </span>
                <span className="text-xl font-black text-blue-400">O</span>
              </div>
            </div>

            {/* Board */}
            <div className="grid grid-cols-3 gap-2.5 bg-slate-900/60 p-3 rounded-2xl border border-white/10 w-56 h-56">
              {(gameState?.board || Array(9).fill(null)).map((cell: any, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  disabled={gameState?.status !== 'playing' || gameState?.turn !== user?.id || cell !== null}
                  onClick={() => handleMakeMove(idx)}
                  className={`rounded-xl flex items-center justify-center font-black text-3xl select-none transition-all active:scale-95 ${
                    cell === 'X'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : cell === 'O'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : gameState?.status === 'playing' && gameState?.turn === user?.id
                      ? 'bg-slate-800/80 hover:bg-slate-700 border border-slate-700 cursor-pointer hover:border-teal-400'
                      : 'bg-slate-950/40 border border-slate-900 opacity-40 cursor-not-allowed'
                  }`}
                >
                  {cell}
                </button>
              ))}
            </div>

            {/* Status */}
            {gameState?.status === 'won' && (
              <div className="text-center font-black text-xs uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-full w-full animate-bounce">
                🎉 {gameState.winner === user?.id ? 'You won the match!' : `${activeSession.opponentName || 'Opponent'} won!`}
              </div>
            )}
            {gameState?.status === 'draw' && (
              <div className="text-center font-black text-xs uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-full w-full">
                🤝 Match ended in a draw!
              </div>
            )}
          </div>
        );

            case 'chess': {
        const board = gameState?.chessBoard || Array(64).fill(null);
        const isPlayerWhite = user?.id === gameState?.playerX;
        const isPlayerBlack = user?.id === gameState?.playerO;

        // FIXED PROBLEM 1: Orientation decided ONCE from player's assigned color (never from currentTurn)
        // White player: White at bottom (shouldFlip = false)
        // Black player: Black at bottom (shouldFlip = true)
        const shouldFlip = isPlayerBlack;

        const currentTurn = gameState?.turn || gameState?.playerX;
        const isMyTurn = gameState?.status === 'playing' && (currentTurn === user?.id || (isPlayerWhite && !gameState?.playerO));

        // Compute legal moves for the selected piece
        const legalMoveIndices = new Set<number>();
        if (selectedChessSquare !== null && isMyTurn && board[selectedChessSquare]) {
          for (let i = 0; i < 64; i++) {
            if (isValidChessMove(selectedChessSquare, i, board[selectedChessSquare]!, board)) {
              legalMoveIndices.add(i);
            }
          }
        }

        const lastMove = (gameState as any)?.lastChessMove as { from: number; to: number } | undefined;

        const squares = [];
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            // Map grid coordinates through orientation transform
            const idx = shouldFlip ? (63 - (row * 8 + col)) : (row * 8 + col);
            const isDark = (row + col) % 2 === 1;
            const piece = board[idx];
            const isSelected = selectedChessSquare === idx;
            const isLegal = legalMoveIndices.has(idx);
            const isLastMoveSquare = lastMove && (lastMove.from === idx || lastMove.to === idx);

            squares.push(
              <button
                key={idx}
                type="button"
                onClick={() => handleChessSquareClick(idx)}
                className={`w-full h-full flex items-center justify-center relative border border-transparent select-none cursor-pointer p-0 m-0 transition-colors duration-150 ${
                  isSelected 
                    ? 'bg-teal-500/40 ring-2 ring-teal-400 z-10' 
                    : isLastMoveSquare
                    ? 'bg-amber-400/20'
                    : isDark 
                    ? 'bg-[#12282c] hover:bg-[#18353a]' 
                    : 'bg-[#224f52] hover:bg-[#2b6064]'
                }`}
              >
                {/* Legal move indicators */}
                {isLegal && !piece && (
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-teal-400/70 shadow-sm shadow-teal-400/50 pointer-events-none" />
                )}
                {isLegal && piece && (
                  <span className="absolute inset-0.5 rounded-sm ring-2 ring-rose-400/80 bg-rose-500/20 pointer-events-none" />
                )}

                {/* PROBLEM 3 FIX: High-contrast pieces with white outline/stroke on dark pieces */}
                {piece && (
                  <span 
                    className="transition-transform duration-150 ease-out select-none text-2xl sm:text-3xl font-black leading-none"
                    style={{
                      color: piece === piece.toUpperCase() ? '#f8fafc' : '#0c151c',
                      WebkitTextStroke: piece === piece.toUpperCase() 
                        ? '0.5px rgba(0, 0, 0, 0.4)' 
                        : '1px rgba(255, 255, 255, 0.85)',
                      filter: piece === piece.toUpperCase() 
                        ? 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.8))' 
                        : 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.8)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9))',
                    }}
                  >
                    {pieceUnicode[piece]}
                  </span>
                )}
              </button>
            );
          }
        }

        return (
          <div className="w-full flex flex-col items-center gap-3 animate-zoom">
            {/* PROBLEM 2 FIX: Reserved fixed height status header prevents layout shifts */}
            <div className="w-full max-w-[480px] text-center flex flex-col items-center">
              <h4 className="text-sm font-black text-white flex items-center justify-center gap-1.5 h-6">
                <span>♟️ Sandbox Chess</span>
                <span className="text-[10px] text-teal-400/80 font-mono font-medium">
                  ({isPlayerWhite ? 'Playing as White' : isPlayerBlack ? 'Playing as Black' : 'Solo'})
                </span>
              </h4>
              {/* Status text reserved min-height (1-line) so board never shifts */}
              <div className="h-6 min-h-[24px] flex items-center justify-center w-full px-2">
                <p className="text-[11px] truncate max-w-full m-0 p-0">
                  {gameState?.status === 'playing' ? (
                    isMyTurn ? (
                      <span className="text-emerald-400 font-extrabold">Your Turn! Click piece to select, click tile to move.</span>
                    ) : (
                      <span className="text-slate-400">Waiting for {activeSession?.opponentName || 'opponent'} move…</span>
                    )
                  ) : (
                    <span className="text-amber-400 font-extrabold">King Captured! Game Over</span>
                  )}
                </p>
              </div>
            </div>

            {/* PROBLEM 2 FIX: Board with fixed max width and 1:1 aspect-ratio */}
            <div 
              className="w-full max-w-[480px] aspect-square grid grid-cols-8 grid-rows-8 border-2 border-teal-500/40 rounded-2xl overflow-hidden shadow-2xl bg-[#091518] p-0.5"
              style={{
                width: 'min(100%, 480px)',
                aspectRatio: '1 / 1',
              }}
            >
              {squares}
            </div>
          </div>
        );
      }

      case 'rps': {
        const myMove = gameState?.rpsPlayerMoves?.[user?.id || ''];
        const opponentId = user?.id === gameState?.playerX ? gameState?.playerO : gameState?.playerX;
        const opponentMove = opponentId ? gameState?.rpsPlayerMoves?.[opponentId] : null;

        return (
          <div className="flex flex-col items-center gap-6 max-w-sm w-full animate-zoom">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">Rock Paper Scissors</h4>
              <p className="text-[11px] text-slate-400">Choose your move. Reveal happens when both players pick.</p>
            </div>

            {gameState?.status === 'playing' ? (
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
                        className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700 hover:border-teal-400 hover:bg-teal-500/10 flex flex-col items-center justify-center gap-1 text-2xl active:scale-95 transition-all shadow-lg"
                      >
                        <span>{move.emoji}</span>
                        <span className="text-[9px] font-black uppercase text-slate-300">{move.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center space-y-2 bg-slate-900/60 border border-white/10 px-6 py-4 rounded-2xl">
                    <span className="text-3xl animate-bounce block">⏳</span>
                    <span className="text-xs font-bold text-slate-300">You chose <strong className="text-teal-300 uppercase">{myMove}</strong></span>
                    <p className="text-[10px] text-slate-500">Waiting for {activeSession.opponentName || 'opponent'}...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 bg-slate-900/60 border border-white/10 p-6 rounded-2xl w-full">
                <div className="flex justify-around items-center w-full">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">You</span>
                    <span className="text-4xl block">{myMove === 'rock' ? '✊' : myMove === 'paper' ? '✋' : '✌️'}</span>
                    <span className="text-xs font-bold text-white uppercase">{myMove}</span>
                  </div>
                  <div className="text-sm font-black text-slate-600">VS</div>
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">{activeSession.opponentName || 'Opponent'}</span>
                    <span className="text-4xl block">{opponentMove === 'rock' ? '✊' : opponentMove === 'paper' ? '✋' : '✌️'}</span>
                    <span className="text-xs font-bold text-white uppercase">{opponentMove || 'no move'}</span>
                  </div>
                </div>

                <div className="border-t border-white/10 w-full pt-4 mt-2 text-center">
                  {gameState?.status === 'draw' ? (
                    <span className="text-amber-400 font-extrabold text-xs">It's a draw! 🤝</span>
                  ) : gameState?.winner === user?.id ? (
                    <span className="text-emerald-400 font-extrabold text-xs">🎉 You Won the RPS battle!</span>
                  ) : (
                    <span className="text-rose-400 font-extrabold text-xs">💀 {activeSession.opponentName || 'Opponent'} Won!</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'memory-match':
        return (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm animate-zoom">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">🃏 Memory Match</h4>
              <p className="text-[11px] text-slate-400">
                {gameState?.status === 'playing' ? (
                  gameState.turn === user?.id ? (
                    <span className="text-emerald-400 font-extrabold">Your Turn! Find matching pairs.</span>
                  ) : (
                    <span className="text-slate-400">Waiting for {activeSession.opponentName || 'opponent'}...</span>
                  )
                ) : gameState?.status === 'won' ? (
                  `Winner: ${gameState.winner === user?.id ? 'You 🎉' : `${activeSession.opponentName || 'Opponent'} 🏆`}`
                ) : 'Find pairs!'}
              </p>
            </div>

            {/* Scoreboard */}
            <div className="flex justify-between w-full px-4 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs font-bold">
              <span>You: <strong className="text-teal-400">{gameState?.memoryScores?.[user?.id || ''] || 0}</strong></span>
              <span>{activeSession.opponentName || 'Opponent'}: <strong className="text-amber-400">
                {gameState?.memoryScores?.[(user?.id === gameState?.playerX ? gameState?.playerO : gameState?.playerX) || ''] || 0}
              </strong></span>
            </div>

            {/* Card Grid */}
            <div className="grid grid-cols-4 gap-2.5 bg-slate-950/60 p-3 rounded-2xl border border-white/10 w-full aspect-square">
              {(gameState?.memoryCards || []).map((card: any, idx: number) => {
                const isRevealed = card.isFlipped || card.isMatched;
                return (
                  <button
                    key={card.id || idx}
                    type="button"
                    onClick={() => handleMemoryCardClick(idx)}
                    disabled={gameState?.status !== 'playing' || gameState?.turn !== user?.id || isRevealed}
                    className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all select-none active:scale-90 ${
                      isRevealed
                        ? 'bg-slate-800 border border-slate-700'
                        : 'bg-gradient-to-tr from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400'
                    }`}
                  >
                    {isRevealed ? card.symbol : '❓'}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'spin-wheel': {
        const currentSegments = (gameState?.wheelOptions !== undefined) ? gameState.wheelOptions : wheelSegments;
        const currentRotation = gameState?.wheelRotation || 0;
        const isSpinning = !!gameState?.wheelSpinning;
        const currentWinner = gameState?.wheelWinner || null;
        const lastSpinnerName = gameState?.lastSpinnerName || null;
        const isMyTurn = gameState?.turn ? gameState.turn === user?.id : true;

        return (
          <div className="w-full max-w-2xl flex flex-col md:flex-row items-center justify-around p-4 sm:p-6 gap-6 sm:gap-8 animate-zoom">
            {/* Wheel Canvas Section */}
            <div className="flex flex-col items-center gap-5">
              {/* Turn indicator */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                  isMyTurn
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {isMyTurn ? "🎮 Your Turn to Spin!" : `⏳ Waiting for ${activeSession?.opponentName || 'Opponent'}...`}
                </span>
              </div>

              {renderSvgWheel(currentSegments, currentRotation)}

              {currentWinner && (
                <div className="text-center bg-teal-500/15 border border-teal-500/40 px-6 py-2 rounded-full text-xs font-black text-teal-300 animate-bounce shadow-lg">
                  {lastSpinnerName ? `@${lastSpinnerName} spun:` : 'Result:'} <span className="text-amber-400">{currentWinner}</span>! 🎉
                </div>
              )}

              <button
                type="button"
                disabled={isSpinning}
                onClick={handleMultiplayerSpinWheel}
                className="py-3 px-8 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-teal-500/25 active:scale-95 disabled:opacity-50"
              >
                {isSpinning ? 'Spinning Together...' : 'Spin The Wheel 🎡'}
              </button>
            </div>

            {/* Synchronized Options Config */}
            <div className="w-full max-w-xs space-y-3 p-4 bg-slate-900/60 rounded-2xl border border-white/10 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Live Choices</h4>
                  <span className="text-[10px] text-teal-400 font-mono font-bold">({currentSegments.length})</span>
                </div>
                {currentSegments.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearMultiplayerOptions}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline transition-colors"
                  >
                    Clear to 0
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wheelNewOption}
                  onChange={(e) => setWheelNewOption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMultiplayerOption()}
                  placeholder="Add choice for both (up to 30)..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={handleAddMultiplayerOption}
                  className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold active:scale-95 transition-all"
                >
                  Add
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {currentSegments.length === 0 ? (
                  <div className="p-3 text-center rounded-xl bg-slate-950/40 border border-dashed border-white/10">
                    <p className="text-[11px] text-slate-400 font-medium">0 choices active.</p>
                    <p className="text-[10px] text-teal-400/80 mt-0.5">Type an option above to build live choices!</p>
                  </div>
                ) : (
                  currentSegments.map((seg: string, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-white/5 text-xs text-slate-300 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: WHEEL_COLORS[idx % WHEEL_COLORS.length] }} />
                        <span className="truncate">{seg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMultiplayerOption(idx)}
                        title="Remove choice"
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="text-center text-xs text-slate-400">
            Multiplayer board for {currentGameType} active!
          </div>
        );
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center bg-[var(--bg)] min-h-[calc(100vh-64px)] p-3 sm:p-6 pb-28 sm:pb-8 animate-fade-in select-none">
      
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-2.5 mb-3 sm:mb-6">
        <button
          type="button"
          onClick={() => onNavigate('feed')}
          className="flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] transition-colors px-3 py-2 rounded-xl bg-[var(--input)] border border-[var(--line)] active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Tab Switcher: Solo Retro vs Play with Friends */}
        <div className="flex items-center p-1 rounded-2xl bg-[var(--input)] border border-[var(--line)] shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('retro')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'retro'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Solo Retro</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('multiplayer')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'multiplayer'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Play with Friends</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeTab === 'retro' && selectedSoloGame === '8bit-suite' && (
            <button
              type="button"
              onClick={reloadRetroGame}
              title="Reset Retro Games"
              className="p-2 rounded-xl bg-[var(--input)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] transition-colors active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Arcade"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--input)] border border-[var(--line)] text-xs font-bold text-[var(--text)] hover:border-[var(--accent-2)] transition-all active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Main Arcade Cabinet Container */}
      <div
        ref={containerRef}
        className={`w-full max-w-4xl flex flex-col rounded-2xl sm:rounded-3xl border border-[var(--card-border)] bg-[var(--card)] shadow-2xl overflow-hidden relative ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none max-w-none h-screen bg-[#040b0d]' : 'min-h-[480px] sm:min-h-[640px]'
        }`}
      >
        {/* Retro Header Strip */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-r from-slate-950 via-[#06181b] to-slate-950 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-white tracking-wider flex items-center gap-2">
                  Arcade 🎮
                </h1>
              </div>
            </div>

            {/* Current User Profile Badge in Arcade Header */}
            {user && (
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-teal-500/40 transition-all text-left active:scale-95 group shadow-sm"
                title="Your Profile (Tap to view)"
              >
                <ArcadeAvatar url={user.avatar_url} name={user.display_name || user.username} size="w-7 h-7" rounded="rounded-lg" />
                <div className="hidden min-[480px]:flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors truncate max-w-[110px]">
                      {user.display_name || user.username}
                    </span>
                    {user.is_verified && <span className="text-[10px] text-teal-400">✓</span>}
                  </div>
                  <span className="text-[9px] text-teal-400/80 font-mono font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'retro' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Offline Capable</span>
              </span>
            )}

            {activeTab === 'multiplayer' && (
              <button
                type="button"
                onClick={() => setShowChallengeModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-black transition-all active:scale-95"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Challenge a Friend</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: Solo Retro Games (100% Offline) */}
        {activeTab === 'retro' && (
          <div className="w-full flex-1 flex flex-col bg-[#040b0d]">
            {/* Solo Offline Game Selector Strip */}
            <div className="flex items-center gap-2 p-3 bg-slate-950/80 border-b border-white/5 overflow-x-auto scrollbar-none">
              {SOLO_RETRO_GAMES.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedSoloGame(g.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 active:scale-95 ${
                    selectedSoloGame === g.id
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  <span>{g.emoji}</span>
                  <span>{g.name}</span>
                </button>
              ))}
            </div>

            {/* Offline Solo Game Canvas / Board */}
            <div className="w-full flex-1 flex items-center justify-center">
              {renderSoloRetroGame()}
            </div>
          </div>
        )}

        {/* TAB 2: Play with Friends (True 2-Player Multiplayer) */}
        {activeTab === 'multiplayer' && (
          <div className="w-full flex-1 flex flex-col p-3 sm:p-6 pb-28 sm:pb-8 bg-[#040b0d] overflow-y-auto">
            {activeSession ? (
              /* Active Multiplayer Game Room */
              <div className="w-full flex-1 flex flex-col items-center justify-between">
                {/* Active Session Header Bar */}
                <div className="w-full flex flex-wrap items-center justify-between gap-2.5 min-h-[64px] p-2.5 sm:p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 mb-3 sm:mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3">
                      <ArcadeAvatar url={user?.avatar_url} name={user?.display_name || user?.username || 'You'} size="w-8 h-8 sm:w-10 sm:h-10" rounded="rounded-xl" />
                      <div className="hidden sm:block text-left">
                        <span className="text-xs font-bold text-white block truncate max-w-[110px]">{user?.display_name || user?.username}</span>
                        <span className="text-[9px] text-teal-400 font-semibold">You (P1)</span>
                      </div>
                      <span className="text-[10px] font-black text-teal-400 px-2 py-1 bg-teal-500/15 rounded-lg border border-teal-500/30">VS</span>
                      <ArcadeAvatar url={activeSession.opponentAvatar} name={activeSession.opponentName || 'Friend'} size="w-8 h-8 sm:w-10 sm:h-10" rounded="rounded-xl" />
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block truncate max-w-[110px]">{activeSession.opponentName || 'Friend'}</span>
                        <span className="text-[9px] text-slate-400 font-semibold">Opponent</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto">
                    <button
                      type="button"
                      onClick={handleResetGame}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-slate-200 border border-slate-700 active:scale-95 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Rematch</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseSession}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-black text-rose-300 border border-rose-500/30 active:scale-95"
                    >
                      Exit Battle
                    </button>
                  </div>
                </div>

                {/* Render the active multiplayer board */}
                <div className="w-full flex-1 flex items-center justify-center py-4">
                  {renderMultiplayerGame()}
                </div>
              </div>
            ) : (
              /* Multiplayer Lobby */
              <div className="w-full flex flex-col gap-6">
                
                {/* Current User Player Profile Card */}
                {user && (
                  <div className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#061e1b] to-slate-900/90 border border-teal-500/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                      <div className="relative">
                        <ArcadeAvatar url={user.avatar_url} name={user.display_name || user.username} size="w-12 h-12" rounded="rounded-2xl" />
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950" title="Online" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-black text-white truncate">{user.display_name || user.username}</h4>
                          {user.is_verified && <span className="text-teal-400 text-xs font-bold">✓</span>}
                        </div>
                        <p className="text-[11px] text-teal-300/80 font-mono">@{user.username}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                            🎮 Ready for 1v1 Battles
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setShowChallengeModal(true)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Challenge a Friend</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('profile')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-white/10 transition-colors"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Multiplayer 1v1 Games Grid */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Swords className="w-3.5 h-3.5 text-teal-400" />
                    <span>Multiplayer 1v1 Battles</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {MULTIPLAYER_GAMES.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setSelectedGameType(g.id);
                          setShowChallengeModal(true);
                        }}
                        className="p-4 rounded-2xl bg-slate-900/40 hover:bg-teal-500/10 border border-white/5 hover:border-teal-500/40 text-left transition-all group flex flex-col justify-between active:scale-95"
                      >
                        <div>
                          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{g.emoji}</div>
                          <h4 className="text-xs font-black text-white group-hover:text-teal-300 transition-colors">{g.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{g.desc}</p>
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-[9px] font-extrabold uppercase text-teal-400">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Challenge 1v1</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Chat Friends Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-teal-400" />
                      <span>Challenge Recent Chat Friends</span>
                    </h3>
                  </div>

                  {loadingContacts ? (
                    <div className="flex items-center justify-center py-8 text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-900/30 border border-white/5 text-center text-xs text-slate-400">
                      No recent 1:1 chat conversations found. Message a friend first or click "Challenge a Friend" above!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {contacts.slice(0, 6).map(c => {
                        const isOnline = Boolean(c.is_online || onlineUserIds.has(c.id));
                        return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-teal-500/30 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative flex-shrink-0">
                              <ArcadeAvatar url={c.avatar_url} name={c.display_name || c.username} size="w-10 h-10" rounded="rounded-xl" />
                              {isOnline && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-sm" title="Online now" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-white truncate">{c.display_name}</h5>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-400 truncate">@{c.username}</span>
                                <span className="text-[9px] text-slate-600">•</span>
                                {isOnline ? (
                                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Online
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-medium">Offline</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedContact(c);
                              setShowChallengeModal(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[10px] font-black border border-teal-500/30 active:scale-95 transition-all flex items-center gap-1"
                          >
                            <Swords className="w-3 h-3" />
                            <span>Challenge</span>
                          </button>
                        </div>
                      );})}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#090d14] border border-teal-500/30 shadow-2xl p-6 flex flex-col gap-5 animate-zoom">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <Swords className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Send 1v1 Battle Challenge</h3>
                  <p className="text-[10px] text-slate-400">They will get an instant in-app pop-up to play</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChallengeModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Select Friend */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Select Friend from Chats</label>
              {contacts.length === 0 ? (
                <p className="text-xs text-slate-500">No recent chat contacts found.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-1 bg-slate-950/60 rounded-2xl border border-white/5">
                  {contacts.map(c => {
                    const isSelected = selectedContact?.id === c.id;
                    const isOnline = Boolean(c.is_online || onlineUserIds.has(c.id));
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedContact(c)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-teal-500/20 border border-teal-500/40 text-white'
                            : 'hover:bg-white/5 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative flex-shrink-0">
                            <ArcadeAvatar url={c.avatar_url} name={c.display_name || c.username} size="w-8 h-8" rounded="rounded-lg" />
                            {isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-sm" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold block truncate">{c.display_name}</span>
                              {isOnline && <span className="text-[9px] text-emerald-400 font-bold">• Online</span>}
                            </div>
                            <span className="text-[9px] text-slate-400 block truncate">@{c.username}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-400 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Select Multiplayer Game */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Choose 1v1 Battle Game</label>
              <div className="grid grid-cols-2 gap-2">
                {MULTIPLAYER_GAMES.map(g => {
                  const isSelected = selectedGameType === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGameType(g.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                          : 'bg-slate-900/50 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      <span className="text-lg">{g.emoji}</span>
                      <span className="text-xs font-bold truncate">{g.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Challenge */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowChallengeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-xs font-bold hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedContact || isSendingChallenge}
                onClick={handleSendChallenge}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-50"
              >
                {isSendingChallenge ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Challenge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
