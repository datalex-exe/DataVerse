import React, { useEffect } from 'react';
import { ArrowLeft, ShieldCheck, FileText, Cookie, CreditCard } from 'lucide-react';
import { Footer } from '../components/Footer';

export type LegalDocType = 'terms' | 'privacy' | 'cookies' | 'refund';

interface LegalProps {
  type?: LegalDocType;
  onNavigate?: (view: string) => void;
}

export const Legal: React.FC<LegalProps> = ({ type = 'terms', onNavigate }) => {
  const [activeTab, setActiveTab] = React.useState<LegalDocType>(type);

  useEffect(() => {
    setActiveTab(type);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [type]);

  const handleTabChange = (newTab: LegalDocType) => {
    setActiveTab(newTab);
    window.location.hash = `#/${newTab}`;
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('feed');
    } else {
      window.location.hash = '#/feed';
    }
  };

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
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--input)] border border-[var(--line)] text-[var(--muted)]">v2.1</span>
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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

        {/* Content Body */}
        <article className="prose prose-invert max-w-none text-xs sm:text-sm text-[var(--muted)] leading-relaxed space-y-6 bg-[var(--card)] p-6 sm:p-8 rounded-3xl border border-[var(--line)] shadow-xl">
          <p className="text-[11px] text-[var(--muted)] font-mono">Last updated: October 26, 2026 · Operator: Datalex</p>

          {/* ─── TERMS AND CONDITIONS ────────────────────────────────────── */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">1. Agreement to Terms</h2>
                <p>
                  These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity (“you”) and Datalex (“we”, “us”, or “our”), concerning your access to and use of the DataVerse application and website (<code className="text-[var(--accent-2)]">https://dataverse-datalex.pages.dev</code>).
                </p>
                <p className="mt-2">
                  By creating an account or accessing the platform, you agree that you have read, understood, and agree to be bound by all of these Terms. If you do not agree with all of these terms, you are expressly prohibited from using the platform.
                </p>
              </section>

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">2. User Registration & Account Security</h2>
                <p>
                  You agree to keep your password confidential and will be responsible for all use of your account and password. You must provide accurate, current, and complete registration information. You may not select or use as a username the name of another person with the intent to impersonate that person.
                </p>
              </section>

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">3. Prohibited Activities & Community Standards</h2>
                <p>You may not access or use the platform for any purpose other than that for which we make it available. Prohibited activities include:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Harassing, threatening, or abusing any user, administrator, or employee.</li>
                  <li>Uploading content that is unlawful, defamatory, obscene, or infringing on intellectual property rights.</li>
                  <li>Attempting to bypass security headers, rate limiters, or authentication mechanisms.</li>
                  <li>Engaging in unauthorized automated scraping, bot attacks, or brute force attempts.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">4. Account Termination & Moderation</h2>
                <p>
                  Datalex administrators reserve the right to suspend, restrict, or terminate any account that violates these terms or engages in platform abuse, without prior notice.
                </p>
              </section>

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">5. Contact Information</h2>
                <p>For any legal inquiries regarding these Terms, contact our legal team at <a href="mailto:datalex.exe@gmail.com" className="text-[var(--accent-2)] underline">datalex.exe@gmail.com</a>.</p>
              </section>
            </div>
          )}

          {/* ─── PRIVACY POLICY ──────────────────────────────────────────── */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">1. Data Minimization Commitment</h2>
                <p>
                  Datalex respects your privacy. We collect only the minimum personal data required to deliver real-time social networking, messaging, and authentication features on DataVerse.
                </p>
              </section>

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">2. Information We Collect</h2>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong className="text-[var(--text)]">Account Information:</strong> Username, email address, display name, and password hash (PBKDF2 HMAC-SHA256 with individual cryptographic salt). We never store raw passwords.</li>
                  <li><strong className="text-[var(--text)]">User-Generated Content:</strong> Posts, photos, captions, comments, and direct chat messages created on the platform.</li>
                  <li><strong className="text-[var(--text)]">Verification Metadata:</strong> Verification badge category and document URLs for users who optionally request identity verification.</li>
                  <li><strong className="text-[var(--text)]">Technical Telemetry:</strong> IP addresses and sliding-window rate counters used exclusively to prevent brute-force attacks and abuse.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">3. Storage & Infrastructure</h2>
                <p>
                  DataVerse is hosted on Cloudflare's secure global edge network utilizing Cloudflare D1 (encrypted relational database storage) and Cloudflare Workers KV. Data is encrypted in transit via TLS 1.3 and protected by strict Content Security Policies.
                </p>
              </section>

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">4. Third-Party Sharing</h2>
                <p>
                  We <strong className="text-[var(--text)]">never</strong> sell, rent, or monetize your personal data with third-party advertisers or data brokers. Third-party integrations are limited strictly to essential operational infrastructure (Cloudflare, MailChannels for administrative alerts).
                </p>
              </section>

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">5. Your Data Rights & Account Deletion</h2>
                <p>
                  Under applicable privacy laws (including GDPR and CCPA), you have the right to access, rectify, export, or permanently delete your personal information. You may delete individual posts or request complete account erasure by contacting <a href="mailto:datalex.exe@gmail.com" className="text-[var(--accent-2)] underline">datalex.exe@gmail.com</a>.
                </p>
              </section>
            </div>
          )}

          {/* ─── COOKIES & STORAGE POLICY ────────────────────────────────── */}
          {activeTab === 'cookies' && (
            <div className="space-y-6">
              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">1. Use of Local Storage & Cookies</h2>
                <p>
                  DataVerse uses modern client-side storage technologies (<code className="text-[var(--accent-2)]">localStorage</code>) and essential session tokens strictly necessary for the application to function.
                </p>
              </section>

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">2. What We Store</h2>
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

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">3. No Behavioral Tracking Cookies</h2>
                <p>
                  We do not employ third-party advertising cookies, cross-site trackers, or marketing beacons. You may clear your browser's local storage at any time through your browser settings.
                </p>
              </section>
            </div>
          )}

          {/* ─── REFUND & CANCELLATION POLICY ───────────────────────────── */}
          {activeTab === 'refund' && (
            <div className="space-y-6">
              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">1. Digital Goods & Verification Services</h2>
                <p>
                  DataVerse offers voluntary identity verification badge reviews. Fees charged for verification cover the manual and automated credential evaluation processed by Datalex administrators.
                </p>
              </section>

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">2. Refund Eligibility</h2>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong className="text-[var(--text)]">Duplicate Transactions:</strong> Full refunds will be granted automatically for accidental duplicate billing charges.</li>
                  <li><strong className="text-[var(--text)]">Pre-Review Cancellation:</strong> If you request cancellation before your verification document review has commenced, a full refund may be issued.</li>
                  <li><strong className="text-[var(--text)]">Completed Reviews:</strong> Once a verification review has been completed and decided according to community rules, evaluation service fees are non-refundable.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-extrabold text-[var(--text)] mb-2">3. Processing Timelines & Contact</h2>
                <p>
                  Approved refunds are processed within 5–7 business days to the original payment method. For billing disputes or refund requests, please email <a href="mailto:datalex.exe@gmail.com" className="text-[var(--accent-2)] underline">datalex.exe@gmail.com</a> with your username and transaction reference.
                </p>
              </section>
            </div>
          )}
        </article>
      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default Legal;
