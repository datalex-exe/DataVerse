import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Auth } from './pages/Auth';
import { Feed } from './pages/Feed';
import { Explore } from './pages/Explore';
import { Profile } from './pages/Profile';
import { Chat } from './pages/Chat';
import { Create } from './pages/Create';
import { Activity } from './pages/Activity';
import { Admin } from './pages/Admin';
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

const AppContent: React.FC = () => {
  const { user, loading, logout, token } = useAuth();
  
  // Single active view state matching Instagram layout
  const [activeView, setActiveView] = useState<string>('feed');
  const [profileParam, setProfileParam] = useState<string | undefined>(undefined);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState<number>(0);
  const [messagesParam, setMessagesParam] = useState<string | undefined>(undefined);
  const [hideBottomNav, setHideBottomNav] = useState<boolean>(false);


  const [isMobile, setIsMobile] = React.useState<boolean>(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (activeView === 'messages' && mobile) {
        document.documentElement.style.height = '100%';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.height = '100%';
        document.body.style.overflow = 'hidden';
      } else {
        document.documentElement.style.height = '';
        document.documentElement.style.overflow = '';
        document.body.style.height = '';
        document.body.style.overflow = '';
      }
    };

    const resetScroll = () => {
      const mobile = window.innerWidth < 768;
      if (activeView === 'messages' && mobile) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    window.addEventListener('scroll', resetScroll);
    document.addEventListener('focusin', resetScroll);
    
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('scroll', resetScroll);
      document.removeEventListener('focusin', resetScroll);
      
      document.documentElement.style.height = '';
      document.documentElement.style.overflow = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
    };
  }, [activeView]);

  React.useEffect(() => {
    if (activeView !== 'messages' || !isMobile) return;

    const preventTouchScroll = (e: TouchEvent) => {
      let target = e.target as HTMLElement | null;
      let isScrollable = false;
      
      while (target && target !== document.body) {
        if (target.classList.contains('overflow-y-auto') || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
          isScrollable = true;
          break;
        }
        target = target.parentElement;
      }

      if (!isScrollable) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('touchmove', preventTouchScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [activeView, isMobile]);


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
    fetchUnreadCount();
    fetchUnreadChatsCount();
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
      } else {
        setActiveView('feed');
      }
      setHideBottomNav(false);
    };

    window.addEventListener('hashchange', handleHashChange);
    
    if (user) {
      handleHashChange();
    } else {
      window.location.hash = '';
    }

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

  // Unauthorized State (Show Login/Signup)
  if (!user) {
    return <Auth />;
  }



  return (
    <div 
      className={`bg-[#030303] text-slate-100 flex flex-col md:flex-row relative overflow-x-hidden ${
        activeView === 'messages' 
          ? 'h-[100dvh] min-h-0 overflow-hidden' 
          : 'min-h-screen'
      }`}
    >
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-brand-900/10 via-brand-500/5 to-transparent blur-[130px] rounded-full pointer-events-none z-0"></div>

      {/* Spacer to prevent content overlap with fixed sidebar */}
      <div className="hidden md:block w-16 flex-shrink-0" />

      {/* LEFT SIDEBAR: INSTAGRAM-STYLE COLLAPSED & EXPAND ON HOVER */}
      <aside className="hidden md:flex w-16 hover:w-56 group transition-all duration-300 ease-in-out bg-[#060608] border-r border-white/[0.04] flex-col justify-between items-start py-6 px-3 fixed inset-y-0 left-0 z-40 select-none overflow-y-auto overflow-x-hidden scrollbar-none">
        
        <div className="w-full space-y-8">
          
          {/* Logo DV circle -> DataVerse Text */}
          <div 
            onClick={() => { navigate('feed'); }}
            className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-900/10 rounded-2xl transition-all"
          >
            <img 
              src="/logo.png?v=2" 
              alt="DataVerse Logo" 
              className="w-8 h-8 object-contain flex-shrink-0"
            />
            <span className="text-sm font-black text-white tracking-widest opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-200 overflow-hidden whitespace-nowrap bg-gradient-to-r from-white to-brand-300 bg-clip-text text-transparent">
              DataVerse
            </span>
          </div>

          {/* Menu Items List */}
          <nav className="space-y-2 w-full">
            
            {/* Home */}
            <button
              onClick={() => { navigate('feed'); }}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                activeView === 'feed'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                  : 'text-slate-450 hover:text-white hover:bg-slate-900/30'
              }`}
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs font-bold opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-200 overflow-hidden whitespace-nowrap">
                Home
              </span>
            </button>

            <button
              onClick={() => { navigate('messages'); }}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                activeView === 'messages'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                  : 'text-slate-455 hover:text-white hover:bg-slate-900/30'
              }`}
            >
              <div className="relative flex-shrink-0">
                <Send className="w-5 h-5 transform rotate-[-25deg] translate-y-[-2px] translate-x-[-1px]" />
                {unreadChatsCount > 0 && activeView !== 'messages' && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[12px] h-3 px-0.5 bg-brand-500 rounded-full border border-[#060608] text-[7px] font-black text-white shadow shadow-brand-500/50">
                    {unreadChatsCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-200 overflow-hidden whitespace-nowrap">
                Messages
              </span>
            </button>

            {/* Search */}
            <button
              onClick={() => { navigate('search'); }}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                activeView === 'search'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                  : 'text-slate-455 hover:text-white hover:bg-slate-900/30'
              }`}
            >
              <Search className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs font-bold opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-200 overflow-hidden whitespace-nowrap">
                Search
              </span>
            </button>

            {/* Notifications */}
            <button
              onClick={() => { navigate('notifications'); }}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                activeView === 'notifications'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                  : 'text-slate-455 hover:text-white hover:bg-slate-900/30'
              }`}
            >
              <div className="relative flex-shrink-0">
                <Heart className="w-5 h-5" />
                {unreadCount > 0 && activeView !== 'notifications' && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border border-[#060608] shadow shadow-blue-600/50" />
                )}
              </div>
              <span className="text-xs font-bold opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-200 overflow-hidden whitespace-nowrap">
                Notifications
              </span>
            </button>

            {/* Create */}
            <button
              onClick={() => { navigate('create'); }}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                activeView === 'create'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                  : 'text-slate-455 hover:text-white hover:bg-slate-900/30'
              }`}
            >
              <PlusSquare className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs font-bold opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-200 overflow-hidden whitespace-nowrap">
                Create
              </span>
            </button>

            {/* Profile */}
            <button
              onClick={() => { navigate('profile'); }}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                activeView === 'profile'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                  : 'text-slate-455 hover:text-white hover:bg-slate-900/30'
              }`}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 flex-shrink-0 flex items-center justify-center bg-slate-900">
                {user.avatar_url ? (
                  <img src={`/api/media/file/${user.avatar_url}`} alt="Me" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] font-bold text-brand-400 uppercase">{user.username.substring(0, 2)}</span>
                )}
              </div>
              <span className="text-xs font-bold opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-200 overflow-hidden whitespace-nowrap">
                Profile
              </span>
            </button>

            {/* Admin Console (Admin & Top Admin) */}
            {(user.is_admin || user.is_top_admin) && (
              <button
                onClick={() => { navigate('admin'); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                  activeView === 'admin'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                    : 'text-slate-455 hover:text-white hover:bg-slate-900/30'
                }`}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-bold opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-200 overflow-hidden whitespace-nowrap">
                  Admin Panel
                </span>
              </button>
            )}

          </nav>
        </div>

        {/* Bottom items: Logout */}
        <div className="w-full mt-auto">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-4 p-3 rounded-2xl text-red-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-bold opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-200 overflow-hidden whitespace-nowrap">
              Log Out
            </span>
          </button>
        </div>

      </aside>



      {/* RIGHT MAIN BLOCK (Main Viewport) */}
      <div className={`flex-1 flex flex-col relative z-10 ${
        activeView === 'messages' 
          ? 'h-0 md:h-full min-h-0 overflow-hidden'
          : 'min-h-screen md:pb-0 pb-16'
      }`}>
        <main className={`flex-1 relative z-10 flex flex-col ${activeView === 'messages' ? 'h-full min-h-0 overflow-hidden' : ''}`}>
          {activeView === 'feed' && <Feed onNavigate={navigate} onToggleBottomNav={setHideBottomNav} />}

          {activeView === 'messages' && <Chat onToggleBottomNav={setHideBottomNav} onNavigate={navigate} targetConvoId={messagesParam} />}
          {activeView === 'search' && <Explore activeRoom="general" onNavigate={navigate} />}
          {activeView === 'notifications' && <Activity onNavigate={navigate} />}
          {activeView === 'create' && <Create onNavigate={navigate} />}
          {activeView === 'profile' && <Profile targetUsername={profileParam} onNavigate={navigate} />}
          {activeView === 'admin' && <Admin />}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {!hideBottomNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#060608]/95 backdrop-blur-lg border-t border-white/[0.04] flex justify-around items-center z-40 px-2 shadow-2xl">
        
        {/* Home */}
        <button
          onClick={() => navigate('feed')}
          className={`p-2 transition-all ${activeView === 'feed' ? 'text-brand-500 scale-110' : 'text-slate-500'}`}
        >
          <Home className="w-5.5 h-5.5" />
        </button>

        {/* Search */}
        <button
          onClick={() => navigate('search')}
          className={`p-2 transition-all ${activeView === 'search' ? 'text-brand-500 scale-110' : 'text-slate-500'}`}
        >
          <Search className="w-5.5 h-5.5" />
        </button>

        {/* Notifications (mobile) */}
        <button
          onClick={() => navigate('notifications')}
          className={`p-2 transition-all relative ${activeView === 'notifications' ? 'text-brand-500 scale-110' : 'text-slate-500'}`}
        >
          <Heart className="w-5.5 h-5.5" />
          {unreadCount > 0 && activeView !== 'notifications' && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full border border-[#060608]" />
          )}
        </button>



        {/* Create */}
        <button
          onClick={() => navigate('create')}
          className={`p-2 transition-all ${activeView === 'create' ? 'text-brand-500 scale-110' : 'text-slate-500'}`}
        >
          <PlusSquare className="w-5.5 h-5.5" />
        </button>

        {/* Messages */}
        <button
          onClick={() => navigate('messages')}
          className={`p-2 transition-all relative ${activeView === 'messages' ? 'text-brand-500 scale-110' : 'text-slate-500'}`}
        >
          <Send className="w-5.5 h-5.5 transform rotate-[-25deg]" />
          {unreadChatsCount > 0 && activeView !== 'messages' && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[12px] h-3 px-0.5 bg-brand-500 rounded-full border border-[#060608] text-[7px] font-black text-white shadow shadow-brand-500/50">
              {unreadChatsCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <button
          onClick={() => navigate('profile')}
          className={`w-6 h-6 rounded-full overflow-hidden border transition-all ${
            activeView === 'profile' ? 'border-brand-500 ring-2 ring-brand-500/20 scale-105' : 'border-white/10'
          }`}
        >
          {user.avatar_url ? (
            <img src={`/api/media/file/${user.avatar_url}`} alt="Me" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[8px] font-bold text-brand-400 uppercase">
              {user.username.substring(0, 2)}
            </div>
          )}
        </button>

        {/* Admin Console (Admin & Top Admin) */}
        {(user.is_admin || user.is_top_admin) && (
          <button
            onClick={() => navigate('admin')}
            className={`p-2 transition-all ${activeView === 'admin' ? 'text-brand-500 scale-110' : 'text-slate-500'}`}
          >
            <Shield className="w-5.5 h-5.5" />
          </button>
        )}

      </nav>
      )}

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
