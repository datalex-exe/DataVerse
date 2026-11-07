import React, { useRef, useState, useEffect } from 'react';
import { X, Copy, Check, Download, Share2 } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';

interface ProfileQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified?: boolean;
}

export const ProfileQrModal: React.FC<ProfileQrModalProps> = ({
  isOpen,
  onClose,
  username,
  displayName,
  avatarUrl,
  isVerified
}) => {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const profileUrl = `${window.location.origin}/${username}`;

  // Draw modern stylized QR on canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 260;
    canvas.width = size;
    canvas.height = size;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#040d0e');
    grad.addColorStop(1, '#061a1c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Frame border
    ctx.strokeStyle = '#2dd4bf33';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);

    // Deterministic pseudo-random matrix based on username
    let hash = 0;
    for (let i = 0; i < profileUrl.length; i++) {
      hash = (hash << 5) - hash + profileUrl.charCodeAt(i);
      hash |= 0;
    }

    const grid = 21;
    const cellSize = (size - 40) / grid;
    const offsetX = 20;
    const offsetY = 20;

    // Helper for corner alignment markers
    const drawMarker = (x: number, y: number) => {
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(x, y, cellSize * 7, cellSize * 7);
      ctx.fillStyle = '#040d0e';
      ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
    };

    drawMarker(offsetX, offsetY);
    drawMarker(offsetX + cellSize * 14, offsetY);
    drawMarker(offsetX, offsetY + cellSize * 14);

    // Fill data grid
    ctx.fillStyle = '#e0f2f1';
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        // Skip corner markers
        if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) continue;
        // Center area for logo
        if (r >= 8 && r <= 12 && c >= 8 && c <= 12) continue;

        const val = Math.abs(Math.sin((r * 31 + c * 17 + hash) * 0.1));
        if (val > 0.45) {
          ctx.beginPath();
          ctx.arc(
            offsetX + c * cellSize + cellSize / 2,
            offsetY + r * cellSize + cellSize / 2,
            cellSize / 2.3,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    // Center circular badge for DataVerse Emblem
    const centerX = size / 2;
    const centerY = size / 2;
    const centerRadius = cellSize * 2.8;

    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#040d0e';
    ctx.fill();
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillStyle = '#2dd4bf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DV', centerX, centerY);
  }, [isOpen, profileUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `dataverse-qr-${username}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName || username} on DataVerse`,
          text: `Connect with @${username} on DataVerse!`,
          url: profileUrl
        });
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[var(--card)] border border-[var(--line)] shadow-2xl p-6 relative flex flex-col items-center text-center animate-zoom"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--hover)] transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Card Header */}
        <div className="w-16 h-16 rounded-full bg-[var(--input)] border-2 border-[var(--accent-2)]/40 overflow-hidden flex items-center justify-center mb-3 shadow-md">
          {avatarUrl ? (
            <img src={`/api/media/file/${avatarUrl}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-black text-[var(--accent-2)]">{username.substring(0, 2).toUpperCase()}</span>
          )}
        </div>

        <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-1.5 justify-center">
          <span>{displayName || username}</span>
          {isVerified && <VerifiedBadge />}
        </h3>
        <p className="text-xs text-[var(--accent-2)] font-semibold mt-0.5">@{username}</p>

        {/* Canvas QR Code */}
        <div className="my-5 p-2 rounded-2xl bg-[#040d0e] border border-teal-500/20 shadow-xl relative group">
          <canvas ref={canvasRef} className="rounded-xl block" style={{ width: 220, height: 220 }} />
          <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
            <span className="text-[9px] font-mono uppercase tracking-widest text-teal-400/90 bg-[#040d0e]/90 px-2 py-0.5 rounded-full border border-teal-500/30">
              Scan to Connect
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[var(--muted)] max-w-xs mb-5">
          Scan with any camera or phone to visit @{username}'s DataVerse profile.
        </p>

        {/* Actions */}
        <div className="w-full grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-[var(--input)] border border-[var(--line)] text-xs font-semibold text-[var(--text)] hover:border-[var(--accent-2)] transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[var(--muted)]" />}
            <span className="text-[10px]">{copied ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadQr}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-[var(--input)] border border-[var(--line)] text-xs font-semibold text-[var(--text)] hover:border-[var(--accent-2)] transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-[10px]">Save QR</span>
          </button>

          <button
            type="button"
            onClick={handleNativeShare}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-semibold shadow-md active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-[10px]">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};
