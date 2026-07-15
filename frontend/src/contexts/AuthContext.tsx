'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  department: string;
  mustChangePassword?: boolean;
  destination?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check local storage for token on mount
    const savedToken = localStorage.getItem('invictus_jwt');
    const savedUser = localStorage.getItem('invictus_user');
    
    if (savedToken && savedUser) {
      // eslint-disable-next-line
      setToken(savedToken);
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('invictus_jwt');
          localStorage.removeItem('invictus_user');
          setToken(null);
          setUser(null);
        }
      } catch(e) {}
    }
    setLoading(false);
  }, []);

  const getDashboardRoute = (user: User | null) => {
    if (!user) return '/login';
    if (user.mustChangePassword) return '/set-password';
    if (user.destination) return user.destination;
    
    const { role } = user;
    if (role === 'admin' || role === 'ops') return '/dashboard';
    return '/my-workspace';
  };

  useEffect(() => {
    if (!loading) {
      if (!token && !pathname.startsWith('/login')) {
        router.push('/login');
      } else if (token) {
        if (user?.mustChangePassword && pathname !== '/set-password') {
          router.push('/set-password');
        } else if (!user?.mustChangePassword && (pathname === '/login' || pathname === '/set-password')) {
          router.push(getDashboardRoute(user));
        }
      }
    }
  }, [token, loading, pathname, router, user]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('invictus_jwt', newToken);
    localStorage.setItem('invictus_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    router.push(getDashboardRoute(newUser));
  };

  const logout = () => {
    // Only clear this session's auth — not invictus_app_state_v2. This app has no
    // real backend for tasks/notifications, so that blob is the shared "database"
    // every user on this browser reads from; clearing it on logout would destroy
    // tasks/assignments other accounts created, not just stale per-session data.
    localStorage.removeItem('invictus_jwt');
    localStorage.removeItem('invictus_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
