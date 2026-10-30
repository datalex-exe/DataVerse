import React from 'react';

interface FooterProps {
  onNavigate?: (view: string) => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, className = '' }) => {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (e: React.MouseEvent, route: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(route);
    } else {
      window.history.pushState(null, '', `/${route}/`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <footer 
      aria-label="Application Footer"
      className={`w-full py-6 mt-8 border-t border-[var(--line)] text-center text-xs text-[var(--muted)] select-none ${className}`}
    >
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-3">
        {/* Navigation links */}
        <nav aria-label="Legal and About Links" className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-[var(--muted)]">
          <a
            href="/terms/"
            onClick={(e) => handleLinkClick(e, 'terms')}
            className="hover:text-[var(--accent-2)] transition-colors cursor-pointer py-1"
          >
            Terms of Service
          </a>
          <span aria-hidden="true" className="text-[var(--line)]">·</span>
          <a
            href="/privacy/"
            onClick={(e) => handleLinkClick(e, 'privacy')}
            className="hover:text-[var(--accent-2)] transition-colors cursor-pointer py-1"
          >
            Privacy Policy
          </a>
          <span aria-hidden="true" className="text-[var(--line)]">·</span>
          <a
            href="/cookies/"
            onClick={(e) => handleLinkClick(e, 'cookies')}
            className="hover:text-[var(--accent-2)] transition-colors cursor-pointer py-1"
          >
            Cookies Policy
          </a>
          <span aria-hidden="true" className="text-[var(--line)]">·</span>
          <a
            href="/refund/"
            onClick={(e) => handleLinkClick(e, 'refund')}
            className="hover:text-[var(--accent-2)] transition-colors cursor-pointer py-1"
          >
            Refund Policy
          </a>
          <span aria-hidden="true" className="text-[var(--line)]">·</span>
          <a
            href="/contact/"
            onClick={(e) => handleLinkClick(e, 'contact')}
            className="hover:text-[var(--accent-2)] transition-colors cursor-pointer py-1"
          >
            Support & Contact
          </a>
        </nav>

        {/* Dynamic Copyright with owner Datalex - Single line guaranteed */}
        <p className="text-[10px] sm:text-[11px] font-medium text-[var(--muted)] whitespace-nowrap tracking-tight text-center max-w-full">
          <span>&copy; {currentYear}</span>{' '}
          <span className="font-bold text-[var(--text)]">Datalex</span>{' '}
          <span aria-hidden="true" className="mx-0.5 text-[var(--line)]">·</span>{' '}
          <span>DataVerse Social Network. All rights reserved.</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
