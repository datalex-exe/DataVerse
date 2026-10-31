import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Shield, 
  Sparkles, 
  WifiOff, 
  RefreshCw, 
  Copy, 
  Check, 
  SlidersHorizontal 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Footer } from '../components/Footer';

export type ContactStatus = 
  | 'idle'
  | 'loading'
  | 'validation'
  | 'error'
  | 'offline'
  | 'slow'
  | 'success';

interface ContactProps {
  onNavigate?: (view: string) => void;
}

const DRAFT_KEY = 'dv_contact_draft';

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
  const [ticketRef, setTicketRef] = useState<string>('');
  const [copiedRef, setCopiedRef] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Field touch tracking for inline validation
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // 10-State Architecture variables
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isSlowNetwork, setIsSlowNetwork] = useState<boolean>(false);
  const [previewState, setPreviewState] = useState<ContactStatus | null>(null);
  const [showPreviewToolbar, setShowPreviewToolbar] = useState<boolean>(false);
  const slowTimerRef = useRef<any>(null);

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.subject && !subject) setSubject(parsed.subject);
        if (parsed.message && !message) setMessage(parsed.message);
        if (parsed.topic) setTopic(parsed.topic);
      }
    } catch {}
  }, []);

  // Auto-save draft on user edits
  useEffect(() => {
    if (!submitted) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, message, topic }));
      } catch {}
    }
  }, [subject, message, topic, submitted]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, []);

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('feed');
    } else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Validation rules
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isNameValid = name.trim().length > 0;
  const isEmailValid = emailRegex.test(email.trim());
  const isSubjectValid = subject.trim().length >= 3;
  const isMessageValid = message.trim().length >= 10;
  const isConsentValid = consent;
  const isFormValid = isNameValid && isEmailValid && isSubjectValid && isMessageValid && isConsentValid;

  const handleCopyRef = () => {
    if (!ticketRef) return;
    navigator.clipboard.writeText(ticketRef);
    setCopiedRef(true);
    toast.success('Inquiry reference copied to clipboard');
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Mark all as touched
    setTouched({
      name: true,
      email: true,
      subject: true,
      message: true,
      consent: true
    });

    if (!isFormValid) {
      if (!isNameValid) setErrorMessage('Please enter your full name or account handle.');
      else if (!isEmailValid) setErrorMessage('Please provide a valid email address so we can reply to you.');
      else if (!isSubjectValid) setErrorMessage('Please provide a descriptive subject line (minimum 3 characters).');
      else if (!isMessageValid) setErrorMessage('Please enter a message with at least 10 characters.');
      else if (!isConsentValid) setErrorMessage('Please accept the privacy consent acknowledgment before sending.');
      return;
    }

    if (isOffline) {
      setErrorMessage('You are currently offline. Your message draft has been saved. Please connect to the internet to submit.');
      return;
    }

    setLoading(true);
    setIsSlowNetwork(false);

    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      setIsSlowNetwork(true);
    }, 3500);

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
        throw new Error(data.error || 'The support dispatch service is momentarily unavailable. Please retry or email directly.');
      }

      const generatedRef = `DV-INQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setTicketRef(generatedRef);
      setSubmitted(true);
      sessionStorage.removeItem(DRAFT_KEY);
      toast.success('Your message has been sent to dataverse@datalexcloud.tech');
    } catch (err: any) {
      const msg = err.message || 'An unexpected network error occurred. Your message has been saved in this form.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setLoading(false);
      setIsSlowNetwork(false);
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

        {/* State 4: Offline Alert */}
        {(isOffline || previewState === 'offline') && (
          <div 
            role="alert"
            aria-live="polite"
            className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl flex items-center justify-between text-xs animate-fade-in"
          >
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Offline: Dispatch is paused. Your draft is auto-saved locally. Connect to send.</span>
            </div>
            <a 
              href="mailto:dataverse@datalexcloud.tech"
              className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-bold hover:bg-amber-500/30 transition-colors shrink-0"
            >
              Open Email App
            </a>
          </div>
        )}

        {/* State 5: Slow Network Reassurance */}
        {(isSlowNetwork || previewState === 'slow') && !isOffline && (
          <div 
            role="status"
            aria-live="polite"
            className="p-3.5 bg-[var(--accent)]/10 border border-[var(--accent-2)]/30 text-[var(--accent-2)] rounded-2xl flex items-center gap-2 text-xs animate-fade-in"
          >
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            <span>Transmission in progress over slower edge connection. Please leave this page open...</span>
          </div>
        )}

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
          {submitted || previewState === 'success' ? (
            <div 
              role="status"
              aria-live="polite"
              className="py-10 px-4 text-center max-w-lg mx-auto space-y-5 animate-fade-in"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-[var(--text)]">Inquiry Dispatched Successfully</h2>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Thank you, <strong className="text-[var(--text)]">{name || 'Creator'}</strong>. Your ticket regarding <strong className="text-[var(--text)]">{topic}</strong> has been forwarded to our support queue.
                </p>
              </div>

              {/* Inquiry Reference Code Box */}
              <div className="p-4 rounded-2xl bg-[var(--input)] border border-[var(--line)] flex items-center justify-between gap-3 text-left">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider block">Reference Number</span>
                  <span className="text-xs font-mono font-bold text-[var(--accent-2)]">{ticketRef || 'DV-INQ-L7K92M-A4B8'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="px-3 py-1.5 rounded-lg bg-[var(--card)] hover:bg-[var(--hover)] border border-[var(--line)] text-xs font-bold text-[var(--text)] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />}
                  <span>{copiedRef ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Reassurance Next Steps */}
              <div className="p-3.5 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent-2)]/20 text-left text-xs text-[var(--muted)] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[var(--text)]">
                  <Clock className="w-3.5 h-3.5 text-[var(--accent-2)]" />
                  <span>Expected Response Time</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Our operations team reviews submissions within <strong>24–48 business hours</strong>. Replies will arrive at <span className="text-[var(--accent-2)] font-semibold">{email || 'your email'}</span>.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setSubject('');
                    setMessage('');
                    setConsent(false);
                    setTouched({});
                    setPreviewState(null);
                  }}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--input)] hover:bg-[var(--hover)] text-[var(--text)] transition-colors cursor-pointer"
                >
                  Send Another Inquiry
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow hover:opacity-95 transition-all cursor-pointer"
                >
                  Return to Feed
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <h2 className="text-lg font-black text-[var(--text)]">Send us a Message</h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Fill in the details below. Our team receives your communication directly at <strong className="text-[var(--accent-2)]">dataverse@datalexcloud.tech</strong>.
                </p>
              </div>

              {/* State 3: Error Banner with Cause & Fix */}
              {(errorMessage || previewState === 'error') && (
                <div 
                  role="alert" 
                  aria-live="assertive"
                  className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2.5 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Transmission Incomplete</p>
                    <p className="text-red-300/80 mt-0.5">
                      {errorMessage || 'Edge dispatch failed due to network timeout. Your message content has been preserved in the form below.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5 text-left">
                  <label htmlFor="contact-name" className="text-xs font-bold text-[var(--text)] flex items-center justify-between">
                    <span>Your Name or Username <span className="text-[var(--danger)]">*</span></span>
                    {(touched.name || previewState === 'validation') && !isNameValid && (
                      <span className="text-[10px] text-[var(--danger)] font-normal">Required field</span>
                    )}
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. Alex Vance"
                    className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--input)] border text-xs text-[var(--text)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 transition-all ${
                      (touched.name || previewState === 'validation') && !isNameValid 
                        ? 'border-[var(--danger)] focus:border-[var(--danger)]' 
                        : 'border-[var(--line)] focus:border-[var(--accent-2)]'
                    }`}
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5 text-left">
                  <label htmlFor="contact-email" className="text-xs font-bold text-[var(--text)] flex items-center justify-between">
                    <span>Your Email Address <span className="text-[var(--danger)]">*</span></span>
                    {(touched.email || previewState === 'validation') && !isEmailValid && (
                      <span className="text-[10px] text-[var(--danger)] font-normal">Valid email required</span>
                    )}
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="name@example.com"
                    className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--input)] border text-xs text-[var(--text)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 transition-all ${
                      (touched.email || previewState === 'validation') && !isEmailValid 
                        ? 'border-[var(--danger)] focus:border-[var(--danger)]' 
                        : 'border-[var(--line)] focus:border-[var(--accent-2)]'
                    }`}
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
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--input)] border border-[var(--line)] text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 focus:border-[var(--accent-2)] transition-all cursor-pointer"
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
                  <label htmlFor="contact-subject" className="text-xs font-bold text-[var(--text)] flex items-center justify-between">
                    <span>Subject Line <span className="text-[var(--danger)]">*</span></span>
                    {(touched.subject || previewState === 'validation') && !isSubjectValid && (
                      <span className="text-[10px] text-[var(--danger)] font-normal">Min 3 characters</span>
                    )}
                  </label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    required
                    value={subject}
                    onBlur={() => setTouched(prev => ({ ...prev, subject: true }))}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Brief description of your request"
                    className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--input)] border text-xs text-[var(--text)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 transition-all ${
                      (touched.subject || previewState === 'validation') && !isSubjectValid 
                        ? 'border-[var(--danger)] focus:border-[var(--danger)]' 
                        : 'border-[var(--line)] focus:border-[var(--accent-2)]'
                    }`}
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
                  onBlur={() => setTouched(prev => ({ ...prev, message: true }))}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="How can we assist you? Please provide any relevant usernames, transaction IDs, or details..."
                  className={`w-full px-4 py-3 rounded-2xl bg-[var(--input)] border text-xs text-[var(--text)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/40 transition-all resize-none leading-relaxed ${
                    (touched.message || previewState === 'validation') && !isMessageValid 
                      ? 'border-[var(--danger)] focus:border-[var(--danger)]' 
                      : 'border-[var(--line)] focus:border-[var(--accent-2)]'
                  }`}
                />
                {(touched.message || previewState === 'validation') && !isMessageValid && (
                  <p className="text-[10px] text-[var(--danger)]">Please enter at least 10 characters so we can understand your request.</p>
                )}
              </div>

              {/* Explicit Consent Checkbox (GDPR requirement) */}
              <div className="space-y-1 text-left">
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    id="contact-consent"
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-[var(--line)] bg-[var(--input)] text-[var(--accent)] accent-[var(--accent)] cursor-pointer focus:ring-2 focus:ring-[var(--accent-2)]/30 shrink-0"
                  />
                  <label htmlFor="contact-consent" className="text-[11px] text-[var(--muted)] leading-snug cursor-pointer select-none">
                    I agree that my submitted information will be transmitted to{' '}
                    <span className="text-[var(--text)] font-semibold">dataverse@datalexcloud.tech</span>{' '}
                    and processed strictly to evaluate and resolve my inquiry pursuant to DataVerse's{' '}
                    <a href="#/privacy" target="_blank" rel="noreferrer" className="text-[var(--accent-2)] hover:underline font-semibold">Privacy Policy</a>.
                  </label>
                </div>
                {(touched.consent || previewState === 'validation') && !isConsentValid && (
                  <p className="text-[10px] text-[var(--danger)] pl-6.5">Privacy consent is required to dispatch inquiries.</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || previewState === 'loading' || isOffline}
                className="w-full py-3.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] rounded-xl font-bold tracking-wide shadow-lg shadow-[var(--shadow-accent)] active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] disabled:opacity-50 disabled:scale-100 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed min-h-[44px]"
              >
                {loading || previewState === 'loading' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
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

      {/* State Preview Toolbar */}
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
            {(['idle', 'loading', 'validation', 'error', 'offline', 'slow', 'success'] as ContactStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  if (st === 'idle') {
                    setPreviewState(null);
                    setSubmitted(false);
                    setErrorMessage(null);
                    setTouched({});
                    setIsOffline(false);
                    setIsSlowNetwork(false);
                  } else if (st === 'loading') {
                    setPreviewState('loading');
                  } else if (st === 'validation') {
                    setPreviewState('validation');
                    setTouched({ name: true, email: true, subject: true, message: true, consent: true });
                  } else if (st === 'error') {
                    setPreviewState('error');
                    setErrorMessage('Worker error: Cloudflare D1 rate limit exceeded. Your text is safely retained.');
                  } else if (st === 'offline') {
                    setPreviewState('offline');
                    setIsOffline(true);
                  } else if (st === 'slow') {
                    setPreviewState('slow');
                    setIsSlowNetwork(true);
                  } else if (st === 'success') {
                    setPreviewState('success');
                    setSubmitted(true);
                    setTicketRef('DV-INQ-L7K92M-A4B8');
                  }
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                  previewState === st || (st === 'idle' && !previewState && !submitted && !errorMessage && !isOffline)
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

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default Contact;
