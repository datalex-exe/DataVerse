import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { 
  Home, 
  Search, 
  LogOut, 
  Loader2, 
  Plus,
  PlusSquare, 
  Heart, 
  Send, 
  Shield 
} from 'lucide-react';
/* THEME START */
import { SidebarThemeSwitch } from './utils/theme';
/* THEME END */

import { ToastProvider } from './context/ToastContext';
import { CookieBanner } from './components/CookieBanner';

import { Auth } from './pages/Auth';
import { Feed } from './pages/Feed';
import { Explore } from './pages/Explore';
import { Profile } from './pages/Profile';
import { Chat } from './pages/Chat';
import { Create } from './pages/Create';
import { Activity } from './pages/Activity';

// Secondary views loaded on demand
const Admin = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const NotFound = React.lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const Legal = React.lazy(() => import('./pages/Legal').then(m => ({ default: m.Legal })));
const Contact = React.lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));

const ViewFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[30vh] text-[var(--muted)] animate-in fade-in duration-150">
    <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-2)]" />
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
  const [postParam, setPostParam] = useState<string | undefined>(undefined);
  const [hideBottomNav, setHideBottomNav] = useState<boolean>(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);
  // All primary tabs are mounted in DOM for 0ms instantaneous tab switching
  const [visitedTabs] = useState<Set<string>>(
    () => new Set(['feed', 'messages', 'search', 'notifications', 'create', 'profile'])
  );

  // Preload heavy camera modal in idle time
  React.useEffect(() => {
    if (user) {
      const preloadCamera = () => {
        import('./camera/SocialCameraModal').catch(() => {});
      };
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(preloadCamera);
      } else {
        setTimeout(preloadCamera, 200);
      }
    }
  }, [user]);

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
      messages: 'DataVerse — Direct Messages',
      search: 'DataVerse — Explore Creators',
      notifications: 'DataVerse — Activity & Notifications',
      settings: 'DataVerse — Settings',
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
    } else if (activeView === 'messages' && messagesParam) {
      document.title = 'Chat — DataVerse';
    } else if (activeView === 'feed' && postParam) {
      document.title = 'Post — DataVerse';
    } else {
      document.title = titles[activeView] || 'DataVerse — Social Network by Datalex';
    }
  }, [activeView, profileParam, messagesParam, postParam]);

  // Reserved paths that should never be captured by dynamic :username routes
  const RESERVED_ROUTES = React.useMemo(() => new Set([
    'direct',
    'explore',
    'search',
    'notifications',
    'settings',
    'create',
    'admin',
    'p',
    'post',
    'reel',
    'reels',
    'terms',
    'privacy',
    'cookies',
    'refund',
    'contact',
    'api',
    'login',
    'logout',
    'signup',
    'auth',
    'feed',
    'messages',
    '404',
  ]), []);

  const resolveRoute = React.useCallback((pathname: string, hash: string) => {
    let raw = '';
    let fromHash = false;

    // 1. Detect and migrate legacy hash links (e.g. #/messages/123 or #/feed)
    if (hash && hash.length > 1) {
      fromHash = true;
      raw = hash.replace(/^#\/?/, '');
    } else {
      // 2. Modern HTML5 History API pathname
      raw = pathname.replace(/^\/+|\/+$/g, '');
    }

    // A. Root / Feed
    if (!raw || raw === 'feed') {
      return {
        view: 'feed',
        canonicalPath: '/',
        shouldReplaceState: fromHash || pathname !== '/',
      };
    }

    // B. Direct Messages
    if (raw === 'direct' || raw === 'messages') {
      return {
        view: 'messages',
        canonicalPath: '/direct/',
        shouldReplaceState: fromHash || pathname !== '/direct/',
      };
    }

    if (raw.startsWith('direct/t/')) {
      const convoId = raw.slice('direct/t/'.length).replace(/\/+$/, '');
      return {
        view: 'messages',
        messagesParam: convoId,
        canonicalPath: `/direct/t/${convoId}/`,
        shouldReplaceState: fromHash || pathname !== `/direct/t/${convoId}/`,
      };
    }

    if (raw.startsWith('messages/')) {
      const convoId = raw.slice('messages/'.length).replace(/\/+$/, '');
      return {
        view: 'messages',
        messagesParam: convoId,
        canonicalPath: `/direct/t/${convoId}/`,
        shouldReplaceState: true,
      };
    }

    // C. Explore / Search
    if (raw === 'explore' || raw === 'search') {
      return {
        view: 'search',
        canonicalPath: '/explore/',
        shouldReplaceState: fromHash || pathname !== '/explore/',
      };
    }

    // D. Notifications / Activity
    if (raw === 'notifications' || raw === 'activity') {
      return {
        view: 'notifications',
        canonicalPath: '/notifications/',
        shouldReplaceState: fromHash || pathname !== '/notifications/',
      };
    }

    // E. Settings
    if (raw === 'settings') {
      return {
        view: 'settings',
        canonicalPath: '/settings/',
        shouldReplaceState: fromHash || pathname !== '/settings/',
      };
    }

    // F. Create
    if (raw === 'create') {
      return {
        view: 'create',
        canonicalPath: '/create/',
        shouldReplaceState: fromHash || pathname !== '/create/',
      };
    }

    // G. Posts & Reels
    if (raw.startsWith('p/') || raw.startsWith('post/')) {
      const postId = (raw.startsWith('p/') ? raw.slice('p/'.length) : raw.slice('post/'.length)).replace(/\/+$/, '');
      return {
        view: 'feed',
        postParam: postId,
        canonicalPath: `/p/${postId}/`,
        shouldReplaceState: fromHash || pathname !== `/p/${postId}/`,
      };
    }

    if (raw.startsWith('reel/') || raw.startsWith('reels/')) {
      const reelId = (raw.startsWith('reel/') ? raw.slice('reel/'.length) : raw.slice('reels/'.length)).replace(/\/+$/, '');
      return {
        view: 'feed',
        postParam: reelId,
        canonicalPath: `/reel/${reelId}/`,
        shouldReplaceState: fromHash || pathname !== `/reel/${reelId}/`,
      };
    }

    // H. Admin Console
    if (raw === 'admin') {
      return {
        view: 'admin',
        canonicalPath: '/admin/',
        shouldReplaceState: fromHash || pathname !== '/admin/',
      };
    }

    // I. Public Legal & Contact Pages
    if (['terms', 'privacy', 'cookies', 'refund', 'contact'].includes(raw)) {
      return {
        view: raw,
        canonicalPath: `/${raw}/`,
        shouldReplaceState: fromHash || pathname !== `/${raw}/`,
      };
    }

    // J. User Profiles (/@username, /profile/:username, or modern /:username/)
    if (raw.startsWith('@')) {
      const username = raw.slice(1).replace(/\/+$/, '');
      return {
        view: 'profile',
        profileParam: username,
        canonicalPath: `/${username}/`,
        shouldReplaceState: fromHash || pathname !== `/${username}/`,
      };
    }

    if (raw.startsWith('profile/')) {
      const username = raw.slice('profile/'.length).replace(/\/+$/, '');
      return {
        view: 'profile',
        profileParam: username,
        canonicalPath: `/${username}/`,
        shouldReplaceState: fromHash || pathname !== `/${username}/`,
      };
    }

    if (raw === 'profile') {
      const targetPath = user?.username ? `/${user.username}/` : '/profile/';
      return {
        view: 'profile',
        profileParam: undefined,
        canonicalPath: targetPath,
        shouldReplaceState: fromHash || pathname !== targetPath,
      };
    }

    // Dynamic creator username route (when not matching reserved paths)
    if (!RESERVED_ROUTES.has(raw) && /^[a-zA-Z0-9_.\-@]{2,64}$/.test(raw)) {
      return {
        view: 'profile',
        profileParam: raw,
        canonicalPath: `/${raw}/`,
        shouldReplaceState: fromHash || pathname !== `/${raw}/`,
      };
    }

    // 404 Fallback
    return {
      view: '404',
      canonicalPath: pathname,
      shouldReplaceState: false,
    };
  }, [user, RESERVED_ROUTES]);

  React.useEffect(() => {
    const handleLocationChange = () => {
      const resolved = resolveRoute(window.location.pathname, window.location.hash);

      setActiveView(resolved.view);
      setProfileParam(resolved.profileParam);
      setMessagesParam(resolved.messagesParam);
      setPostParam(resolved.postParam);
      setHideBottomNav(resolved.view === 'messages' && Boolean(resolved.messagesParam));

      if (resolved.view === 'notifications') {
        setUnreadCount(0);
      }

      if (resolved.shouldReplaceState) {
        window.history.replaceState(null, '', resolved.canonicalPath + window.location.search);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [resolveRoute]);

  const navigate = (newView: string, param?: string) => {
    let targetPath = '/';

    if (newView === 'feed' || newView === 'feed_redirect') {
      setActiveView('feed');
      setProfileParam(undefined);
      setMessagesParam(undefined);
      setPostParam(undefined);
      setHideBottomNav(false);
      targetPath = '/';
    } else if (newView === 'messages') {
      setActiveView('messages');
      setMessagesParam(param || undefined);
      setProfileParam(undefined);
      setPostParam(undefined);
      setHideBottomNav(Boolean(param));
      targetPath = param ? `/direct/t/${param}/` : '/direct/';
    } else if (newView === 'profile') {
      setActiveView('profile');
      setProfileParam(param || undefined);
      setMessagesParam(undefined);
      setPostParam(undefined);
      setHideBottomNav(false);
      targetPath = param ? `/${param}/` : (user?.username ? `/${user.username}/` : '/profile/');
    } else if (newView === 'search' || newView === 'explore') {
      setActiveView('search');
      setProfileParam(undefined);
      setMessagesParam(undefined);
      setPostParam(undefined);
      setHideBottomNav(false);
      targetPath = '/explore/';
    } else if (newView === 'notifications') {
      setActiveView('notifications');
      setProfileParam(undefined);
      setMessagesParam(undefined);
      setPostParam(undefined);
      setHideBottomNav(false);
      setUnreadCount(0);
      targetPath = '/notifications/';
    } else if (newView === 'settings') {
      setActiveView('settings');
      setProfileParam(undefined);
      setMessagesParam(undefined);
      setPostParam(undefined);
      setHideBottomNav(false);
      targetPath = '/settings/';
    } else if (newView === 'create') {
      setActiveView('create');
      setProfileParam(undefined);
      setMessagesParam(undefined);
      setPostParam(undefined);
      setHideBottomNav(false);
      targetPath = '/create/';
    } else if (newView === 'post' || newView === 'p') {
      setActiveView('feed');
      setPostParam(param);
      setProfileParam(undefined);
      setMessagesParam(undefined);
      setHideBottomNav(false);
      targetPath = `/p/${param}/`;
    } else if (newView === 'reel') {
      setActiveView('feed');
      setPostParam(param);
      setProfileParam(undefined);
      setMessagesParam(undefined);
      setHideBottomNav(false);
      targetPath = `/reel/${param}/`;
    } else if (newView === 'admin') {
      setActiveView('admin');
      setProfileParam(undefined);
      setMessagesParam(undefined);
      setPostParam(undefined);
      setHideBottomNav(false);
      targetPath = '/admin/';
    } else {
      setActiveView(newView);
      setProfileParam(undefined);
      setMessagesParam(undefined);
      setPostParam(undefined);
      setHideBottomNav(false);
      targetPath = `/${newView}/`;
    }

    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo(0, 0);
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

    return <Auth />;
  }



  return (
    <div 
      className={`bg-[var(--bg)] text-[var(--text)] flex flex-col md:flex-row relative overflow-x-hidden ${
        activeView === 'messages' 
          ? 'h-[var(--vvh,100dvh)] min-h-0 overflow-hidden' 
          : 'min-h-[100dvh]'
      }`}
      style={activeView === 'messages' ? { height: 'var(--vvh, 100dvh)' } : { background: 'var(--bg-gradient, var(--bg))' }}
    >
      {/* Skip to Main Content Link for Keyboard and Screen Reader Accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[var(--accent)] focus:text-[var(--on-accent)] focus:font-bold focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)] transition-all"
      >
        Skip to main content
      </a>

      {/* Two soft blurred aurora glows (top-left and lower-right) fixed behind content */}
      <div 
        aria-hidden="true"
        className="fixed top-0 left-0 w-[550px] h-[550px] bg-[radial-gradient(ellipse_at_center,var(--glow),transparent)] blur-[140px] rounded-full pointer-events-none -translate-x-1/3 -translate-y-1/3 z-0" 
      />
      <div 
        aria-hidden="true"
        className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,var(--glow),transparent)] blur-[160px] rounded-full pointer-events-none translate-x-1/3 translate-y-1/3 z-0" 
      />

      {/* MOBILE TOP APP BAR (below 768px) - Reference: Logo tile + wordmark on left, action icons on right */}
      {!hideBottomNav && activeView !== 'messages' && (
        <header aria-label="Mobile Top Bar" className="md:hidden sticky top-0 left-0 right-0 h-14 bg-[color-mix(in_srgb,var(--side)_85%,transparent)] backdrop-blur-md border-b border-[var(--line)] flex items-center justify-between px-4 z-40 flex-shrink-0">
          <div 
            onClick={() => navigate('feed')}
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-xl bg-[var(--side)] border border-[color-mix(in_srgb,var(--accent-2)_35%,transparent)] flex items-center justify-center p-1 shadow-sm">
              <img 
                src="/logo.png?v=2" 
                alt="DataVerse Logo" 
                width="22"
                height="22"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-base font-semibold tracking-wide">
              <span className="text-[var(--text)]">Data</span><span className="text-[var(--accent-2)]">Verse</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('search')}
              className="p-2 text-[var(--muted)] hover:text-[var(--text)] active:scale-95 transition-all rounded-full hover:bg-[var(--hover)] min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-5 h-5 stroke-[1.8]" />
            </button>
            <button
              onClick={() => navigate('notifications')}
              className="p-2 text-[var(--muted)] hover:text-[var(--text)] active:scale-95 transition-all rounded-full hover:bg-[var(--hover)] min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer relative"
              aria-label="Notifications"
            >
              <Heart className="w-5 h-5 stroke-[1.8]" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--accent-2)]" />
              )}
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
          
          {/* Logo tile + Wordmark */}
          <div 
            onClick={() => { navigate('feed'); }}
            className={`flex items-center gap-0 group-hover/sidebar:gap-3 px-2 py-2 cursor-pointer hover:bg-[var(--hover)] rounded-2xl transition-all duration-300 overflow-hidden w-full ${
              isSidebarHovered ? 'gap-3' : ''
            }`}
          >
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--side)] border border-[color-mix(in_srgb,var(--accent-2)_35%,transparent)] flex items-center justify-center p-1 shadow-sm">
                <img 
                  src="/logo.png?v=2" 
                  alt="DataVerse Logo" 
                  width="26"
                  height="26"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <span className={`text-base font-semibold tracking-wide whitespace-nowrap transition-all duration-300 overflow-hidden ${
              isSidebarHovered 
                ? 'max-w-xs opacity-100' 
                : 'max-w-0 opacity-0 group-hover/sidebar:max-w-xs group-hover/sidebar:opacity-100'
            }`}>
              <span className="text-[var(--text)]">Data</span><span className="text-[var(--accent-2)]">Verse</span>
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
                  ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)] font-semibold shadow-sm relative before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-r before:bg-[var(--accent-2)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5 stroke-[1.8]" />
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
                  ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)] font-semibold shadow-sm relative before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-r before:bg-[var(--accent-2)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 stroke-[1.8] transform rotate-[-25deg] translate-y-[-2px] translate-x-[-1px]" />
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
                  ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)] font-semibold shadow-sm relative before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-r before:bg-[var(--accent-2)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Search className="w-5 h-5 stroke-[1.8]" />
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
                  ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)] font-semibold shadow-sm relative before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-r before:bg-[var(--accent-2)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 stroke-[1.8]" />
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
                  ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)] font-semibold shadow-sm relative before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-r before:bg-[var(--accent-2)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <PlusSquare className="w-5 h-5 stroke-[1.8]" />
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
                  ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)] font-semibold shadow-sm relative before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-r before:bg-[var(--accent-2)]'
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
                    ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)] font-semibold shadow-sm relative before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-r before:bg-[var(--accent-2)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
                }`}
              >
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 stroke-[1.8]" />
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
            {/* Primary Core Views - Kept mounted once visited for 0ms instant tab switching */}
            {visitedTabs.has('feed') && (
              <div className={activeView === 'feed' ? 'block w-full flex-1' : 'hidden'}>
                <Feed onNavigate={navigate} onToggleBottomNav={setHideBottomNav} targetPostId={postParam} />
              </div>
            )}

            {visitedTabs.has('messages') && (
              <div className={activeView === 'messages' ? 'h-full min-h-0 flex-1 flex flex-col' : 'hidden'}>
                <Chat onToggleBottomNav={setHideBottomNav} onNavigate={navigate} targetConvoId={messagesParam} />
              </div>
            )}

            {visitedTabs.has('search') && (
              <div className={activeView === 'search' ? 'block w-full flex-1' : 'hidden'}>
                <Explore activeRoom="general" onNavigate={navigate} />
              </div>
            )}

            {visitedTabs.has('notifications') && (
              <div className={activeView === 'notifications' ? 'block w-full flex-1' : 'hidden'}>
                <Activity onNavigate={navigate} />
              </div>
            )}

            {visitedTabs.has('create') && (
              <div className={activeView === 'create' ? 'block w-full flex-1' : 'hidden'}>
                <Create onNavigate={navigate} />
              </div>
            )}

            {visitedTabs.has('profile') && !profileParam && activeView !== 'settings' && (
              <div className={activeView === 'profile' && !profileParam ? 'block w-full flex-1' : 'hidden'}>
                <Profile onNavigate={navigate} />
              </div>
            )}

            {/* Dynamic / Parameter-based Views */}
            {activeView === 'settings' && <Profile initialShowSettings={true} onNavigate={navigate} />}
            {activeView === 'profile' && !!profileParam && <Profile targetUsername={profileParam} onNavigate={navigate} />}
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
      {!hideBottomNav && !(activeView === 'messages' && (Boolean(messagesParam) || hideBottomNav)) && (
        <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[color-mix(in_srgb,var(--side)_90%,transparent)] backdrop-blur-lg border-t border-[var(--line)] flex justify-around items-center px-2 py-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
        
        {/* Home */}
        <button
          onClick={() => navigate('feed')}
          className={`min-w-[44px] flex flex-col items-center justify-center p-1 transition-all ${
            activeView === 'feed'
              ? 'text-[var(--accent-2)] font-semibold drop-shadow-[0_0_8px_var(--shadow-accent)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] font-medium'
          }`}
          aria-label="Home"
        >
          <Home className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[11px] tracking-tight mt-0.5">Home</span>
        </button>

        {/* Search */}
        <button
          onClick={() => navigate('search')}
          className={`min-w-[44px] flex flex-col items-center justify-center p-1 transition-all ${
            activeView === 'search'
              ? 'text-[var(--accent-2)] font-semibold drop-shadow-[0_0_8px_var(--shadow-accent)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] font-medium'
          }`}
          aria-label="Explore"
        >
          <Search className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[11px] tracking-tight mt-0.5">Explore</span>
        </button>

        {/* Raised Create Button in Center */}
        <div className="relative -top-4 flex flex-col items-center">
          <button
            onClick={() => navigate('create')}
            aria-label="Create Post"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] flex items-center justify-center shadow-lg shadow-[var(--shadow-accent)] border-4 border-[var(--bg)] active:scale-95 hover:scale-105 transition-all flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[2.2]" />
          </button>
        </div>

        {/* Notifications */}
        <button
          onClick={() => navigate('notifications')}
          className={`min-w-[44px] flex flex-col items-center justify-center p-1 transition-all relative ${
            activeView === 'notifications'
              ? 'text-[var(--accent-2)] font-semibold drop-shadow-[0_0_8px_var(--shadow-accent)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] font-medium'
          }`}
          aria-label="Notifications"
        >
          <div className="relative">
            <Heart className="w-5 h-5 stroke-[1.8]" />
            {unreadCount > 0 && activeView !== 'notifications' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--accent-2)] rounded-full border border-[var(--side)]" />
            )}
          </div>
          <span className="text-[11px] tracking-tight mt-0.5">Alerts</span>
        </button>

        {/* Messages */}
        <button
          onClick={() => navigate('messages')}
          className={`min-w-[44px] flex flex-col items-center justify-center p-1 transition-all relative ${
            activeView === 'messages'
              ? 'text-[var(--accent-2)] font-semibold drop-shadow-[0_0_8px_var(--shadow-accent)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] font-medium'
          }`}
          aria-label="Messages"
        >
          <div className="relative">
            <Send className="w-5 h-5 stroke-[1.8] transform rotate-[-25deg]" />
            {unreadChatsCount > 0 && activeView !== 'messages' && (
              <span className="absolute -top-1 -right-1.5 flex items-center justify-center min-w-[12px] h-3 px-0.5 bg-[var(--accent)] rounded-full border border-[var(--side)] text-[7px] font-black text-[var(--on-accent)] shadow shadow-[var(--shadow-accent)]">
                {unreadChatsCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight mt-0.5">Chats</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => navigate('profile')}
          className={`min-w-[44px] flex flex-col items-center justify-center p-1 transition-all ${
            activeView === 'profile'
              ? 'text-[var(--accent-2)] font-semibold drop-shadow-[0_0_8px_var(--shadow-accent)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] font-medium'
          }`}
          aria-label="Profile"
        >
          <div className={`w-5.5 h-5.5 rounded-full overflow-hidden border transition-all ${
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
          <span className="text-[11px] tracking-tight mt-0.5">Profile</span>
        </button>

        {/* Admin Console (Admin & Top Admin) */}
        {(user.is_admin || user.is_top_admin) && (
          <button
            onClick={() => navigate('admin')}
            className={`min-w-[44px] flex flex-col items-center justify-center p-1 transition-all ${
              activeView === 'admin'
                ? 'text-[var(--accent-2)] font-semibold drop-shadow-[0_0_8px_var(--shadow-accent)]'
                : 'text-[var(--muted)] hover:text-[var(--text)] font-medium'
            }`}
            aria-label="Admin Panel"
          >
            <Shield className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[11px] tracking-tight mt-0.5">Admin</span>
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
