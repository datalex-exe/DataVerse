import React, { useState, useRef } from 'react';
import { Gamepad2, ArrowLeft, Maximize2, Minimize2, Sparkles, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

interface ArcadeProps {
  onNavigate: (view: string, param?: string) => void;
}

export const Arcade: React.FC<ArcadeProps> = ({ onNavigate }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  const reloadGame = () => {
    if (iframeRef.current) {
      iframeRef.current.src = '/arcade-offline.html?t=' + Date.now();
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center bg-[var(--bg)] min-h-[calc(100vh-64px)] p-3 sm:p-6 animate-fade-in select-none">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 sm:mb-6">
        <button
          type="button"
          onClick={() => onNavigate('feed')}
          className="flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] transition-colors px-3 py-2 rounded-xl bg-[var(--input)] border border-[var(--line)] active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Offline Capable
          </span>

          <button
            type="button"
            onClick={reloadGame}
            title="Reset Game"
            className="p-2 rounded-xl bg-[var(--input)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] transition-colors active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

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
          isFullscreen ? 'fixed inset-0 z-50 rounded-none max-w-none h-screen bg-[#040b0d]' : 'h-[620px] sm:h-[680px]'
        }`}
      >
        {/* Retro Header Strip */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-gradient-to-r from-slate-950 via-[#06181b] to-slate-950 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-extrabold text-white tracking-wider uppercase flex items-center gap-1.5">
                DataVerse Arcade <Sparkles className="w-3 h-3 text-teal-400" />
              </h1>
              <p className="text-[10px] text-teal-400/80 font-mono">RETRO 8-BIT SUITE • 4 CLASSIC GAMES</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="hidden md:inline-flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              PRESS SPACE / SWIPE
            </span>
          </div>
        </div>

        {/* Embedded Offline Arcade Canvas Engine */}
        <iframe
          ref={iframeRef}
          src="/arcade-offline.html"
          title="DataVerse Offline Retro Arcade"
          className="w-full flex-1 border-0 bg-[#040b0d]"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
        />
      </div>

      {/* Quick Guide & Features below cabinet */}
      <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 sm:mt-6 text-left">
        <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--line)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)] mb-1">
            <span>🏃‍♂️</span>
            <span>Runner</span>
          </div>
          <p className="text-[11px] text-[var(--muted)]">Jump obstacles, speed ramps up dynamically over distance.</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--line)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)] mb-1">
            <span>🐍</span>
            <span>Snake</span>
          </div>
          <p className="text-[11px] text-[var(--muted)]">Eat energy cores to grow longer. Avoid wall and tail collisions.</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--line)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)] mb-1">
            <span>🐦</span>
            <span>Flappy</span>
          </div>
          <p className="text-[11px] text-[var(--muted)]">Navigate gravity gaps between dynamic neon pillars.</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--line)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)] mb-1">
            <span>🧱</span>
            <span>Breakout</span>
          </div>
          <p className="text-[11px] text-[var(--muted)]">Paddle bounce physics to shatter all brick barriers.</p>
        </div>
      </div>
    </div>
  );
};
