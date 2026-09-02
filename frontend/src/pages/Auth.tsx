import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, AtSign, Eye, EyeOff } from 'lucide-react';

export const Auth: React.FC = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  
  // Form fields
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  
  // UI states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const payload = isLogin 
      ? { login_id: username || email, password } 
      : { username, email, password, display_name: displayName };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#030303] relative overflow-hidden px-4">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-brand-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-brand-600/10 blur-[150px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-md glass-card rounded-2xl p-8 relative z-10 shadow-2xl border border-white/5 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 mb-4 flex items-center justify-center">
            <img 
              src="/logo.png?v=2" 
              alt="DataVerse Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            DataVerse
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            {isLogin ? 'Welcome back, sign in to continue' : 'Create an account to start connecting'}
          </p>
        </div>

        {/* Auth Toggle Tab */}
        <div className="flex bg-slate-950/80 rounded-xl p-1 mb-6 border border-slate-900">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              isLogin ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              !isLogin ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium animate-shake">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* User Fields (Signup only) */}
          {!isLogin && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-900 focus:border-brand-500 rounded-xl py-3 pl-11 pr-4 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-all focus:ring-1 focus:ring-brand-500/10"
                  />
                </div>
              </div>
            </>
          )}

          {/* Username / Email field */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {isLogin ? 'Username or Email' : 'Username'}
            </label>
            <div className="relative">
              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                placeholder={isLogin ? "your_username or mail@domain.com" : "username (letters, numbers, _)"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-900 focus:border-brand-500 rounded-xl py-3 pl-11 pr-4 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-all focus:ring-1 focus:ring-brand-500/10"
              />
            </div>
          </div>

          {/* Email field (Signup only) */}
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-900 focus:border-brand-500 rounded-xl py-3 pl-11 pr-4 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-all focus:ring-1 focus:ring-brand-500/10"
                />
              </div>
            </div>
          )}

          {/* Password field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-900 focus:border-brand-500 rounded-xl py-3 pl-11 pr-11 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-all focus:ring-1 focus:ring-brand-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-550 hover:to-brand-450 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-brand-500/10 active:scale-[0.98] outline-none disabled:opacity-50 disabled:scale-100 transition-all text-xs glow-hover"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>

        </form>

      </div>
    </div>
  );
};
