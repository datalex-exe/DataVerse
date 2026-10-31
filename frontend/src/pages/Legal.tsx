import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  FileText, 
  Cookie, 
  CreditCard, 
  Search, 
  WifiOff, 
  Copy, 
  Check, 
  AlertTriangle, 
  SlidersHorizontal 
} from 'lucide-react';
import { Footer } from '../components/Footer';
import { useToast } from '../context/ToastContext';

export type LegalDocType = 'terms' | 'privacy' | 'cookies' | 'refund';

export type LegalStatus = 
  | 'idle'
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline';

interface LegalProps {
  type?: LegalDocType;
  onNavigate?: (view: string) => void;
}

export const Legal: React.FC<LegalProps> = ({ type = 'terms', onNavigate }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<LegalDocType>(type);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // 10-State Architecture variables
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [previewState, setPreviewState] = useState<LegalStatus | null>(null);
  const [showPreviewToolbar, setShowPreviewToolbar] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(type);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [type]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTabChange = (newTab: LegalDocType) => {
    setIsLoading(true);
    setError(null);
    setActiveTab(newTab);
    setSearchQuery('');
    setTimeout(() => {
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);

    if (onNavigate) {
      onNavigate(newTab);
    } else {
      window.history.pushState(null, '', `/${newTab}/`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('feed');
    } else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleCopyLink = (sectionId: string, sectionTitle: string) => {
    const url = `${window.location.origin}/#/${activeTab}#${sectionId}`;
    navigator.clipboard.writeText(url);
    setCopiedSection(sectionId);
    toast.success(`Copied direct link to "${sectionTitle}"`);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // State 2: Skeleton Loader for Legal Content
  const renderLegalSkeleton = () => (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading legal documentation">
      <div className="h-4 bg-[var(--input)] rounded-md w-1/4" />
      <div className="space-y-4">
        <div className="h-6 bg-[var(--input)] rounded-lg w-1/2" />
        <div className="h-3.5 bg-[var(--input)]/70 rounded-md w-full" />
        <div className="h-3.5 bg-[var(--input)]/70 rounded-md w-5/6" />
        <div className="h-3.5 bg-[var(--input)]/50 rounded-md w-4/6" />
      </div>
      <div className="space-y-4 pt-4">
        <div className="h-6 bg-[var(--input)] rounded-lg w-2/5" />
        <div className="h-3.5 bg-[var(--input)]/70 rounded-md w-full" />
        <div className="h-3.5 bg-[var(--input)]/70 rounded-md w-3/4" />
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between py-6 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="space-y-8 flex-1">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back to main app"
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--accent-2)] uppercase tracking-wider">Datalex Legal Center</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--input)] border border-[var(--line)] text-[var(--muted)]">v2.1 · Fully Offline</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">
                {activeTab === 'terms' && 'Terms and Conditions'}
                {activeTab === 'privacy' && 'Privacy Policy'}
                {activeTab === 'cookies' && 'Cookies & Storage Policy'}
                {activeTab === 'refund' && 'Refund & Cancellation Policy'}
              </h1>
            </div>
          </div>

          {/* Quick Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleTabChange('terms')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow'
                  : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              Terms
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('privacy')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow'
                  : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Privacy
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('cookies')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'cookies'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow'
                  : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Cookie className="w-3.5 h-3.5" aria-hidden="true" />
              Cookies
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('refund')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'refund'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow'
                  : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
              Refunds
            </button>
          </div>
        </div>

        {/* State 4: Offline Notification Banner */}
        {(isOffline || previewState === 'offline') && (
          <div 
            role="status"
            aria-live="polite"
            className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl flex items-center justify-between text-xs animate-fade-in"
          >
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Offline: All legal policies are cached locally in your browser bundle and fully readable.</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400/80">Cached Document</span>
          </div>
        )}

        {/* State 3: Error Banner */}
        {(error || previewState === 'error') && (
          <div 
            role="alert"
            aria-live="assertive"
            className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-2xl flex items-center justify-between animate-fade-in"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Policy Viewer Warning</p>
                <p className="text-red-300/80 mt-0.5">{error || 'Failed to render legal appendix. Fallback plain text loaded.'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setError(null); setPreviewState(null); }}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
            >
              Reload Document
            </button>
          </div>
        )}

        {/* Search & Clause Filter Bar */}
        <div className="relative">
          <label htmlFor="legal-search-input" className="sr-only">Search within this policy</label>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
          <input
            id="legal-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search within ${activeTab === 'terms' ? 'Terms' : activeTab === 'privacy' ? 'Privacy' : activeTab === 'cookies' ? 'Cookies' : 'Refunds'} (e.g. data, deletion, payment)...`}
            className="w-full min-h-[44px] bg-[var(--input)] border border-[var(--line)] rounded-2xl pl-11 pr-4 py-2.5 text-xs text-[var(--text)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 focus:border-[var(--accent-2)] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--muted)] hover:text-[var(--text)] px-2 py-1 bg-[var(--card)] rounded-lg transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Content Body */}
        <article className="prose prose-invert max-w-none text-xs sm:text-sm text-[var(--muted)] leading-relaxed space-y-6 bg-[var(--card)] p-6 sm:p-8 rounded-3xl border border-[var(--line)] shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-4">
            <p className="text-[11px] text-[var(--muted)] font-mono">Last updated: October 26, 2026 · Operator: Datalex</p>
            <span className="text-[10px] font-bold text-[var(--accent-2)] bg-[var(--input)] px-2.5 py-1 rounded-full border border-[var(--line)]">
              Official Legal Policy
            </span>
          </div>

          {(isLoading || previewState === 'loading') ? (
            renderLegalSkeleton()
          ) : previewState === 'empty' ? (
            <div className="text-center py-16 px-4 space-y-3">
              <Search className="w-8 h-8 text-[var(--muted)] mx-auto opacity-40" />
              <p className="text-sm font-bold text-[var(--text)]">No clauses matching "{searchQuery || 'preview query'}"</p>
              <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
                Try searching for related keywords like "account", "privacy", "payment", or clear the filter.
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setPreviewState(null); }}
                className="px-4 py-2 bg-[var(--input)] hover:bg-[var(--hover)] text-[var(--text)] border border-[var(--line)] rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          ) : (
            <>
              {/* ─── TERMS AND CONDITIONS ────────────────────────────────────── */}
              {activeTab === 'terms' && (
                <div className="space-y-6">
                  {(!searchQuery || 'agreement to terms'.includes(searchQuery.toLowerCase()) || 'binding agreement'.includes(searchQuery.toLowerCase())) && (
                    <section id="terms-1" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">1. Agreement to Terms</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('terms-1', 'Agreement to Terms')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'terms-1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>
                        These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity (“you”) and Datalex (“we”, “us”, or “our”), concerning your access to and use of the DataVerse application and website (<code className="text-[var(--accent-2)]">https://dataverse.datalexcloud.tech</code>).
                      </p>
                      <p className="mt-2">
                        By creating an account or accessing the platform, you agree that you have read, understood, and agree to be bound by all of these Terms. If you do not agree with all of these terms, you are expressly prohibited from using the platform.
                      </p>
                    </section>
                  )}

                  {(!searchQuery || 'registration security password'.includes(searchQuery.toLowerCase())) && (
                    <section id="terms-2" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">2. User Registration & Account Security</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('terms-2', 'User Registration & Security')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'terms-2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>
                        You agree to keep your password confidential and will be responsible for all use of your account and password. You must provide accurate, current, and complete registration information. You may not select or use as a username the name of another person with the intent to impersonate that person.
                      </p>
                    </section>
                  )}

                  {(!searchQuery || 'prohibited community abuse spam'.includes(searchQuery.toLowerCase())) && (
                    <section id="terms-3" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">3. Prohibited Activities & Community Standards</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('terms-3', 'Prohibited Activities')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'terms-3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>You may not access or use the platform for any purpose other than that for which we make it available. Prohibited activities include:</p>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Harassing, threatening, or abusing any user, administrator, or employee.</li>
                        <li>Uploading content that is unlawful, defamatory, obscene, or infringing on intellectual property rights.</li>
                        <li>Attempting to bypass security headers, rate limiters, or authentication mechanisms.</li>
                        <li>Engaging in unauthorized automated scraping, bot attacks, or brute force attempts.</li>
                      </ul>
                    </section>
                  )}

                  {(!searchQuery || 'termination moderation suspend'.includes(searchQuery.toLowerCase())) && (
                    <section id="terms-4" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">4. Account Termination & Moderation</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('terms-4', 'Termination & Moderation')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'terms-4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>
                        Datalex administrators reserve the right to suspend, restrict, or terminate any account that violates these terms or engages in platform abuse, without prior notice.
                      </p>
                    </section>
                  )}

                  {(!searchQuery || 'contact information legal support'.includes(searchQuery.toLowerCase())) && (
                    <section id="terms-5" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">5. Contact Information</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('terms-5', 'Contact Information')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'terms-5' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>For any legal inquiries regarding these Terms, contact our legal team at <a href="mailto:dataverse@datalexcloud.tech" className="text-[var(--accent-2)] underline font-semibold">dataverse@datalexcloud.tech</a> or through our in-app Contact form.</p>
                    </section>
                  )}
                </div>
              )}

              {/* ─── PRIVACY POLICY ──────────────────────────────────────────── */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  {(!searchQuery || 'data minimization privacy collect'.includes(searchQuery.toLowerCase())) && (
                    <section id="priv-1" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">1. Data Minimization Commitment</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('priv-1', 'Data Minimization Commitment')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'priv-1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>
                        Datalex respects your privacy. We collect only the minimum personal data required to deliver real-time social networking, messaging, and authentication features on DataVerse.
                      </p>
                    </section>
                  )}

                  {(!searchQuery || 'information collect account password hash content'.includes(searchQuery.toLowerCase())) && (
                    <section id="priv-2" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">2. Information We Collect</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('priv-2', 'Information We Collect')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'priv-2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong className="text-[var(--text)]">Account Information:</strong> Username, email address, display name, and password hash (PBKDF2 HMAC-SHA256 with individual cryptographic salt). We never store raw passwords.</li>
                        <li><strong className="text-[var(--text)]">User-Generated Content:</strong> Posts, captions, and comments. Photos and direct chat messages are not saved for profiling or monetization; they are monitored strictly for legal actions and regulatory compliance.</li>
                        <li><strong className="text-[var(--text)]">Verification Metadata:</strong> Verification badge category and document URLs for users who optionally request identity verification. This data will be reset in 30 days.</li>
                        <li><strong className="text-[var(--text)]">Technical Telemetry:</strong> IP addresses and sliding-window rate counters used exclusively to prevent brute-force attacks and abuse.</li>
                      </ul>
                    </section>
                  )}

                  {(!searchQuery || 'storage infrastructure cloudflare encryption'.includes(searchQuery.toLowerCase())) && (
                    <section id="priv-3" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">3. Storage & Infrastructure</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('priv-3', 'Storage & Infrastructure')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'priv-3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>
                        DataVerse is hosted on Cloudflare's secure global edge network utilizing Cloudflare D1 (encrypted relational database storage) and Cloudflare Workers KV. Data is encrypted in transit via TLS 1.3 and protected by strict Content Security Policies.
                      </p>
                    </section>
                  )}

                  {(!searchQuery || 'third-party sharing advertising broker'.includes(searchQuery.toLowerCase())) && (
                    <section id="priv-4" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">4. Third-Party Sharing</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('priv-4', 'Third-Party Sharing')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'priv-4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>
                        We <strong className="text-[var(--text)]">never</strong> sell, rent, or monetize your personal data with third-party advertisers or data brokers. Third-party integrations are limited strictly to essential operational infrastructure (Cloudflare, MailChannels for administrative alerts).
                      </p>
                    </section>
                  )}

                  {(!searchQuery || 'data rights gdpr deletion erasure export'.includes(searchQuery.toLowerCase())) && (
                    <section id="priv-5" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">5. Your Data Rights & Account Deletion</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('priv-5', 'Data Rights & Account Deletion')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'priv-5' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>
                        Under applicable privacy laws (including GDPR and CCPA), you have the right to access, rectify, export, or permanently delete your personal information. You may delete individual posts or request complete account erasure by contacting our team via the in-app Contact form or emailing <a href="mailto:dataverse@datalexcloud.tech" className="text-[var(--accent-2)] underline font-semibold">dataverse@datalexcloud.tech</a>.
                      </p>
                    </section>
                  )}
                </div>
              )}

              {/* ─── COOKIES & STORAGE POLICY ────────────────────────────────── */}
              {activeTab === 'cookies' && (
                <div className="space-y-6">
                  {(!searchQuery || 'local storage cookies token storage'.includes(searchQuery.toLowerCase())) && (
                    <section id="cookie-1" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">1. Use of Local Storage & Cookies</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('cookie-1', 'Use of Local Storage')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'cookie-1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>
                        DataVerse uses modern client-side storage technologies (<code className="text-[var(--accent-2)]">localStorage</code>) and essential session tokens strictly necessary for the application to function.
                      </p>
                    </section>
                  )}

                  {(!searchQuery || 'keys jwt token theme cookie consent'.includes(searchQuery.toLowerCase())) && (
                    <section id="cookie-2" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">2. What We Store</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('cookie-2', 'What We Store')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'cookie-2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-[var(--line)] rounded-xl mt-3">
                          <thead className="bg-[var(--input)] text-[var(--text)] font-bold">
                            <tr>
                              <th className="p-2.5 border-b border-[var(--line)]">Key Name</th>
                              <th className="p-2.5 border-b border-[var(--line)]">Type</th>
                              <th className="p-2.5 border-b border-[var(--line)]">Purpose</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--line)]">
                            <tr>
                              <td className="p-2.5 font-mono text-[var(--accent-2)]">token</td>
                              <td className="p-2.5">localStorage</td>
                              <td className="p-2.5">Cryptographic JWT bearer token for authenticating your active session.</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-mono text-[var(--accent-2)]">user</td>
                              <td className="p-2.5">localStorage</td>
                              <td className="p-2.5">Cached user profile metadata (username, avatar, admin status).</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-mono text-[var(--accent-2)]">dv-theme</td>
                              <td className="p-2.5">localStorage</td>
                              <td className="p-2.5">Theme preference ('dark' or 'light').</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-mono text-[var(--accent-2)]">dv-cookie-consent</td>
                              <td className="p-2.5">localStorage</td>
                              <td className="p-2.5">Tracks cookie consent banner acknowledgment.</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {(!searchQuery || 'behavioral tracking analytics beacon third-party'.includes(searchQuery.toLowerCase())) && (
                    <section id="cookie-3" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">3. No Behavioral Tracking Cookies</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('cookie-3', 'No Behavioral Tracking')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'cookie-3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>
                        We do not employ third-party advertising cookies, cross-site trackers, or marketing beacons. You may clear your browser's local storage at any time through your browser settings.
                      </p>
                    </section>
                  )}
                </div>
              )}

              {/* ─── REFUND & CANCELLATION POLICY ───────────────────────────── */}
              {activeTab === 'refund' && (
                <div className="space-y-6">
                  {(!searchQuery || 'digital goods verification service fees review'.includes(searchQuery.toLowerCase())) && (
                    <section id="ref-1" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">1. Digital Goods & Verification Services</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('ref-1', 'Digital Goods & Services')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'ref-1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>
                        DataVerse offers voluntary identity verification badge reviews. Fees charged for verification cover the manual and automated credential evaluation processed by Datalex administrators.
                      </p>
                    </section>
                  )}

                  {(!searchQuery || 'refund eligibility duplicate transaction cancellation'.includes(searchQuery.toLowerCase())) && (
                    <section id="ref-2" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">2. Refund Eligibility</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('ref-2', 'Refund Eligibility')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'ref-2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong className="text-[var(--text)]">Duplicate Transactions:</strong> Full refunds will be granted automatically for accidental duplicate billing charges.</li>
                        <li><strong className="text-[var(--text)]">Pre-Review Cancellation:</strong> If you request cancellation before your verification document review has commenced, a full refund may be issued.</li>
                        <li><strong className="text-[var(--text)]">Completed Reviews:</strong> Once a verification review has been completed and decided according to community rules, evaluation service fees are non-refundable.</li>
                      </ul>
                    </section>
                  )}

                  {(!searchQuery || 'processing timeline business days contact dispute'.includes(searchQuery.toLowerCase())) && (
                    <section id="ref-3" className="space-y-2 p-3 rounded-2xl hover:bg-[var(--hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-[var(--text)]">3. Processing Timelines & Contact</h2>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('ref-3', 'Processing Timelines')}
                          title="Copy link to clause"
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                        >
                          {copiedSection === 'ref-3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p>
                        Approved refunds are processed within 5–7 business days to the original payment method. For billing disputes or refund requests, please email <a href="mailto:dataverse@datalexcloud.tech" className="text-[var(--accent-2)] underline font-semibold">dataverse@datalexcloud.tech</a> or submit an inquiry through our in-app Contact form with your username and transaction reference.
                      </p>
                    </section>
                  )}
                </div>
              )}
            </>
          )}
        </article>
      </div>

      {/* State Preview Toolbar (Only shown in local dev or via ?debug_states=1) */}
      {(import.meta.env.DEV || (typeof window !== 'undefined' && window.location.search.includes('debug_states=1'))) && (
        <aside 
          aria-label="UI State Inspector"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[var(--card)]/95 backdrop-blur-md border border-[var(--card-border)] rounded-full shadow-2xl px-3 py-1.5 flex items-center gap-1.5 text-xs text-[var(--muted)] select-none"
        >
          <button
            type="button"
            onClick={() => setShowPreviewToolbar(!showPreviewToolbar)}
            className="flex items-center gap-1.5 font-bold text-[var(--text)] px-2 py-1 hover:text-[var(--accent-2)] transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent-2)]" />
            <span className="text-[11px]">States</span>
          </button>
          {showPreviewToolbar && (
            <div className="flex items-center gap-1 border-l border-[var(--line)] pl-2 overflow-x-auto max-w-[80vw]">
              {(['idle', 'loading', 'empty', 'error', 'offline'] as LegalStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    if (st === 'idle') {
                      setPreviewState(null);
                      setIsLoading(false);
                      setError(null);
                      setIsOffline(false);
                      setSearchQuery('');
                    } else if (st === 'loading') {
                      setPreviewState('loading');
                    } else if (st === 'empty') {
                      setPreviewState('empty');
                    } else if (st === 'error') {
                      setPreviewState('error');
                    } else if (st === 'offline') {
                      setPreviewState('offline');
                      setIsOffline(true);
                    }
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                    previewState === st || (st === 'idle' && !previewState && !error && !isOffline)
                      ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                      : 'hover:bg-[var(--hover)] text-[var(--muted)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </aside>
      )}

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default Legal;
