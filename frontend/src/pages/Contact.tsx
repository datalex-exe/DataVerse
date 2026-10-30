import React, { useState } from 'react';
import { ArrowLeft, Mail, Send, CheckCircle2, AlertCircle, Clock, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Footer } from '../components/Footer';

interface ContactProps {
  onNavigate?: (view: string) => void;
}

export const Contact: React.FC<ContactProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState<string>(user?.display_name || user?.username || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [topic, setTopic] = useState<string>('General Inquiries');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [consent, setConsent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('feed');
    } else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!consent) {
      setErrorMessage('Please accept the privacy consent acknowledgment before sending.');
      return;
    }

    if (message.trim().length < 10) {
      setErrorMessage('Please enter a message with at least 10 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          topic,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit contact message. Please try again.');
      }

      setSubmitted(true);
      toast.success('Your message has been sent to dataverse@datalexcloud.tech');
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
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
              aria-label="Back to main application"
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--accent-2)] uppercase tracking-wider">Datalex Support</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--input)] border border-[var(--line)] text-[var(--muted)]">Direct Channel</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">Contact Us</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--muted)] bg-[var(--card)] px-3.5 py-2 rounded-xl border border-[var(--line)]">
            <Mail className="w-4 h-4 text-[var(--accent-2)] flex-shrink-0" />
            <span>Official Email:</span>
            <a href="mailto:dataverse@datalexcloud.tech" className="text-[var(--text)] font-semibold hover:text-[var(--accent-2)] transition-colors">
              dataverse@datalexcloud.tech
            </a>
          </div>
        </div>

        {/* Business & Support Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--accent-2)]">
              <Clock className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Fast Turnaround</h2>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Inquiries dispatched to <span className="text-[var(--text)] font-medium">dataverse@datalexcloud.tech</span> are reviewed within 24–48 business hours.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--accent-2)]">
              <Shield className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">30-Day Data Reset</h2>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Verification metadata and attached documents are automatically reset and purged within 30 days of submission.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--accent-2)]">
              <Sparkles className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Direct Dispatch</h2>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Submissions securely route through Cloudflare Edge straight to our executive administration inbox at Datalex.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-6 sm:p-8 shadow-xl shadow-[var(--shadow-card)]">
          {submitted ? (
            <div className="py-12 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[var(--accent)]/15 border border-[var(--accent-2)]/30 flex items-center justify-center text-[var(--accent-2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-[var(--text)]">Message Dispatched!</h2>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Thank you, <strong className="text-[var(--text)]">{name}</strong>. Your inquiry regarding <strong className="text-[var(--text)]">{topic}</strong> has been transmitted to <span className="text-[var(--accent-2)] font-semibold">dataverse@datalexcloud.tech</span>. A copy is logged in our administrative portal.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setSubject('');
                    setMessage('');
                    setConsent(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--input)] hover:bg-[var(--hover)] text-[var(--text)] transition-colors cursor-pointer"
                >
                  Send Another Inquiry
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow hover:opacity-95 transition-all cursor-pointer"
                >
                  Return to Feed
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-lg font-black text-[var(--text)]">Send us a Message</h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Fill in the details below. Our team receives your communication directly at <strong className="text-[var(--accent-2)]">dataverse@datalexcloud.tech</strong>.
                </p>
              </div>

              {errorMessage && (
                <div role="alert" className="p-3.5 rounded-xl bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-xs text-[var(--danger)] flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5 text-left">
                  <label htmlFor="contact-name" className="text-xs font-bold text-[var(--text)] block">
                    Your Name or Username <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Vance"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--input)] border border-[var(--line)] text-xs text-[var(--text)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 focus:border-[var(--accent-2)] transition-all"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5 text-left">
                  <label htmlFor="contact-email" className="text-xs font-bold text-[var(--text)] block">
                    Your Email Address <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--input)] border border-[var(--line)] text-xs text-[var(--text)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 focus:border-[var(--accent-2)] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Topic / Category */}
                <div className="space-y-1.5 text-left">
                  <label htmlFor="contact-topic" className="text-xs font-bold text-[var(--text)] block">
                    Topic / Department <span className="text-[var(--danger)]">*</span>
                  </label>
                  <select
                    id="contact-topic"
                    name="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--input)] border border-[var(--line)] text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 focus:border-[var(--accent-2)] transition-all cursor-pointer"
                  >
                    <option value="General Inquiries">General Inquiries & Feedback</option>
                    <option value="Verification Support">Identity Verification (30-Day Reset)</option>
                    <option value="Account & Login">Account & Login Support</option>
                    <option value="Privacy & GDPR">Privacy, Rights & Account Deletion</option>
                    <option value="Bug Report">Bug Report or Technical Glitch</option>
                    <option value="Billing & Refund">Billing, Paid Features & Refunds</option>
                  </select>
                </div>

                {/* Subject */}
                <div className="space-y-1.5 text-left">
                  <label htmlFor="contact-subject" className="text-xs font-bold text-[var(--text)] block">
                    Subject Line <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your request"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--input)] border border-[var(--line)] text-xs text-[var(--text)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 focus:border-[var(--accent-2)] transition-all"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center">
                  <label htmlFor="contact-message" className="text-xs font-bold text-[var(--text)]">
                    Detailed Message <span className="text-[var(--danger)]">*</span>
                  </label>
                  <span className={`text-[10px] ${message.length < 10 ? 'text-[var(--muted)]' : 'text-[var(--accent-2)] font-semibold'}`}>
                    {message.length} characters (min 10)
                  </span>
                </div>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we assist you? Please provide any relevant usernames, transaction IDs, or details..."
                  className="w-full px-4 py-3 rounded-2xl bg-[var(--input)] border border-[var(--line)] text-xs text-[var(--text)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 focus:border-[var(--accent-2)] transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Explicit Consent Checkbox (GDPR requirement) */}
              <div className="flex items-start gap-2.5 pt-1 text-left">
                <input
                  id="contact-consent"
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--line)] bg-[var(--input)] text-[var(--accent)] accent-[var(--accent)] cursor-pointer focus:ring-2 focus:ring-[var(--accent-2)]/30 flex-shrink-0"
                />
                <label htmlFor="contact-consent" className="text-[11px] text-[var(--muted)] leading-snug cursor-pointer select-none">
                  I agree that my submitted information will be transmitted to{' '}
                  <span className="text-[var(--text)] font-semibold">dataverse@datalexcloud.tech</span>{' '}
                  and processed strictly to evaluate and resolve my inquiry pursuant to DataVerse's{' '}
                  <a href="#/privacy" target="_blank" rel="noreferrer" className="text-[var(--accent-2)] hover:underline font-semibold">Privacy Policy</a>.
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !consent || message.trim().length < 10 || !name.trim() || !email.trim() || !subject.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] rounded-xl font-bold tracking-wide shadow-lg shadow-[var(--shadow-accent)] active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] disabled:opacity-50 disabled:scale-100 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed min-h-[44px]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting to dataverse@datalexcloud.tech...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default Contact;
