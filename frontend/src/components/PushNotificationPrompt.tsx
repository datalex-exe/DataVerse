import React, { useState, useEffect } from 'react';
import { Bell, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { isPushSupported, getPushPermission, subscribeToPush } from '../utils/push';
import { useAuth } from '../context/AuthContext';
import { DataVerseLogo } from './DataVerseLogo';

export const PushNotificationPrompt: React.FC = () => {
  const { token } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Only show if push is supported and permission hasn't been decided yet
    if (!isPushSupported()) return;

    let timer: any = null;
    try {
      const dismissed = sessionStorage.getItem('dv_push_prompt_dismissed');
      const alreadySubscribed = localStorage.getItem('dv_push_subscribed');
      const permission = getPushPermission();

      if (!dismissed && !alreadySubscribed && permission === 'default') {
        // Show after a gentle 3-second delay so it doesn't interrupt page opening
        timer = setTimeout(() => {
          setIsVisible(true);
        }, 3000);
      }
    } catch {}

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleEnable = async () => {
    setIsSubscribing(true);
    const result = await subscribeToPush(token);
    setIsSubscribing(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem('dv_push_prompt_dismissed', 'true');
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <div 
      role="dialog"
      aria-label="Enable notifications"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-[var(--card)]/95 backdrop-blur-xl border border-[color-mix(in_srgb,var(--accent-2)_30%,var(--line))] rounded-2xl p-4 shadow-2xl animate-fade-in select-none"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0b343d] via-[#041d22] to-[#031317] border border-[var(--accent-2)]/40 shadow-[0_0_12px_rgba(45,212,191,0.25)] flex items-center justify-center p-1 flex-shrink-0">
          <DataVerseLogo size={32} rounded="full" className="w-full h-full object-contain" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-[var(--text)]">Stay Connected to DataVerse</h4>
            <Sparkles className="w-3 h-3 text-[var(--accent-2)] flex-shrink-0" />
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">
            Receive native pop-up notifications on your screen for messages, replies, and community updates even when the site is closed.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={isSubscribing || success}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {success ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-950" />
                  <span>Enabled!</span>
                </>
              ) : isSubscribing ? (
                <span>Enabling...</span>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Enable Pop-ups</span>
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-all cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification prompt"
          className="p-1 text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--hover)] transition-all cursor-pointer -mt-1 -mr-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
