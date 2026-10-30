import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

interface CookieBannerProps {
  onNavigate?: (view: string) => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    let timer: any = null;
    try {
      const consent = localStorage.getItem('dv-cookie-consent');
      if (!consent) {
        // Small delay so it smoothly appears after initial render
        timer = setTimeout(() => setIsVisible(true), 1200);
      }
    } catch {}
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('dv-cookie-consent', 'accepted');
    } catch {}
    setIsVisible(false);
  };

  const handleLearnMore = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('cookies');
    } else {
      window.history.pushState(null, '', '/cookies/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie and storage notice"
      className="fixed bottom-20 md:bottom-5 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50 p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-2xl backdrop-blur-lg animate-slide-up select-none"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[var(--input)] border border-[var(--line)] text-[var(--accent-2)] flex-shrink-0 mt-0.5">
          <Cookie className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xs font-bold text-[var(--text)] tracking-wide">
            Privacy & Storage Notice
          </h2>
          <p className="text-[11px] text-[var(--muted)] mt-1 leading-relaxed">
            DataVerse uses essential local storage to remember your login session and theme preferences. We do not use third-party advertising or cross-site tracking cookies.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleAccept}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-bold shadow hover:opacity-95 transition-opacity cursor-pointer min-h-[36px]"
            >
              Accept Essential
            </button>
            <a
              href="#/cookies"
              onClick={handleLearnMore}
              className="text-xs font-semibold text-[var(--accent-2)] hover:underline px-2 py-1 cursor-pointer"
            >
              Learn More
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAccept}
          aria-label="Dismiss cookie notice"
          className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;
