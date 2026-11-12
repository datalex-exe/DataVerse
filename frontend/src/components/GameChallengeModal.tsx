import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Gamepad2, X, Swords, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Challenger {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface GameInvitation {
  id: string;
  conversationId: string;
  gameType: string;
  gameName: string;
  challenger: Challenger;
  created_at: number;
}

interface GameChallengeModalProps {
  onAccept: (invitation: GameInvitation) => void;
}

export const GameChallengeModal: React.FC<GameChallengeModalProps> = ({ onAccept }) => {
  const { user, token } = useAuth();
  const [invitation, setInvitation] = useState<GameInvitation | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const lastDismissedId = useRef<string | null>(null);

  // Check for pending game invitations
  const checkPendingInvites = async () => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/arcade/pending-invite', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.invitation && data.invitation.id !== lastDismissedId.current) {
          setInvitation(data.invitation);
        } else if (!data.invitation) {
          setInvitation(null);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (!user || !token) return;
    checkPendingInvites();
    const interval = setInterval(checkPendingInvites, 7000);

    const handleCustomInvite = (e: Event) => {
      const customEvent = e as CustomEvent<GameInvitation>;
      if (customEvent.detail && customEvent.detail.id !== lastDismissedId.current) {
        setInvitation(customEvent.detail);
      }
    };

    window.addEventListener('game-challenge-received', handleCustomInvite);

    return () => {
      clearInterval(interval);
      window.removeEventListener('game-challenge-received', handleCustomInvite);
    };
  }, [user, token]);

  const handleRespond = async (accept: boolean) => {
    if (!invitation || !token || isResponding) return;
    setIsResponding(true);
    const currentInvite = invitation;
    lastDismissedId.current = currentInvite.id;
    setInvitation(null);

    try {
      await fetch('/api/arcade/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          notificationId: currentInvite.id,
          accept
        })
      });
    } catch (_) {}

    setIsResponding(false);

    if (accept) {
      onAccept(currentInvite);
    }
  };

  // Scroll lock when modal is open
  useEffect(() => {
    if (!invitation) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [invitation]);

  if (!invitation) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none overscroll-none">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-challenge-title"
        className="relative w-full max-w-sm rounded-3xl bg-[#090d14] border-2 border-teal-500/40 shadow-[0_0_50px_rgba(45,212,191,0.25)] p-6 text-center flex flex-col items-center overflow-hidden animate-zoom overscroll-contain"
      >
        {/* Glow accent */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={() => handleRespond(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Retro Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-black uppercase tracking-wider mb-4 animate-pulse">
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>Game Challenge!</span>
        </div>

        {/* Challenger Avatar with Badge */}
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-2xl p-1 bg-gradient-to-tr from-teal-500 via-cyan-400 to-emerald-400 shadow-lg">
            {invitation.challenger.avatar_url ? (
              <img
                src={invitation.challenger.avatar_url}
                alt={invitation.challenger.display_name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center text-teal-400 text-2xl font-black">
                {invitation.challenger.display_name?.[0]?.toUpperCase() || 'P'}
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-slate-950 border border-teal-500/40 text-teal-300">
            <Swords className="w-4 h-4" />
          </div>
        </div>

        {/* Challenger Info & Game Title */}
        <h3 id="game-challenge-title" className="text-base font-extrabold text-white">
          {invitation.challenger.display_name}
        </h3>
        <p className="text-xs text-teal-400/80 font-mono mb-2">
          @{invitation.challenger.username}
        </p>
        <p className="text-xs text-slate-300 mb-6 px-2">
          has challenged you to a game of <strong className="text-teal-300 font-extrabold">{invitation.gameName}</strong>!
        </p>

        {/* Action Buttons */}
        <div className="w-full flex gap-3">
          <button
            type="button"
            disabled={isResponding}
            onClick={() => handleRespond(false)}
            className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold transition-all active:scale-95"
          >
            Decline
          </button>
          <button
            type="button"
            disabled={isResponding}
            onClick={() => handleRespond(true)}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-black tracking-wide shadow-lg shadow-teal-500/25 flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Accept & Play</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

