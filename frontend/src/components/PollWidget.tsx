import React, { useState } from 'react';
import { BarChart3, CheckCircle2, Clock } from 'lucide-react';

export interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
  percentage: number;
}

export interface PollData {
  id: string;
  question: string;
  expires_at: number;
  is_expired?: boolean;
  total_votes: number;
  user_voted_option_id: string | null;
  options: PollOption[];
}

interface PollWidgetProps {
  poll: PollData;
  token?: string | null;
  onVoteSuccess?: (updatedPoll: Partial<PollData>) => void;
}

export const PollWidget: React.FC<PollWidgetProps> = ({ poll, token, onVoteSuccess }) => {
  const [currentPoll, setCurrentPoll] = useState<PollData>(poll);
  const [submittingVote, setSubmittingVote] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const hasVoted = Boolean(currentPoll.user_voted_option_id);
  const isExpired = currentPoll.is_expired || currentPoll.expires_at < Date.now();

  const handleVote = async (optionId: string) => {
    if (!token || submittingVote || isExpired || hasVoted) return;

    setSubmittingVote(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts/polls/${currentPoll.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ optionId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit vote');
      }

      if (data.poll) {
        const updated: PollData = {
          ...currentPoll,
          total_votes: data.poll.total_votes,
          user_voted_option_id: data.poll.user_voted_option_id,
          options: data.poll.options
        };
        setCurrentPoll(updated);
        onVoteSuccess?.(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Vote failed');
    } finally {
      setSubmittingVote(false);
    }
  };

  const formatRemainingTime = (expiresAt: number) => {
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return 'Final results';
    const hours = Math.floor(diffMs / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d left`;
    }
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${Math.max(1, mins)}m left`;
  };

  return (
    <div className="w-full my-3 p-3.5 sm:p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm">
      {/* Poll Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <h4 className="text-sm font-semibold text-[var(--text)] tracking-tight">
            {currentPoll.question}
          </h4>
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {currentPoll.options.map((opt) => {
          const isSelected = currentPoll.user_voted_option_id === opt.id;
          const showResults = hasVoted || isExpired;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={submittingVote || showResults}
              onClick={() => handleVote(opt.id)}
              className={`w-full relative overflow-hidden text-left p-3 rounded-xl border transition-all text-xs sm:text-sm font-medium ${
                showResults
                  ? isSelected
                    ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]'
                    : 'border-[var(--line)] bg-[var(--input)]'
                  : 'border-[var(--line)] bg-[var(--input)] hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] active:scale-[0.99] cursor-pointer'
              }`}
            >
              {/* Animated Progress Bar Fill */}
              {showResults && (
                <div
                  style={{ width: `${opt.percentage}%` }}
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-xl opacity-25 ${
                    isSelected ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
                  }`}
                />
              )}

              {/* Option Text and Stats */}
              <div className="relative flex items-center justify-between gap-3 z-10">
                <div className="flex items-center gap-2 min-w-0">
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  )}
                  <span className={`truncate ${isSelected ? 'font-bold text-[var(--text)]' : 'text-[var(--text)]'}`}>
                    {opt.option_text}
                  </span>
                </div>
                {showResults && (
                  <div className="flex items-center gap-1.5 shrink-0 font-semibold text-xs text-[var(--muted)]">
                    <span className={isSelected ? 'text-[var(--accent)]' : ''}>{opt.percentage}%</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--line)]/60 text-[11px] text-[var(--muted)]">
        <span>{currentPoll.total_votes.toLocaleString()} {currentPoll.total_votes === 1 ? 'vote' : 'votes'}</span>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{formatRemainingTime(currentPoll.expires_at)}</span>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-[var(--danger)] font-medium">{error}</p>
      )}
    </div>
  );
};
