import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
  is_admin?: boolean;
  is_top_admin?: boolean;
  is_blocked?: boolean;
  is_private?: boolean;
  is_verification_paid?: boolean;
  verification_paid_at?: number;
  verification_category?: string | null;
  verification_document_url?: string | null;
  verification_reason?: string | null;
  verification_status?: string;
  created_at: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously initialize token and user from localStorage for 0ms initial render
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('dataverse_token');
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('dataverse_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Only show a blocking spinner if there is a token but no cached user profile
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const hasToken = !!localStorage.getItem('dataverse_token');
      const hasUser = !!localStorage.getItem('dataverse_user');
      return hasToken && !hasUser;
    } catch {
      return false;
    }
  });

  // Intercept all fetch responses to catch block status
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 403 || response.status === 401) {
        try {
          const clone = response.clone();
          const data = await clone.json();
          if (data && (data.error === 'This account has been blocked' || data.error === 'Unauthorized: Account is blocked')) {
            try {
              sessionStorage.setItem('dv_block_notice', 'Your account has been blocked by the administrator.');
            } catch {}
            localStorage.removeItem('dataverse_token');
            localStorage.removeItem('dataverse_user');
            setToken(null);
            setUser(null);
            window.location.hash = '';
          }
        } catch (e) {
          // ignore
        }
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Background session verification (stale-while-revalidate)
  useEffect(() => {
    const storedToken = localStorage.getItem('dataverse_token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setToken(storedToken);
            setUser(data.user);
            try {
              localStorage.setItem('dataverse_user', JSON.stringify(data.user));
            } catch {}
          }
        } else if (res.status === 401 || res.status === 403) {
          // Token expired or invalid
          localStorage.removeItem('dataverse_token');
          localStorage.removeItem('dataverse_user');
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Failed to restore auth session:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMe();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    try {
      localStorage.setItem('dataverse_token', newToken);
      localStorage.setItem('dataverse_user', JSON.stringify(newUser));
    } catch {}
    setToken(newToken);
    setUser(newUser);
    setLoading(false);
  };

  const logout = async () => {
    const storedToken = localStorage.getItem('dataverse_token');
    if (storedToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });
      } catch (err) {
        console.error('Logout error on backend:', err);
      }
    }
    localStorage.removeItem('dataverse_token');
    localStorage.removeItem('dataverse_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updatedFields };
      setUser(updated);
      try {
        localStorage.setItem('dataverse_user', JSON.stringify(updated));
      } catch {}
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
