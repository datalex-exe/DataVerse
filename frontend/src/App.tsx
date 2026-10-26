import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { 
  Home, 
  Search, 
  LogOut, 
  Loader2, 
  PlusSquare, 
  Heart, 
  Send, 
  Shield 
} from 'lucide-react';
/* THEME START */
import { SidebarThemeSwitch, ThemeIconButton } from './utils/theme';
/* THEME END */

import { ToastProvider } from './context/ToastContext';
import { CookieBanner } from './components/CookieBanner';

// Code splitting: Lazy-load individual pages on demand to minimize initial bundle size
const Auth = React.lazy(() => import('./pages/Auth').then(m => ({ default: m.Auth })));
const Feed = React.lazy(() => import('./pages/Feed').then(m => ({ default: m.Feed })));
const Explore = React.lazy(() => import('./pages/Explore').then(m => ({ default: m.Explore })));
const Profile = React.lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Chat = React.lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const Create = React.lazy(() => import('./pages/Create').then(m => ({ default: m.Create })));
const Activity = React.lazy(() => import('./pages/Activity').then(m => ({ default: m.Activity })));
const Admin = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const NotFound = React.lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const Legal = React.lazy(() => import('./pages/Legal').then(m => ({ default: m.Legal })));
const Contact = React.lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));

const ViewFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh] text-[var(--muted)]">
    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-2)]" />
  </div>
);

