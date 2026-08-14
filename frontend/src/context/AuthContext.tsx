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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
            alert('Your account has been blocked by the administrator.');
            localStorage.removeItem('dataverse_token');
            setToken(null);
            setUser(null);
            window.location.href = '/auth';
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

  // Initialize from localStorage
  useEffect(() => {
    const fetchMe = async () => {
      const storedToken = localStorage.getItem('dataverse_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setToken(storedToken);
          setUser(data.user);
        } else {
          // Token expired or invalid
          localStorage.removeItem('dataverse_token');
        }
      } catch (err) {
        console.error('Failed to restore auth session:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('dataverse_token', newToken);
    setToken(newToken);
    setUser(newUser);
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
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updatedFields });
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
