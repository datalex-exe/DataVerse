import React, { useState, useRef, useEffect } from 'react';
import { 
  Gamepad2, 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Swords, 
  Users, 
  Sparkles, 
  Send, 
  X, 
  Check,
  Loader2,
  Play
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

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
}

interface GameItem {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  icon?: React.ReactNode;
  multiplayer: boolean;
}

const MULTIPLAYER_GAMES: GameItem[] = [
  { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', desc: 'Classic 3x3 alignment battle', emoji: '❌⭕', multiplayer: true },
  { id: 'chess', name: 'Sandbox Chess', desc: 'Move pieces and capture kings', emoji: '♟️', multiplayer: true },
  { id: 'rps', name: 'Rock Paper Scissors', desc: 'Hidden choices, real-time reveal', emoji: '✊✋✌️', multiplayer: true },
  { id: 'memory-match', name: 'Memory Match', desc: 'Turn cards to find emoji pairs', emoji: '🃏', multiplayer: true },
  { id: 'higher-lower', name: 'Higher or Lower', desc: 'Predict card values & build streaks', emoji: '🎴', multiplayer: true },
  { id: 'whack-a-mole', name: 'Whack-a-Mole', desc: 'High-speed reaction tap game', emoji: '🐹', multiplayer: false },
  { id: 'coin-toss', name: 'Coin Toss', desc: 'Decision flip with physics animation', emoji: '🪙', multiplayer: true },
  { id: 'spin-wheel', name: 'Spin Wheel', desc: 'Random picker wheel for choices', emoji: '🎡', multiplayer: true },
];

export const Arcade: React.FC<ArcadeProps> = ({ onNavigate, initialParam }) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'retro' | 'multiplayer'>('retro');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Contacts from recent chats
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

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

  // Local game states for solo/interactive games
  const [hlCard, setHlCard] = useState<{ suit: string; value: number; label: string } | null>(null);
  const [hlScore, setHlScore] = useState(0);
  const [hlStreak, setHlStreak] = useState(0);
  const [hlGameOver, setHlGameOver] = useState(false);

  const [moleScore, setMoleScore] = useState(0);
  const [moleTimeLeft, setMoleTimeLeft] = useState(30);
  const [moleActiveIndex, setMoleActiveIndex] = useState<number | null>(null);
  const [moleIsPlaying, setMoleIsPlaying] = useState(false);
  const moleTimerRef = useRef<any>(null);

  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);

  const [wheelSegments] = useState<string[]>(['Prize A', 'Bonus 50', 'Try Again', 'Jackpot 🏆', 'Wildcard', 'Double Points']);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelWinner, setWheelWinner] = useState<string | null>(null);

  // Parse initial navigation parameters (e.g., from Chat or Game Pop-up)
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

  // Fetch recent chat contacts
  const fetchContacts = async () => {
    if (!token) return;
    setLoadingContacts(true);
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const convos = data.conversations || [];
        const contactList: ChatContact[] = [];
        const seenUserIds = new Set<string>();

        for (const c of convos) {
          if (c.is_group) continue;
          const other = (c.members || []).find((m: any) => m.id !== user?.id);
          if (other && !seenUserIds.has(other.id)) {
            seenUserIds.add(other.id);
            contactList.push({
              id: other.id,
              conversationId: c.id,
              username: other.username,
              display_name: other.display_name || other.username,
              avatar_url: other.avatar_url
            });
          }
        }
        setContacts(contactList);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'multiplayer') {
      fetchContacts();
    }
  }, [activeTab]);

  // Connect to active game session WebSocket
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

  // Challenge friend action
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

        // Open multiplayer board in Arcade
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

  // Game control helpers
  const handleMakeMove = (cellIndex: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'game_move', index: cellIndex }));
    }
  };

  const handleResetGame = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'game_reset' }));
    }
  };

  const handleCloseSession = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'game_close' }));
    }
    setActiveSession(null);
    setGameState(null);
  };

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

  // Memory card click
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

  // Higher-Lower generator
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
      setHlScore(s => s + 10);
      setHlStreak(st => st + 1);
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
      setMoleScore(s => s + 1);
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
      setCoinFlipping(false);
      if (result === prediction) {
        showToast(`You predicted ${prediction.toUpperCase()} correctly! 👑`, 'success');
      }
    }, 1200);
  };

  // Spin Wheel
  const handleSpinWheel = () => {
    if (wheelSpinning || wheelSegments.length < 2) return;
    setWheelSpinning(true);
    setWheelWinner(null);
    const spins = 5 + Math.floor(Math.random() * 5);
    const randomDegrees = Math.floor(Math.random() * 360);
    const totalRotation = wheelRotation + spins * 360 + randomDegrees;
    setWheelRotation(totalRotation);

    setTimeout(() => {
      setWheelSpinning(false);
      const normalized = (360 - (totalRotation % 360)) % 360;
      const segmentAngle = 360 / wheelSegments.length;
      const winningIndex = Math.floor(normalized / segmentAngle);
      setWheelWinner(wheelSegments[winningIndex] || wheelSegments[0]);
    }, 3200);
  };

  // Render Multiplayer Boards
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

      case 'higher-lower':
        return (
          <div className="flex flex-col items-center gap-5 max-w-sm w-full animate-zoom">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">Higher or Lower</h4>
              <p className="text-[11px] text-slate-400">Guess if the next card will be higher or lower!</p>
            </div>

            {hlCard ? (
              <div className="flex flex-col items-center gap-5 w-full">
                <div className="flex gap-8 text-center bg-slate-900/60 px-6 py-2 rounded-full border border-white/10">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Score</span>
                    <span className="text-sm font-black text-white">{hlScore}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Streak</span>
                    <span className="text-sm font-black text-teal-400">{hlStreak}</span>
                  </div>
                </div>

                {/* Card Container */}
                <div className={`w-36 h-52 bg-slate-900 border ${hlGameOver ? 'border-rose-500/60' : 'border-teal-500/40'} rounded-2xl flex flex-col justify-between p-4 shadow-2xl relative select-none`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-base font-extrabold ${['♥', '♦'].includes(hlCard.suit) ? 'text-rose-500' : 'text-slate-300'}`}>
                      {hlCard.label.split(' ')[0]}
                    </span>
                    <span className={`text-lg ${['♥', '♦'].includes(hlCard.suit) ? 'text-rose-500' : 'text-slate-300'}`}>
                      {hlCard.suit}
                    </span>
                  </div>
                  
                  <span className={`text-5xl self-center ${['♥', '♦'].includes(hlCard.suit) ? 'text-rose-500' : 'text-slate-300'}`}>
                    {hlCard.suit}
                  </span>

                  <div className="flex justify-between items-end rotate-180">
                    <span className={`text-base font-extrabold ${['♥', '♦'].includes(hlCard.suit) ? 'text-rose-500' : 'text-slate-300'}`}>
                      {hlCard.label.split(' ')[0]}
                    </span>
                    <span className={`text-lg ${['♥', '♦'].includes(hlCard.suit) ? 'text-rose-500' : 'text-slate-300'}`}>
                      {hlCard.suit}
                    </span>
                  </div>
                </div>

                {!hlGameOver ? (
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleHlGuess('higher')}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl transition-all shadow active:scale-95"
                    >
                      Higher ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHlGuess('lower')}
                      className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase rounded-xl transition-all shadow active:scale-95"
                    >
                      Lower ↓
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-2 bg-rose-500/10 border border-rose-500/20 px-6 py-4 rounded-xl w-full">
                    <h5 className="text-rose-400 font-extrabold text-xs">Game Over! Final Score: {hlScore}</h5>
                    <button
                      type="button"
                      onClick={handleHlStart}
                      className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
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
                className="py-3 px-8 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow"
              >
                Start Guessing Cards
              </button>
            )}
          </div>
        );

      case 'whack-a-mole':
        return (
          <div className="flex flex-col items-center gap-5 max-w-sm w-full animate-zoom">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">Whack-a-Mole</h4>
              <p className="text-[11px] text-slate-400">Whack the mole as fast as possible when it pops up!</p>
            </div>

            <div className="flex justify-between items-center w-full px-4 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs font-bold text-slate-300">
              <span>Score: <strong className="text-teal-400 text-sm font-black">{moleScore}</strong></span>
              <span>Time: <strong className="text-amber-400 text-sm font-black">{moleTimeLeft}s</strong></span>
            </div>

            {moleIsPlaying ? (
              <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-white/10">
                {Array(9).fill(null).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleWhackMole(idx)}
                    className="h-16 w-16 bg-slate-900 border border-slate-750 hover:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl select-none transition-all active:scale-90"
                  >
                    {moleActiveIndex === idx ? '🐹' : ''}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center space-y-3 bg-slate-900/60 border border-white/10 p-6 rounded-2xl w-full">
                {moleScore > 0 && <p className="text-xs text-teal-300 font-bold">You whacked {moleScore} moles!</p>}
                <button
                  type="button"
                  onClick={startWhackAMole}
                  className="py-2.5 px-6 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black uppercase rounded-xl transition-all shadow active:scale-95"
                >
                  {moleScore > 0 ? 'Play Again' : 'Start Game'}
                </button>
              </div>
            )}
          </div>
        );

      case 'coin-toss':
        return (
          <div className="flex flex-col items-center gap-6 max-w-sm w-full animate-zoom">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">Coin Toss</h4>
              <p className="text-[11px] text-slate-400">Flip a coin with physics!</p>
            </div>

            <div className={`h-24 w-24 rounded-full border-4 border-amber-400 bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-2xl flex items-center justify-center text-4xl select-none ${
              coinFlipping ? 'animate-spin' : ''
            }`}>
              {coinResult === 'heads' ? '👑' : coinResult === 'tails' ? '🍂' : '🪙'}
            </div>

            {coinResult && (
              <div className="text-center bg-slate-900/60 px-6 py-2 rounded-full border border-white/10 text-xs font-bold text-white capitalize">
                Result: {coinResult}!
              </div>
            )}

            {!coinFlipping ? (
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleCoinToss('heads')}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl active:scale-95"
                >
                  Predict Heads 👑
                </button>
                <button
                  type="button"
                  onClick={() => handleCoinToss('tails')}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl active:scale-95"
                >
                  Predict Tails 🍂
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-400 animate-pulse">Flipping coin...</span>
            )}
          </div>
        );

      case 'spin-wheel':
        return (
          <div className="flex flex-col items-center gap-6 max-w-sm w-full animate-zoom">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-white">Spin Wheel</h4>
              <p className="text-[11px] text-slate-400">Spin the wheel for random picks!</p>
            </div>

            <div className="relative w-56 h-56 flex items-center justify-center">
              <div 
                className="w-full h-full rounded-full border-4 border-teal-400 overflow-hidden relative shadow-2xl flex items-center justify-center transition-all duration-[3000ms] ease-out"
                style={{ transform: `rotate(${wheelRotation}deg)` }}
              >
                <div className="w-full h-full bg-gradient-to-tr from-teal-900 via-slate-900 to-emerald-900 flex items-center justify-center">
                  <span className="text-3xl">🎡</span>
                </div>
              </div>
              <div className="absolute -top-3 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-[14px] border-t-amber-400 z-10" />
            </div>

            {wheelWinner && (
              <div className="text-center bg-teal-500/10 border border-teal-500/30 px-6 py-2 rounded-full text-xs font-bold text-teal-300">
                Winner: {wheelWinner}!
              </div>
            )}

            <button
              type="button"
              disabled={wheelSpinning}
              onClick={handleSpinWheel}
              className="py-2.5 px-8 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black uppercase rounded-xl transition-all shadow active:scale-95"
            >
              {wheelSpinning ? 'Spinning...' : 'Spin The Wheel'}
            </button>
          </div>
        );

      default:
        return (
          <div className="text-center text-xs text-slate-400">
            Game board for {currentGameType} active!
          </div>
        );
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center bg-[var(--bg)] min-h-[calc(100vh-64px)] p-3 sm:p-6 animate-fade-in select-none">
      
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 sm:mb-6">
        <button
          type="button"
          onClick={() => onNavigate('feed')}
          className="flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] transition-colors px-3 py-2 rounded-xl bg-[var(--input)] border border-[var(--line)] active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Tab Switcher: Solo Retro vs Multiplayer */}
        <div className="flex items-center p-1 rounded-2xl bg-[var(--input)] border border-[var(--line)]">
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
          {activeTab === 'retro' && (
            <button
              type="button"
              onClick={reloadRetroGame}
              title="Reset Game"
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
          isFullscreen ? 'fixed inset-0 z-50 rounded-none max-w-none h-screen bg-[#040b0d]' : 'min-h-[580px] sm:min-h-[640px]'
        }`}
      >
        {/* Retro Header Strip */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-r from-slate-950 via-[#06181b] to-slate-950 border-b border-white/[0.08]">
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

        {/* TAB 1: Solo Retro Games */}
        {activeTab === 'retro' && (
          <iframe
            ref={iframeRef}
            src="/arcade-offline.html"
            title="Arcade Retro Games"
            className="w-full flex-1 border-0 bg-[#040b0d] h-[520px] sm:h-[580px]"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          />
        )}

        {/* TAB 2: Multiplayer & Friends */}
        {activeTab === 'multiplayer' && (
          <div className="w-full flex-1 flex flex-col p-4 sm:p-6 bg-[#040b0d] overflow-y-auto">
            {activeSession ? (
              /* Active Game Room View */
              <div className="w-full flex-1 flex flex-col items-center justify-between">
                {/* Active Game Session Header */}
                <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-white/10 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white capitalize">
                        {activeSession.gameType.replace('-', ' ')} Game
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Playing with <strong className="text-teal-400">{activeSession.opponentName || 'Friend'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {['tic-tac-toe', 'rps', 'memory-match'].includes(activeSession.gameType) && (
                      <button
                        type="button"
                        onClick={handleResetGame}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-slate-200 border border-slate-700 active:scale-95"
                      >
                        Reset Game
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCloseSession}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-black text-rose-300 border border-rose-500/30 active:scale-95"
                    >
                      Exit Game
                    </button>
                  </div>
                </div>

                {/* Render the active multiplayer board */}
                <div className="w-full flex-1 flex items-center justify-center py-4">
                  {renderMultiplayerGame()}
                </div>
              </div>
            ) : (
              /* Lobby: Select Game or Friend */
              <div className="w-full flex flex-col gap-6">
                
                {/* Multiplayer Games Grid */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>Choose a Game to Play</span>
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
                          <span>Challenge</span>
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
                      {contacts.slice(0, 6).map(c => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-teal-500/30 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {c.avatar_url ? (
                              <img src={c.avatar_url} alt={c.display_name} className="w-9 h-9 rounded-xl object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
                                {c.display_name?.[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-white truncate">{c.display_name}</h5>
                              <p className="text-[10px] text-slate-400 truncate">@{c.username}</p>
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
                            <span>Play</span>
                          </button>
                        </div>
                      ))}
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
                  <h3 className="text-sm font-black text-white">Send Game Challenge</h3>
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
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Select Friend</label>
              {contacts.length === 0 ? (
                <p className="text-xs text-slate-500">No recent chat contacts found.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-1 bg-slate-950/60 rounded-2xl border border-white/5">
                  {contacts.map(c => {
                    const isSelected = selectedContact?.id === c.id;
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
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt={c.display_name} className="w-7 h-7 rounded-lg object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
                              {c.display_name?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate">{c.display_name}</span>
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

            {/* Select Game */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Choose Game</label>
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