const AppContent: React.FC = () => {
  const { user, loading, logout, token } = useAuth();
  
  // Single active view state matching Instagram layout
  const [activeView, setActiveView] = useState<string>('feed');
  const [profileParam, setProfileParam] = useState<string | undefined>(undefined);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState<number>(0);
  const [messagesParam, setMessagesParam] = useState<string | undefined>(undefined);
  const [hideBottomNav, setHideBottomNav] = useState<boolean>(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);




  // Synchronize mobile visualViewport and keyboard height for chat view
  React.useEffect(() => {
    if (activeView !== 'messages') {
      document.documentElement.classList.remove('messages-active', 'keyboard-open');
      document.body.classList.remove('messages-active');
      document.documentElement.style.removeProperty('--vvh');
      document.documentElement.style.removeProperty('--chat-viewport-height');
      return;
    }

    document.documentElement.classList.add('messages-active');
    document.body.classList.add('messages-active');

    const updateViewport = () => {
      // BUG 3 FIX: On visualViewport resize set --vvh to visualViewport.height + "px"
      const vv = window.visualViewport;
      const height = vv ? Math.round(vv.height) : window.innerHeight;
      document.documentElement.style.setProperty('--vvh', `${height}px`);
      document.documentElement.style.setProperty('--chat-viewport-height', `${height}px`);

      // Detect if virtual keyboard is open (visible height is noticeably smaller than screen/window)
      const isKeyboard = vv ? (window.innerHeight - vv.height > 80) : false;
      document.documentElement.classList.toggle('keyboard-open', isKeyboard);

      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    updateViewport();

    window.addEventListener('resize', updateViewport);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
      document.documentElement.classList.remove('messages-active', 'keyboard-open');
      document.body.classList.remove('messages-active');
      document.documentElement.style.removeProperty('--vvh');
      document.documentElement.style.removeProperty('--chat-viewport-height');
    };
  }, [activeView]);


  // Fetch unread notification count periodically
  const fetchUnreadCount = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const count = (data.notifications || []).filter((n: any) => !n.is_read).length;
        setUnreadCount(count);
      }
    } catch {}
  }, [token]);

  // Fetch unread chat count periodically
  const fetchUnreadChatsCount = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/conversations/unread/count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadChatsCount(data.count || 0);
      }
    } catch {}
  }, [token]);

  React.useEffect(() => {
    if (!user) return;
    Promise.allSettled([fetchUnreadCount(), fetchUnreadChatsCount()]);
    const notificationInterval = setInterval(fetchUnreadCount, 30000);
    const chatsInterval = setInterval(fetchUnreadChatsCount, 15000);

    const handleChatsValueUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (typeof customEvent.detail === 'number') {
        setUnreadChatsCount(customEvent.detail);
      }
    };

    window.addEventListener('unread-chats-update-value', handleChatsValueUpdate);

    return () => {
      clearInterval(notificationInterval);
      clearInterval(chatsInterval);
      window.removeEventListener('unread-chats-update-value', handleChatsValueUpdate);
    };
  }, [user, fetchUnreadCount, fetchUnreadChatsCount]);

  React.useEffect(() => {
    const titles: Record<string, string> = {
      feed: 'DataVerse — Feed',
      messages: 'DataVerse — Messages & Chat',
      search: 'DataVerse — Explore Creators',
      notifications: 'DataVerse — Activity & Notifications',
      create: 'DataVerse — Create Post',
      admin: 'DataVerse — Admin Console',
      terms: 'Terms of Service — DataVerse',
      privacy: 'Privacy Policy — DataVerse',
      cookies: 'Cookies Policy — DataVerse',
      refund: 'Refund Policy — DataVerse',
      contact: 'Contact Support — DataVerse',
      '404': '404: Page Not Found — DataVerse',
    };

    if (activeView === 'profile') {
      document.title = profileParam ? `@${profileParam} — DataVerse` : 'Your Profile — DataVerse';
    } else {
      document.title = titles[activeView] || 'DataVerse — Social Network by Datalex';
    }
  }, [activeView, profileParam]);

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/feed';
      
      if (hash.startsWith('#/profile/')) {
        const username = hash.substring(10);
        setActiveView('profile');
        setProfileParam(username);
      } else if (hash === '#/profile') {
        setActiveView('profile');
        setProfileParam(undefined);
      } else if (hash.startsWith('#/messages/')) {
        const convoId = hash.substring(11);
        setActiveView('messages');
        setMessagesParam(convoId);
      } else if (hash === '#/messages') {
        setActiveView('messages');
        setMessagesParam(undefined);
      } else if (hash === '#/search' || hash === '#/explore') {
        setActiveView('search');
      } else if (hash === '#/notifications') {
        setActiveView('notifications');
        setUnreadCount(0);
      } else if (hash === '#/create') {
        setActiveView('create');
      } else if (hash === '#/admin') {
        setActiveView('admin');
      } else if (hash === '#/terms') {
        setActiveView('terms');
      } else if (hash === '#/privacy') {
        setActiveView('privacy');
      } else if (hash === '#/cookies') {
        setActiveView('cookies');
      } else if (hash === '#/refund') {
        setActiveView('refund');
      } else if (hash === '#/contact') {
        setActiveView('contact');
      } else if (hash === '#/feed' || hash === '' || hash === '#') {
        setActiveView('feed');
      } else {
        setActiveView('404');
      }
      setHideBottomNav(false);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [user]);

  const navigate = (newView: string, param?: string) => {
    if (newView === 'feed') {
      window.location.hash = '#/feed';
    } else if (newView === 'feed_redirect') {
      window.location.hash = '#/feed';
    } else if (newView === 'profile') {
      window.location.hash = param ? `#/profile/${param}` : '#/profile';
    } else if (newView === 'search') {
      window.location.hash = '#/search';
    } else if (newView === 'messages') {
      window.location.hash = param ? `#/messages/${param}` : '#/messages';
    } else if (newView === 'notifications') {
      window.location.hash = '#/notifications';
    } else if (newView === 'create') {
      window.location.hash = '#/create';
    } else if (newView === 'admin') {
      window.location.hash = '#/admin';
    } else {
      window.location.hash = `#/${newView}`;
    }
    if (newView === 'notifications') setUnreadCount(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fullscreen Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-brand-500/20 animate-bounce bg-slate-900 border border-slate-800 flex items-center justify-center">
          <span className="text-xl font-black text-white">A</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
          Restoring DataVerse session...
        </div>
      </div>
    );
  }

  // Unauthorized State (Show Login/Signup or Public Legal Docs / Contact)
  if (!user) {
    if (activeView === 'terms' || activeView === 'privacy' || activeView === 'cookies' || activeView === 'refund' || activeView === 'contact') {
      return (
        <React.Suspense fallback={<ViewFallback />}>
          {activeView === 'contact' ? (
            <Contact onNavigate={navigate} />
          ) : (
            <Legal type={activeView as any} onNavigate={navigate} />
          )}
        </React.Suspense>
      );
    }

    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-2)]" />
        </div>
      }>
        <Auth />
      </React.Suspense>
    );
  }



  return (
    <div 
      className={`bg-[var(--bg)] text-[var(--text)] flex flex-col md:flex-row relative overflow-x-hidden ${
        activeView === 'messages' 
          ? 'h-[var(--vvh,100dvh)] min-h-0 overflow-hidden' 
          : 'min-h-[100dvh]'
      }`}
      style={activeView === 'messages' ? { height: 'var(--vvh, 100dvh)' } : undefined}
    >
      {/* Skip to Main Content Link for Keyboard and Screen Reader Accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[var(--accent)] focus:text-[var(--on-accent)] focus:font-bold focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)] transition-all"
      >
        Skip to main content
      </a>

      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,var(--glow),transparent)] blur-[140px] rounded-full pointer-events-none z-0"></div>

      {/* MOBILE SLIM TOP BAR (below 768px) - Hidden in Messages view so Chats header is the single top bar */}
      {!hideBottomNav && activeView !== 'messages' && (
        <header aria-label="Mobile Top Bar" className="md:hidden sticky top-0 left-0 right-0 h-14 bg-[color-mix(in_srgb,var(--side)_85%,transparent)] backdrop-blur-md border-b border-[var(--line)] flex items-center justify-between px-4 z-40 flex-shrink-0">
          <div 
            onClick={() => navigate('feed')}
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-lg bg-[#040b0d] border border-white/10 flex items-center justify-center p-0.5 shadow-sm">
              <img 
                src="/logo.png?v=2" 
                alt="DataVerse Logo" 
                width="32"
                height="32"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-base font-black tracking-wide bg-gradient-to-r from-[var(--text)] to-[var(--accent-2)] bg-clip-text text-transparent">
              DataVerse
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeIconButton />
            <button
              onClick={() => logout()}
              className="p-2 text-[var(--muted)] hover:text-[var(--danger)] active:scale-95 transition-all rounded-full hover:bg-[var(--hover)] min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* Spacer to prevent content overlap with fixed sidebar on md and lg */}
      <div className="hidden md:block w-20 flex-shrink-0" />

      {/* LEFT SIDEBAR: Collapsed by default (w-20 icon rail), smoothly expands to w-64 on mouse hover / drag into */}
      {/* THEME START */}
      <aside 
        aria-label="Desktop Sidebar"
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        onDragEnter={() => setIsSidebarHovered(true)}
        onDragOver={(e) => { e.preventDefault(); setIsSidebarHovered(true); }}
        onDragLeave={() => setIsSidebarHovered(false)}
        onDrop={() => setIsSidebarHovered(false)}
        className={`hidden md:flex bg-[var(--side)] border-r border-[var(--line)] flex-col justify-between items-start py-6 px-3 fixed inset-y-0 left-0 z-40 select-none overflow-y-auto overflow-x-hidden scrollbar-none transition-all duration-300 ease-in-out group/sidebar ${
          isSidebarHovered 
            ? 'w-64 shadow-2xl shadow-[var(--shadow-card)]' 
            : 'w-20 hover:w-64 hover:shadow-2xl hover:shadow-[var(--shadow-card)]'
        }`}
      >
        
        <div className="w-full space-y-6">
          
          {/* Logo DV circle -> DataVerse Text */}
          <div 
            onClick={() => { navigate('feed'); }}
            className={`flex items-center gap-0 group-hover/sidebar:gap-3 px-2 py-2 cursor-pointer hover:bg-[var(--hover)] rounded-2xl transition-all duration-300 overflow-hidden w-full ${
              isSidebarHovered ? 'gap-3' : ''
            }`}
          >
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[#040b0d] border border-white/10 flex items-center justify-center p-1 shadow-sm">
                <img 
                  src="/logo.png?v=2" 
                  alt="DataVerse Logo" 
                  width="32"
                  height="32"
                  className="w-8 h-8 object-contain"
                />
              </div>
            </div>
            <span className={`text-base font-black tracking-wide whitespace-nowrap bg-gradient-to-r from-[var(--text)] to-[var(--accent-2)] bg-clip-text text-transparent transition-all duration-300 overflow-hidden ${
              isSidebarHovered 
                ? 'max-w-xs opacity-100' 
                : 'max-w-0 opacity-0 group-hover/sidebar:max-w-xs group-hover/sidebar:opacity-100'
            }`}>
              DataVerse
            </span>
          </div>

          {/* Menu Items List */}
          <nav aria-label="Main Navigation" className="space-y-1.5 w-full">
            
            {/* Home */}
            <button
              onClick={() => { navigate('feed'); }}
              title="Home"
              className={`w-full flex items-center gap-0 group-hover/sidebar:gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 ${
                isSidebarHovered ? 'gap-3.5' : ''
              } ${
                activeView === 'feed'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${
                isSidebarHovered 
                  ? 'max-w-xs opacity-100' 
                  : 'max-w-0 opacity-0 group-hover/sidebar:max-w-xs group-hover/sidebar:opacity-100'
              }`}>
                Home
              </span>
            </button>

            {/* Messages */}
            <button
              onClick={() => { navigate('messages'); }}
              title="Messages"
              className={`w-full flex items-center gap-0 group-hover/sidebar:gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 ${
                isSidebarHovered ? 'gap-3.5' : ''
              } ${
                activeView === 'messages'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 transform rotate-[-25deg] translate-y-[-2px] translate-x-[-1px]" />
                {unreadChatsCount > 0 && activeView !== 'messages' && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[12px] h-3 px-0.5 bg-[var(--accent)] rounded-full border border-[var(--side)] text-[7px] font-black text-[var(--on-accent)] shadow shadow-[var(--shadow-accent)]">
                    {unreadChatsCount}
                  </span>
                )}
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${
                isSidebarHovered 
                  ? 'max-w-xs opacity-100' 
                  : 'max-w-0 opacity-0 group-hover/sidebar:max-w-xs group-hover/sidebar:opacity-100'
              }`}>
                Messages
              </span>
            </button>

            {/* Search */}
            <button
              onClick={() => { navigate('search'); }}
              title="Search"
              className={`w-full flex items-center gap-0 group-hover/sidebar:gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 ${
                isSidebarHovered ? 'gap-3.5' : ''
              } ${
                activeView === 'search'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${
                isSidebarHovered 
                  ? 'max-w-xs opacity-100' 
                  : 'max-w-0 opacity-0 group-hover/sidebar:max-w-xs group-hover/sidebar:opacity-100'
              }`}>
                Search
              </span>
            </button>

            {/* Notifications */}
            <button
              onClick={() => { navigate('notifications'); }}
              title="Notifications"
              className={`w-full flex items-center gap-0 group-hover/sidebar:gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 ${
                isSidebarHovered ? 'gap-3.5' : ''
              } ${
                activeView === 'notifications'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5" />
                {unreadCount > 0 && activeView !== 'notifications' && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--accent-2)] rounded-full border border-[var(--side)] shadow shadow-[var(--shadow-accent)]" />
                )}
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${
                isSidebarHovered 
                  ? 'max-w-xs opacity-100' 
                  : 'max-w-0 opacity-0 group-hover/sidebar:max-w-xs group-hover/sidebar:opacity-100'
              }`}>
                Notifications
              </span>
            </button>

            {/* Create */}
            <button
              onClick={() => { navigate('create'); }}
              title="Create"
              className={`w-full flex items-center gap-0 group-hover/sidebar:gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 ${
                isSidebarHovered ? 'gap-3.5' : ''
              } ${
                activeView === 'create'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <PlusSquare className="w-5 h-5" />
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${
                isSidebarHovered 
                  ? 'max-w-xs opacity-100' 
                  : 'max-w-0 opacity-0 group-hover/sidebar:max-w-xs group-hover/sidebar:opacity-100'
              }`}>
                Create
              </span>
            </button>

            {/* Profile */}
            <button
              onClick={() => { navigate('profile'); }}
              title="Profile"
              className={`w-full flex items-center gap-0 group-hover/sidebar:gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 ${
                isSidebarHovered ? 'gap-3.5' : ''
              } ${
                activeView === 'profile'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden border border-[var(--line)] flex-shrink-0 flex items-center justify-center bg-[var(--input)]">
                {user.avatar_url ? (
                  <img src={`/api/media/file/${user.avatar_url}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] font-bold text-[var(--accent-2)] uppercase">{user.username.substring(0, 2)}</span>
                )}
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${
                isSidebarHovered 
                  ? 'max-w-xs opacity-100' 
                  : 'max-w-0 opacity-0 group-hover/sidebar:max-w-xs group-hover/sidebar:opacity-100'
              }`}>
                Profile
              </span>
            </button>

            {/* Admin Console (Admin & Top Admin) */}
            {(user.is_admin || user.is_top_admin) && (
              <button
                onClick={() => { navigate('admin'); }}
                title="Admin Panel"
                className={`w-full flex items-center gap-0 group-hover/sidebar:gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isSidebarHovered ? 'gap-3.5' : ''
                } ${
                  activeView === 'admin'
                    ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-md shadow-[var(--shadow-accent)] font-bold'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
                }`}
              >
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${
                  isSidebarHovered 
                    ? 'max-w-xs opacity-100' 
                    : 'max-w-0 opacity-0 group-hover/sidebar:max-w-xs group-hover/sidebar:opacity-100'
                }`}>
                  Admin Panel
                </span>
              </button>
            )}

          </nav>
        </div>

        {/* Bottom items: Theme Switch + Logout */}
        <div className="w-full mt-auto pt-4 border-t border-[var(--line)] space-y-2">
          {/* Theme switch row just above Logout */}
          <SidebarThemeSwitch isExpanded={isSidebarHovered} />

          <button
            onClick={() => logout()}
            title="Log Out"
            className={`w-full flex items-center gap-0 group-hover/sidebar:gap-3.5 px-4 py-3 rounded-xl text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] transition-all duration-300 ${
              isSidebarHovered ? 'gap-3.5' : ''
            }`}
          >
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${
              isSidebarHovered 
                ? 'max-w-xs opacity-100' 
                : 'max-w-0 opacity-0 group-hover/sidebar:max-w-xs group-hover/sidebar:opacity-100'
            }`}>
              Log Out
            </span>
          </button>
        </div>

      </aside>
      {/* THEME END */}

      {/* RIGHT MAIN BLOCK (Main Viewport) */}
      <div className={`flex-1 flex flex-col relative z-10 min-w-0 ${
        activeView === 'messages' 
          ? 'h-full min-h-0 overflow-hidden' 
          : 'min-h-[100dvh] md:pb-0 pb-16'
      }`}>
        <main id="main-content" tabIndex={-1} className={`flex-1 relative z-10 flex flex-col focus:outline-none ${activeView === 'messages' ? 'h-full min-h-0 overflow-hidden' : ''}`}>
          <React.Suspense fallback={<ViewFallback />}>
            {activeView === 'feed' && <Feed onNavigate={navigate} onToggleBottomNav={setHideBottomNav} />}
            {activeView === 'messages' && <Chat onToggleBottomNav={setHideBottomNav} onNavigate={navigate} targetConvoId={messagesParam} />}
            {activeView === 'search' && <Explore activeRoom="general" onNavigate={navigate} />}
            {activeView === 'notifications' && <Activity onNavigate={navigate} />}
            {activeView === 'create' && <Create onNavigate={navigate} />}
            {activeView === 'profile' && <Profile targetUsername={profileParam} onNavigate={navigate} />}
            {activeView === 'admin' && <Admin />}
            {(activeView === 'terms' || activeView === 'privacy' || activeView === 'cookies' || activeView === 'refund') && (
              <Legal type={activeView as any} onNavigate={navigate} />
            )}
            {activeView === 'contact' && <Contact onNavigate={navigate} />}
            {activeView === '404' && <NotFound onNavigate={navigate} />}
          </React.Suspense>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {/* THEME START */}
      {!hideBottomNav && (
        <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[color-mix(in_srgb,var(--side)_90%,transparent)] backdrop-blur-lg border-t border-[var(--line)] flex justify-around items-center px-2 py-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
        
        {/* Home */}
        <button
          onClick={() => navigate('feed')}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2 transition-all ${activeView === 'feed' ? 'text-[var(--accent-2)] scale-105' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
          aria-label="Home"
        >
          <Home className="w-5.5 h-5.5" />
        </button>

        {/* Search */}
        <button
          onClick={() => navigate('search')}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2 transition-all ${activeView === 'search' ? 'text-[var(--accent-2)] scale-105' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
          aria-label="Search"
        >
          <Search className="w-5.5 h-5.5" />
        </button>

        {/* Raised Create Button in Center */}
        <button
          onClick={() => navigate('create')}
          aria-label="Create Post"
          className="relative -top-4 w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] flex items-center justify-center shadow-lg shadow-[var(--shadow-accent)] border-2 border-[var(--side)] active:scale-95 hover:scale-105 transition-all flex-shrink-0"
        >
          <PlusSquare className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('notifications')}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2 transition-all relative ${activeView === 'notifications' ? 'text-[var(--accent-2)] scale-105' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
          aria-label="Notifications"
        >
          <div className="relative">
            <Heart className="w-5.5 h-5.5" />
            {unreadCount > 0 && activeView !== 'notifications' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--accent-2)] rounded-full border border-[var(--side)]" />
            )}
          </div>
        </button>

        {/* Messages */}
        <button
          onClick={() => navigate('messages')}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2 transition-all relative ${activeView === 'messages' ? 'text-[var(--accent-2)] scale-105' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
          aria-label="Messages"
        >
          <div className="relative">
            <Send className="w-5.5 h-5.5 transform rotate-[-25deg]" />
            {unreadChatsCount > 0 && activeView !== 'messages' && (
              <span className="absolute -top-1 -right-1.5 flex items-center justify-center min-w-[12px] h-3 px-0.5 bg-[var(--accent)] rounded-full border border-[var(--side)] text-[7px] font-black text-[var(--on-accent)] shadow shadow-[var(--shadow-accent)]">
                {unreadChatsCount}
              </span>
            )}
          </div>
        </button>

        {/* Profile */}
        <button
          onClick={() => navigate('profile')}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2"
          aria-label="Profile"
        >
          <div className={`w-6 h-6 rounded-full overflow-hidden border transition-all ${
            activeView === 'profile' ? 'border-[var(--accent-2)] ring-2 ring-[var(--accent-2)]/30 scale-105' : 'border-[var(--line)]'
          }`}>
            {user.avatar_url ? (
              <img src={`/api/media/file/${user.avatar_url}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[var(--input)] flex items-center justify-center text-[8px] font-bold text-[var(--accent-2)] uppercase">
                {user.username.substring(0, 2)}
              </div>
            )}
          </div>
        </button>

        {/* Admin Console (Admin & Top Admin) */}
        {(user.is_admin || user.is_top_admin) && (
          <button
            onClick={() => navigate('admin')}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2 transition-all ${activeView === 'admin' ? 'text-[var(--accent-2)] scale-105' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
            aria-label="Admin Panel"
          >
            <Shield className="w-5.5 h-5.5" />
          </button>
        )}

      </nav>
      )}
      {/* THEME END */}
      {/* UI UPDATE END */}

      <CookieBanner onNavigate={navigate} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
