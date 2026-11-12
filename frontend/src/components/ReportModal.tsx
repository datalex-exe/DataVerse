import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUsername?: string;
  targetPostId?: string;
  targetType?: 'user' | 'post';
  onReportSubmitted?: () => void;
}

const REPORT_CATEGORIES = [
  { id: 'harassment', label: 'Harassment & Bullying', desc: 'Targeted hostility, threats, or intimidation' },
  { id: 'hate_speech', label: 'Hate Speech & Discrimination', desc: 'Attacks on identity, slurs, or dehumanization' },
  { id: 'spam', label: 'Spam & Scam Solicitation', desc: 'Misleading links, phishing, or bulk automated activity' },
  { id: 'inappropriate_content', label: 'Inappropriate or NSFW Content', desc: 'Explicit, suggestive, or graphic imagery' },
  { id: 'impersonation', label: 'Impersonation & Stolen Identity', desc: 'Pretending to be another creator, brand, or person' },
  { id: 'fake_account', label: 'Fake Account / Bot', desc: 'Coordinated bot activity or deceptive profiles' },
  { id: 'violence', label: 'Violence & Dangerous Threats', desc: 'Calls to violence, weapons, or self-harm incitement' },
  { id: 'other', label: 'Other Policy Violation', desc: 'Any other violation of DataVerse community rules' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetUsername,
  targetPostId,
  targetType = 'user',
  onReportSubmitted,
}) => {
  const { token } = useAuth();
  const { toast } = useToast();

  const [reportType, setReportType] = useState('harassment');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('You must be signed in to submit a report.');
      return;
    }

    const trimmed = description.trim();
    if (trimmed.length < 10) {
      setErrorMsg('Please describe the issue in at least 10 characters.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      // If a post is targeted, prepend the post ID for admin reference
      const formattedDescription = targetPostId 
        ? `[Reported Post ID: ${targetPostId}]\n\n${trimmed}`
        : trimmed;

      const res = await fetch('/api/users/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          report_type: reportType,
          description: formattedDescription,
          reported_username: targetUsername || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report.');
      }

      toast.success(data.message || 'Report submitted to the DataVerse safety team. Thank you.');
      setDescription('');
      setReportType('harassment');
      if (onReportSubmitted) onReportSubmitted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while submitting your report.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none overscroll-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="w-full max-w-lg bg-[var(--card)] border border-[var(--line)] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_90%,transparent)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text)]">
                {targetType === 'post' ? 'Report Post' : `Report @${targetUsername || 'User'}`}
              </h3>
              <p className="text-[11px] text-[var(--muted)]">
                Confidential report dispatched directly to platform moderators
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-rose-400 font-semibold animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Context pill */}
          <div className="p-3 bg-[color-mix(in_srgb,var(--input)_60%,transparent)] border border-[var(--line)] rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)] font-medium">Reporting:</span>
              <span className="text-[var(--text)] font-bold">
                {targetUsername ? `@${targetUsername}` : 'Platform Content'}
              </span>
            </div>
            {targetPostId && (
              <span className="text-[10px] text-[var(--muted)] font-mono bg-[var(--hover)] px-2 py-0.5 rounded-lg border border-[var(--line)]">
                Post #{targetPostId.slice(0, 8)}
              </span>
            )}
          </div>

          {/* Category selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider">
              Reason for Report
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REPORT_CATEGORIES.map((cat) => {
                const isSelected = reportType === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setReportType(cat.id)}
                    className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-0.5 ${
                      isSelected
                        ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[var(--accent)] text-[var(--text)] ring-1 ring-[var(--accent)]'
                        : 'bg-[var(--input)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--card-border)]'
                    }`}
                  >
                    <span className="text-xs font-bold">{cat.label}</span>
                    <span className="text-[10px] text-[var(--muted)] line-clamp-1">{cat.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="report-desc" className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                Details & Description
              </label>
              <span className={`text-[10px] font-mono ${description.trim().length >= 10 ? 'text-[var(--accent-2)]' : 'text-[var(--muted)]'}`}>
                {description.trim().length}/10 min chars
              </span>
            </div>
            <textarea
              id="report-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about why this violates platform guidelines..."
              className="w-full bg-[var(--input)] border border-[var(--line)] rounded-2xl p-3.5 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            />
          </div>

          {/* Safety notice */}
          <div className="p-3.5 bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] border border-[color-mix(in_srgb,var(--accent)_15%,transparent)] rounded-2xl flex items-start gap-2.5 text-[11px] text-[var(--muted)]">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-2)] shrink-0 mt-0.5" />
            <span>
              Your report is completely confidential. Submissions go straight to the DataVerse safety & admin queue for rapid review and enforcement.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary h-10 px-4 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || description.trim().length < 10}
              className={`h-10 px-5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                submitting || description.trim().length < 10
                  ? 'opacity-40 cursor-not-allowed bg-rose-600/40 text-rose-200'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 active:scale-95'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4" />
                  <span>Submit Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

