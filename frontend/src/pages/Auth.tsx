import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, 
  Lock, 
  User, 
  AtSign, 
  Eye, 
  EyeOff, 
  Shield, 
  ArrowLeft, 
  HelpCircle,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
/* THEME START */
import { ThemeIconButton } from '../utils/theme';
/* THEME END */
import { Footer } from '../components/Footer';
import { CookieBanner } from '../components/CookieBanner';
import { DataVerseLogo } from '../components/DataVerseLogo';

export type AuthState = 
  | 'idle'
  | 'loading'
  | 'error'
  | 'offline'
  | 'slow'
  | 'success';

export const Auth: React.FC = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  
  // Form fields
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  
  // UI states & 10-state architecture
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    displayName?: string;
    terms?: string;
  }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isSlowNetwork, setIsSlowNetwork] = useState<boolean>(false);
  const [authSuccessUser, setAuthSuccessUser] = useState<string | null>(null);
  const [hasSavedDraft] = useState<boolean>(() => {
    try {
      return Boolean(sessionStorage.getItem('dv_create_draft_caption') || sessionStorage.getItem('dv_pending_comment'));
    } catch {
      return false;
    }
  });
  const [previewState, setPreviewState] = useState<AuthState | null>(null);
  const [showPreviewToolbar, setShowPreviewToolbar] = useState<boolean>(false);
  const slowTimerRef = useRef<any>(null);

  // 2FA Challenge State
  const [show2faChallenge, setShow2faChallenge] = useState<boolean>(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const [isBackupCodeMode, setIsBackupCodeMode] = useState<boolean>(false);
  const [trustDevice, setTrustDevice] = useState<boolean>(false);
  const [failed2faAttempts, setFailed2faAttempts] = useState<number>(0);

  // Online / offline tracking
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

  /* ANIMATION START */
  const [animationKey, setAnimationKey] = useState<number>(0);
  const [placeholderText, setPlaceholderText] = useState<string>('');
  const isInputInteractingRef = useRef<boolean>(false);

  // Typewriter effect for username placeholder
  useEffect(() => {
    const targetPlaceholder = isLogin 
      ? "your_username or mail@domain.com" 
      : "username (letters, numbers, _)";

    // Respect prefers-reduced-motion: skip typing and set placeholder immediately
    const prefersReduced = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setPlaceholderText(targetPlaceholder);
      return;
    }

    // If user is already typing, focused, or field has value, do not overwrite
    if (isInputInteractingRef.current || username !== '') {
      setPlaceholderText(targetPlaceholder);
      return;
    }

    setPlaceholderText('');
    let currentIndex = 0;
    let typeInterval: any = null;

    // Start typing after username field slides in (~2.6s)
    const startDelay = setTimeout(() => {
      if (isInputInteractingRef.current || username !== '') {
        setPlaceholderText(targetPlaceholder);
        return;
      }

      typeInterval = setInterval(() => {
        if (isInputInteractingRef.current || username !== '') {
          setPlaceholderText(targetPlaceholder);
          clearInterval(typeInterval);
          return;
        }

        currentIndex++;
        setPlaceholderText(targetPlaceholder.slice(0, currentIndex));
        if (currentIndex >= targetPlaceholder.length) {
          clearInterval(typeInterval);
        }
      }, 35);
    }, 2600);

    return () => {
      clearTimeout(startDelay);
      if (typeInterval) clearInterval(typeInterval);
    };
  }, [isLogin, animationKey, username]);

  // Console helper to replay intro animation without any button
  useEffect(() => {
    (window as any).replayIntro = () => {
      isInputInteractingRef.current = false;
      setAnimationKey(prev => prev + 1);
      console.log('🎬 Replaying DataVerse intro animation...');
    };

    return () => {
      delete (window as any).replayIntro;
    };
  }, []);
  /* ANIMATION END */

  const validateForm = (): boolean => {
    const errors: { username?: string; email?: string; password?: string; displayName?: string; terms?: string } = {};

    if (!username.trim()) {
      errors.username = isLogin ? 'Please enter your username or email' : 'Please choose a username';
    } else if (!isLogin) {
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
        errors.username = 'Username must be 3-30 characters (letters, numbers, underscores only)';
      }
    }

    if (!isLogin) {
      if (!displayName.trim()) {
        errors.displayName = 'Please enter your display name';
      }
      if (!email.trim()) {
        errors.email = 'Please enter your email address';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = 'Please enter a valid email format (e.g. name@domain.com)';
      }
      if (!acceptedTerms) {
        errors.terms = 'You must agree to the Terms of Service and Privacy Policy to register';
      }
    }

    if (!password) {
      errors.password = 'Please enter your password';
    } else if (!isLogin && password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!navigator.onLine) {
      setError("You're offline. Reconnect to the internet to sign in or create an account.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setIsSlowNetwork(false);

    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      setIsSlowNetwork(true);
    }, 3500);

    const url = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const payload = isLogin 
      ? { login_id: username.trim() || email.trim(), password } 
      : { username: username.trim(), email: email.trim(), password, display_name: displayName.trim() };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);

      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || 'Authentication failed';
        if (res.status === 401 || res.status === 403) {
          msg = 'Incorrect username or password. Please verify your credentials and try again.';
        } else if (res.status === 429) {
          msg = 'Too many attempts. For your security, please wait 30 seconds before trying again.';
        }
        throw new Error(msg);
      }

      if (data.requires_2fa) {
        setMfaToken(data.mfa_token);
        setShow2faChallenge(true);
        setTwoFactorCode('');
        setFailed2faAttempts(0);
        setError(null);
        return;
      }

      setAuthSuccessUser(data.user?.display_name || data.user?.username || 'User');
      setTimeout(() => {
        login(data.token, data.user);
      }, 700);
    } catch (err: any) {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      if (!navigator.onLine) {
        setError("Network connection lost. Please verify your connection.");
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e?: React.FormEvent, codeToSubmit?: string) => {
    if (e) e.preventDefault();
    const code = (codeToSubmit !== undefined ? codeToSubmit : twoFactorCode).trim();
    if (!code || !mfaToken) {
      setError('Please enter your authentication code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfa_token: mfaToken,
          code: code,
          trust_device: trustDevice
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFailed2faAttempts(prev => prev + 1);
        throw new Error(data.error || 'Verification failed');
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handle2faCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isBackupCodeMode) {
      const numericVal = val.replace(/\D/g, '').slice(0, 6);
      setTwoFactorCode(numericVal);
      if (numericVal.length === 6) {
        handleVerify2fa(undefined, numericVal);
      }
    } else {
      setTwoFactorCode(val.toUpperCase().slice(0, 9));
    }
  };

/* THEME START */
  return (
    <main id="main-content" key={animationKey} className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--bg)] relative overflow-hidden px-4 py-8">
      {/* Theme Toggle Button in top right corner of Login/Sign Up */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <ThemeIconButton />
      </div>

      {/* ANIMATION START - Scoped CSS styles & Timing Configuration */}
      <style>{`
        :root {
          /* Intro animation timing config */
          --t-card: 0.1s;
          --t-logo: 0.4s;
          --t-title: 0.9s;
          --t-tagline: 1.8s;
          --t-tabs: 2.1s;
          --t-form: 2.4s;
          --t-button: 3.1s;
          --t-glow: 3.4s;

          /* Accents pulled from theme system */
          --intro-gold: var(--gold);
          --intro-gold-glow: color-mix(in srgb, var(--gold) 45%, transparent);
          --intro-teal: var(--accent);
          --intro-teal-glow: color-mix(in srgb, var(--accent) 40%, transparent);
          --intro-indigo: var(--accent-2);
          --intro-indigo-glow: var(--shadow-accent);
        }
/* THEME END */

        /* 1. Card fades and scales in (0.94 to 1) */
        .intro-card {
          animation: cardFadeScale 0.75s cubic-bezier(0.16, 1, 0.3, 1) var(--t-card) both;
          will-change: transform, opacity;
        }
        @keyframes cardFadeScale {
          0% {
            opacity: 0;
            transform: scale(0.94);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* 2. Logo wipe from bottom up + gold/teal glow pulse + gentle floating */
        .intro-logo {
          animation: 
            logoWipeGlow 1.05s cubic-bezier(0.16, 1, 0.3, 1) var(--t-logo) both,
            logoFloat 3.2s ease-in-out calc(var(--t-logo) + 1.1s) infinite alternate;
          will-change: clip-path, transform, filter;
        }
        @keyframes logoWipeGlow {
          0% {
            clip-path: inset(100% 0 0 0);
            filter: drop-shadow(0 0 0px transparent);
            opacity: 0;
            transform: scale(0.95);
          }
          50% {
            clip-path: inset(0 0 0 0);
            filter: drop-shadow(0 0 16px var(--intro-gold-glow));
            opacity: 1;
            transform: scale(1.03);
          }
          80% {
            clip-path: inset(0 0 0 0);
            filter: drop-shadow(0 0 20px var(--intro-teal-glow));
            transform: scale(1);
          }
          100% {
            clip-path: inset(0 0 0 0);
            filter: drop-shadow(0 0 0px transparent);
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes logoFloat {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-5px);
          }
        }

        /* 3. Title split letters flip up from below + gold shine sweep */
        .intro-title {
          position: relative;
          display: inline-block;
          perspective: 800px;
        }
        .intro-title-char {
          display: inline-block;
          transform-origin: 50% 100%;
          opacity: 0;
          animation: letterFlipUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
          will-change: transform, opacity, filter;
        }
        @keyframes letterFlipUp {
          0% {
            opacity: 0;
            transform: translateY(24px) rotateX(-80deg);
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) rotateX(0deg);
            filter: blur(0px);
          }
        }
        .intro-title-shine {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          background: linear-gradient(
            105deg,
            transparent 0%,
            transparent 35%,
            rgba(251, 191, 36, 0.75) 48%,
            rgba(254, 240, 138, 0.95) 50%,
            rgba(251, 191, 36, 0.75) 52%,
            transparent 65%,
            transparent 100%
          );
          background-size: 250% 100%;
          background-position: 150% 0;
          mix-blend-mode: color-dodge;
          opacity: 0;
          animation: titleShineSweep 0.95s ease-in-out calc(var(--t-title) + 0.85s) forwards;
        }
        @keyframes titleShineSweep {
          0% {
            opacity: 0;
            background-position: 150% 0;
          }
          30% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            background-position: -60% 0;
          }
        }

        /* 4. Tagline fades in */
        .intro-tagline {
          opacity: 0;
          animation: taglineFadeIn 0.55s ease-out var(--t-tagline) both;
        }
        @keyframes taglineFadeIn {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 5. Login/Sign Up tab switch expands from center (scaleX 0.6 to 1) */
        .intro-tabs {
          opacity: 0;
          transform-origin: center;
          animation: tabsExpand 0.5s cubic-bezier(0.16, 1, 0.3, 1) var(--t-tabs) both;
        }
        @keyframes tabsExpand {
          0% {
            opacity: 0;
            transform: scaleX(0.6);
          }
          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        /* 6. Form fields slide in from left/right + bottom glow line */
        .intro-field-left {
          opacity: 0;
          animation: fieldSlideLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) var(--t-form) both;
        }
        .intro-field-right {
          opacity: 0;
          animation: fieldSlideRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) calc(var(--t-form) + 0.1s) both;
        }
        @keyframes fieldSlideLeft {
          0% {
            opacity: 0;
            transform: translateX(-24px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fieldSlideRight {
          0% {
            opacity: 0;
            transform: translateX(24px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .intro-field-glow {
          position: absolute;
          bottom: 0;
          left: 6%;
          right: 6%;
          height: 2px;
          border-radius: 9999px;
          background: linear-gradient(90deg, transparent, var(--intro-teal), var(--intro-indigo), var(--intro-gold), transparent);
          pointer-events: none;
          opacity: 0;
          animation: fieldGlowSweep 1.1s ease-out calc(var(--t-form) + 0.3s) forwards;
        }
        @keyframes fieldGlowSweep {
          0% {
            opacity: 0;
            transform: scaleX(0.2);
          }
          40% {
            opacity: 1;
            transform: scaleX(1);
          }
          100% {
            opacity: 0;
            transform: scaleX(1);
          }
        }

        /* 7. Sign In button spring pop + repeating light shimmer swipe */
        .intro-btn {
          opacity: 0;
          animation: buttonSpringPop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) var(--t-button) both;
        }
        @keyframes buttonSpringPop {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.92);
          }
          70% {
            transform: translateY(-2px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .intro-btn-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          background: linear-gradient(
            105deg,
            transparent 0%,
            transparent 35%,
            rgba(255, 255, 255, 0.32) 50%,
            transparent 65%,
            transparent 100%
          );
          background-size: 200% 100%;
          background-position: 150% 0;
          opacity: 0;
          animation: buttonShimmerSweep 3.6s ease-in-out calc(var(--t-button) + 0.7s) infinite;
        }
        @keyframes buttonShimmerSweep {
          0% {
            opacity: 0;
            background-position: 150% 0;
          }
          15% {
            opacity: 1;
          }
          35% {
            opacity: 1;
            background-position: -50% 0;
          }
          40%, 100% {
            opacity: 0;
            background-position: -50% 0;
          }
        }

        /* 8. Faint indigo radial glow behind card */
        .intro-glow-bg {
          opacity: 0;
          animation: indigoGlowFadeIn 1.2s ease-out var(--t-glow) both;
        }
        @keyframes indigoGlowFadeIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Prefers-reduced-motion: skip intro immediately */
        @media (prefers-reduced-motion: reduce) {
          .intro-card,
          .intro-logo,
          .intro-title-char,
          .intro-title-shine,
          .intro-tagline,
          .intro-tabs,
          .intro-field-left,
          .intro-field-right,
          .intro-field-glow,
          .intro-btn,
          .intro-btn-shimmer,
          .intro-glow-bg {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
            clip-path: none !important;
          }
        }
      `}</style>
      {/* ANIMATION END */}

      {/* THEME START */}
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[var(--glow)] blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-[var(--glow)] blur-[150px] pointer-events-none"></div>

      {/* 8. Faint radial glow behind card */}
      <div className="intro-glow-bg absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[var(--glow)] blur-[100px] pointer-events-none z-0"></div>

      {/* Main Container - Card fades and scales in */}
      <div className="w-full max-w-md bg-[var(--card)] rounded-2xl p-8 relative z-10 shadow-2xl border border-[var(--line)] transition-all duration-300 intro-card">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          {/* Logo in rounded tile with dark --bg color (#040b0d) and 1px border */}
          <div className="w-16 h-16 mb-4 flex items-center justify-center relative p-1.5 rounded-2xl bg-[#040b0d] border border-white/10 shadow-md overflow-hidden">
            <DataVerseLogo size={56} rounded="2xl" className="w-full h-full object-contain intro-logo" />
          </div>
          {/* THEME END */}
          {/* ANIMATION END */}

          {/* ANIMATION START - 3. Title split into letters flip up + gold shine */}
          <h1 
            className="text-3xl font-black tracking-tight text-[var(--text)] intro-title whitespace-nowrap"
          >
            <span className="sr-only">DataVerse</span>
            <span aria-hidden="true" className="intro-title-text inline-flex">
              {"DataVerse".split('').map((char, index) => (
                <span
                  key={index}
                  className="intro-title-char"
                  style={{
                    animationDelay: `calc(var(--t-title) + ${index * 70}ms)`
                  }}
                >
                  {char}
                </span>
              ))}
            </span>
            <span className="intro-title-shine" aria-hidden="true" />
          </h1>
          {/* ANIMATION END */}

          {/* ANIMATION START - 4. Tagline fades in */}
          {/* THEME START */}
          <p className="text-xs text-[var(--muted)] mt-1.5 font-medium intro-tagline">
            {isLogin ? 'Welcome back, sign in to continue' : 'Create an account to start connecting'}
          </p>
        </div>

        {/* Section Heading for screen readers */}
        <h2 className="sr-only">{isLogin ? 'Sign In to Your Account' : 'Create a New Account'}</h2>

        {show2faChallenge ? (
          <div>
            <button
              type="button"
              onClick={() => {
                setShow2faChallenge(false);
                setMfaToken(null);
                setTwoFactorCode('');
                setError(null);
              }}
              className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] mb-4 transition-colors font-semibold group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Sign In
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent-2)] mb-3 shadow-lg shadow-[var(--shadow-accent)]">
                <Shield className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-[var(--text)]">Two-Factor Authentication</h2>
              <p className="text-xs text-[var(--muted)] mt-1.5 max-w-xs leading-relaxed">
                {isBackupCodeMode 
                  ? 'Enter an 8-character single-use backup code.' 
                  : 'Enter the 6-digit verification code from your authenticator app.'}
              </p>
            </div>

            {error && (
              <div 
                id="auth-error"
                role="alert"
                aria-live="assertive"
                className="mb-4 p-3 rounded-lg bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] text-xs text-center font-semibold animate-shake"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleVerify2fa} className="space-y-4">
              <div>
                <label 
                  htmlFor="auth-2fa-code" 
                  className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2 text-center"
                >
                  {isBackupCodeMode ? 'Backup Code' : '6-Digit Security Code'}
                </label>
                <div className="relative">
                  <input
                    id="auth-2fa-code"
                    name="twoFactorCode"
                    type="text"
                    required
                    autoFocus
                    autoComplete={isBackupCodeMode ? "off" : "one-time-code"}
                    inputMode={isBackupCodeMode ? "text" : "numeric"}
                    maxLength={isBackupCodeMode ? 9 : 6}
                    placeholder={isBackupCodeMode ? "XXXX-XXXX" : "123456"}
                    value={twoFactorCode}
                    onChange={handle2faCodeChange}
                    className="w-full bg-[var(--input)] border border-[var(--line)] focus:border-[var(--accent-2)] rounded-xl py-3 px-4 text-[var(--text)] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-2)]/20 text-center font-mono font-bold tracking-[0.25em] text-xl placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-[var(--muted)]"
                  />
                </div>
              </div>

              {/* Trust this device checkbox */}
              <div className="flex items-center gap-2.5 pt-1 text-left">
                <input
                  id="auth-trust-device"
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--line)] bg-[var(--input)] text-[var(--accent)] accent-[var(--accent)] cursor-pointer focus:ring-2 focus:ring-[var(--accent-2)]/30 flex-shrink-0"
                />
                <label htmlFor="auth-trust-device" className="text-xs text-[var(--muted)] cursor-pointer select-none">
                  Trust this device for 30 days
                </label>
              </div>

              {/* Clock drift helpful hint after multiple failures */}
              {failed2faAttempts >= 2 && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--input)] border border-[var(--line)] text-[11px] text-[var(--muted)] text-left leading-relaxed">
                  <HelpCircle className="w-4 h-4 text-[var(--gold)] flex-shrink-0 mt-0.5" />
                  <span>
                    Having trouble? Ensure your device's date and time are set to <strong>Automatic</strong> in system settings. Even a 1-minute clock drift can cause code verification to fail.
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || twoFactorCode.length < (isBackupCodeMode ? 8 : 6)}
                className="btn-primary w-full py-3 font-bold tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] disabled:opacity-50 disabled:scale-100 transition-all text-xs cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              {/* Toggle to Backup Code Mode */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupCodeMode(!isBackupCodeMode);
                    setTwoFactorCode('');
                    setError(null);
                  }}
                  className="text-xs text-[var(--accent-2)] hover:underline font-semibold cursor-pointer"
                >
                  {isBackupCodeMode ? 'Use 6-digit authenticator code instead' : 'Lost phone? Use a backup code'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Auth Toggle Tab - Expands from center */}
            <div 
              role="tablist" 
              aria-label="Authentication Options"
              className="flex bg-[var(--input)] rounded-xl p-1 mb-6 border border-[var(--line)] intro-tabs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={isLogin}
                aria-controls="auth-form"
                id="tab-login"
                onClick={() => { setIsLogin(true); setError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] ${
                  isLogin ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isLogin}
                aria-controls="auth-form"
                id="tab-signup"
                onClick={() => { setIsLogin(false); setError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] ${
                  !isLogin ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* State 8: Draft Preservation Notice */}
            {hasSavedDraft && isLogin && (
              <div 
                role="status"
                aria-live="polite"
                className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-fade-in"
              >
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Your unsaved post draft has been preserved. Sign in to resume and publish.</span>
              </div>
            )}

            {/* State 4: Offline Notification Banner */}
            {isOffline && (
              <div 
                role="alert"
                aria-live="polite"
                className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-fade-in"
              >
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                <span>You're offline. Reconnect to the internet to sign in or create an account.</span>
              </div>
            )}

            {/* State 5: Slow Network Indicator */}
            {isSlowNetwork && loading && (
              <div 
                role="status"
                aria-live="polite"
                className="mb-4 p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent-2)]/30 text-[var(--accent-2)] text-xs flex items-center gap-2 animate-fade-in"
              >
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Connecting to authentication servers... Please keep this page open.</span>
              </div>
            )}

            {/* State 10: Rich Success Card */}
            {authSuccessUser && (
              <div 
                role="status"
                aria-live="polite"
                className="mb-4 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs text-center font-semibold animate-fade-in flex flex-col items-center gap-1.5"
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span className="text-sm font-bold">Welcome back, {authSuccessUser}!</span>
                <span className="text-emerald-300/80 font-normal">Setting up your secure session...</span>
              </div>
            )}

            {/* State 3: Error Alert with Actionable Remediation */}
            {error && (
              <div 
                id="auth-error"
                role="alert"
                aria-live="assertive"
                className="mb-4 p-3 rounded-lg bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] text-xs text-center font-semibold animate-shake"
              >
                {error}
              </div>
            )}

            {/* Form */}
            <form 
              id="auth-form" 
              onSubmit={handleSubmit} 
              className="space-y-4"
              aria-labelledby={isLogin ? 'tab-login' : 'tab-signup'}
            >
              
              {/* User Fields (Signup only) */}
              {!isLogin && (
                <div>
                  <label 
                    htmlFor="auth-display-name" 
                    className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5"
                  >
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" aria-hidden="true" />
                    <input
                      id="auth-display-name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="e.g. John Doe"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        if (fieldErrors.displayName) setFieldErrors(prev => ({ ...prev, displayName: undefined }));
                      }}
                      aria-invalid={!!fieldErrors.displayName || !!error}
                      className={`w-full bg-[var(--input)] border rounded-xl py-3 pl-11 pr-4 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all ${
                        fieldErrors.displayName 
                          ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/20' 
                          : 'border-[var(--line)] focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/20'
                      }`}
                    />
                  </div>
                  {fieldErrors.displayName && (
                    <p className="text-[11px] text-[var(--danger)] font-medium mt-1 pl-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.displayName}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Username / Email field */}
              <div className="intro-field-left">
                <label 
                  htmlFor="auth-username" 
                  className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5"
                >
                  {isLogin ? 'Username or Email' : 'Username'}
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" aria-hidden="true" />
                  <input
                    id="auth-username"
                    name="username"
                    type="text"
                    required
                    autoComplete={isLogin ? "username" : "username"}
                    placeholder={placeholderText || (isLogin ? "your_username or mail@domain.com" : "username (letters, numbers, _)")}
                    value={username}
                    onFocus={() => { isInputInteractingRef.current = true; }}
                    onChange={(e) => { 
                      isInputInteractingRef.current = true;
                      setUsername(e.target.value); 
                      if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: undefined }));
                    }}
                    aria-invalid={!!fieldErrors.username || !!error}
                    className={`w-full bg-[var(--input)] border rounded-xl py-3 pl-11 pr-4 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all ${
                      fieldErrors.username 
                        ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/20' 
                        : 'border-[var(--line)] focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/20'
                    }`}
                  />
                  <span className="intro-field-glow" aria-hidden="true" />
                </div>
                {fieldErrors.username && (
                  <p className="text-[11px] text-[var(--danger)] font-medium mt-1 pl-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.username}</span>
                  </p>
                )}
              </div>

              {/* Email field (Signup only) */}
              {!isLogin && (
                <div>
                  <label 
                    htmlFor="auth-email" 
                    className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" aria-hidden="true" />
                    <input
                      id="auth-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="name@domain.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                      }}
                      aria-invalid={!!fieldErrors.email || !!error}
                      className={`w-full bg-[var(--input)] border rounded-xl py-3 pl-11 pr-4 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all ${
                        fieldErrors.email 
                          ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/20' 
                          : 'border-[var(--line)] focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/20'
                      }`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-[11px] text-[var(--danger)] font-medium mt-1 pl-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Password field */}
              <div className="intro-field-right">
                <div className="flex justify-between items-center mb-1.5">
                  <label 
                    htmlFor="auth-password" 
                    className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" aria-hidden="true" />
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    aria-invalid={!!fieldErrors.password || !!error}
                    className={`w-full bg-[var(--input)] border rounded-xl py-3 pl-11 pr-11 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all ${
                      fieldErrors.password 
                        ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/20' 
                        : 'border-[var(--line)] focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] focus-visible:text-[var(--text)] focus-visible:outline-none transition-colors p-1 rounded-md cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                  <span className="intro-field-glow" aria-hidden="true" />
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-[var(--danger)] font-medium mt-1 pl-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Consent Checkbox for Sign Up */}
              {!isLogin && (
                <div>
                  <div className="flex items-start gap-2.5 pt-1 text-left">
                    <input
                      id="auth-terms-consent"
                      type="checkbox"
                      required
                      checked={acceptedTerms}
                      onChange={(e) => {
                        setAcceptedTerms(e.target.checked);
                        if (fieldErrors.terms) setFieldErrors(prev => ({ ...prev, terms: undefined }));
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-[var(--line)] bg-[var(--input)] text-[var(--accent)] accent-[var(--accent)] cursor-pointer focus:ring-2 focus:ring-[var(--accent-2)]/30 flex-shrink-0"
                    />
                    <label htmlFor="auth-terms-consent" className="text-[11px] text-[var(--muted)] leading-snug cursor-pointer select-none">
                      I have read and agree to the{' '}
                      <a href="#/terms" target="_blank" rel="noreferrer" className="text-[var(--accent-2)] hover:underline font-semibold">Terms of Service</a>
                      {' '}and{' '}
                      <a href="#/privacy" target="_blank" rel="noreferrer" className="text-[var(--accent-2)] hover:underline font-semibold">Privacy Policy</a>.
                    </label>
                  </div>
                  {fieldErrors.terms && (
                    <p className="text-[11px] text-[var(--danger)] font-medium mt-1 pl-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.terms}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (!isLogin && !acceptedTerms) || isOffline}
                className="btn-primary w-full py-3 mt-2 font-bold tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] disabled:opacity-50 disabled:scale-100 transition-all text-xs relative overflow-hidden cursor-pointer disabled:cursor-not-allowed shadow-md shadow-[var(--shadow-accent)]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{loading ? 'Authenticating...' : (isLogin ? 'Sign In' : 'Create Account')}</span>
                </span>
                <span className="intro-btn-shimmer" aria-hidden="true" />
              </button>

              {/* Legal Notice for Sign In */}
              {isLogin && (
                <p className="text-[11px] text-[var(--muted)] text-center mt-4 leading-relaxed">
                  By signing in, you agree to DataVerse's{' '}
                  <a href="#/terms" className="text-[var(--accent-2)] hover:underline font-semibold">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#/privacy" className="text-[var(--accent-2)] hover:underline font-semibold">Privacy Policy</a>.
                </p>
              )}

            </form>
          </>
        )}

      </div>

      <Footer className="max-w-md mx-auto relative z-10 border-t-0 mt-6" />
      <CookieBanner />

      {/* State Preview Toolbar (Only shown in local dev or via ?debug_states=1) */}
      {(import.meta.env.DEV || (typeof window !== 'undefined' && window.location.search.includes('debug_states=1'))) && (
        <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end">
          {showPreviewToolbar && (
            <div className="mb-2 p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl space-y-2 text-xs w-60 animate-fade-in backdrop-blur-md">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--card-border)]">
                <span className="font-bold text-[var(--accent-2)]">Auth 10-State Preview</span>
                <button 
                  type="button" 
                  onClick={() => {
                    setPreviewState(null);
                    setError(null);
                    setFieldErrors({});
                    setAuthSuccessUser(null);
                    setLoading(false);
                    setIsOffline(!navigator.onLine);
                    setIsSlowNetwork(false);
                  }} 
                  className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  Reset Live
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewState('loading');
                    setLoading(true);
                    setError(null);
                  }}
                  className={`py-1 px-2 rounded-lg text-[10px] font-semibold text-left cursor-pointer transition-colors ${
                    previewState === 'loading'
                      ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)]'
                      : 'bg-[var(--input)] text-[var(--text)] hover:bg-[var(--hover)]'
                  }`}
                >
                  loading
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewState('error');
                    setLoading(false);
                    setError('Incorrect username or password. Please verify your credentials and try again.');
                  }}
                  className={`py-1 px-2 rounded-lg text-[10px] font-semibold text-left cursor-pointer transition-colors ${
                    previewState === 'error'
                      ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)]'
                      : 'bg-[var(--input)] text-[var(--text)] hover:bg-[var(--hover)]'
                  }`}
                >
                  error
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewState('offline');
                    setIsOffline(true);
                  }}
                  className={`py-1 px-2 rounded-lg text-[10px] font-semibold text-left cursor-pointer transition-colors ${
                    previewState === 'offline'
                      ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)]'
                      : 'bg-[var(--input)] text-[var(--text)] hover:bg-[var(--hover)]'
                  }`}
                >
                  offline
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewState('slow');
                    setIsSlowNetwork(true);
                    setLoading(true);
                  }}
                  className={`py-1 px-2 rounded-lg text-[10px] font-semibold text-left cursor-pointer transition-colors ${
                    previewState === 'slow'
                      ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)]'
                      : 'bg-[var(--input)] text-[var(--text)] hover:bg-[var(--hover)]'
                  }`}
                >
                  slow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewState('error');
                    setIsLogin(false);
                    setFieldErrors({
                      username: 'Username must be 3-30 characters (letters, numbers, _)',
                      email: 'Please enter a valid email format',
                      password: 'Password must be at least 8 characters long',
                      terms: 'You must agree to the Terms of Service to register'
                    });
                  }}
                  className="py-1 px-2 rounded-lg text-[10px] font-semibold text-left bg-[var(--input)] text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer"
                >
                  validation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewState('success');
                    setAuthSuccessUser('Alex Morgan');
                    setError(null);
                  }}
                  className={`py-1 px-2 rounded-lg text-[10px] font-semibold text-left cursor-pointer transition-colors ${
                    previewState === 'success'
                      ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)]'
                      : 'bg-[var(--input)] text-[var(--text)] hover:bg-[var(--hover)]'
                  }`}
                >
                  success
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowPreviewToolbar(prev => !prev)}
            aria-label="Toggle Auth State Preview Toolbar"
            className="h-9 px-3 rounded-full bg-[var(--card)] border border-[var(--card-border)] text-[var(--accent-2)] shadow-xl hover:bg-[var(--hover)] transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>States</span>
          </button>
        </div>
      )}
    </main>
  );
};
