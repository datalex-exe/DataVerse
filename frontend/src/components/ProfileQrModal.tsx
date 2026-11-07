import React, { useRef, useState, useEffect } from 'react';
import { X, Copy, Check, Download, Share2 } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { drawQRCodeToCanvas } from '../utils/qrCode';

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

  // Draw ISO/IEC 18004 scannable QR on canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 560;
    canvas.height = 560;
    drawQRCodeToCanvas(canvas, profileUrl, {
      darkColor: '#040b0d',
      lightColor: '#ffffff',
      quietZone: 4,
      centerText: 'DV'
    });
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

        {/* Canvas QR Code Card */}
        <div className="my-5 p-3 rounded-2xl bg-white border border-teal-500/30 shadow-2xl relative flex flex-col items-center group">
          <canvas ref={canvasRef} className="rounded-xl block" style={{ width: 220, height: 220 }} />
          <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-slate-600 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span>Scan with phone camera</span>
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
