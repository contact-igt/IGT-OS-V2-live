'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  department: string;
  mustChangePassword?: boolean;
  destination?: string;
  grantedPages?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  grantedPagesReady: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  grantedPagesReady: false,
  login: () => {},
  logout: () => {},
});

// The session itself lives in HttpOnly cookies the browser sends automatically — the
// frontend never reads or stores a token. This maps the (snake_case) GET /api/users/me
// response into the same shape POST /api/login already returns.
function mapMeResponse(data: any): User {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    department: data.department || '',
    mustChangePassword: data.must_change_password,
    destination: data.destination,
    grantedPages: data.granted_pages || [],
  };
}

// How often to silently refresh the access token while the app is open, well under its
// 15-minute lifetime so an active session never hits a 401 mid-use. If this fails, the
// refresh token itself has expired/been revoked and the user is signed out.
const SILENT_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [grantedPagesReady, setGrantedPagesReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchMe = useCallback(async (): Promise<User | null> => {
    const res = await fetch(`${baseUrl}/api/users/me`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return mapMeResponse(data);
  }, [baseUrl]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${baseUrl}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      return res.ok;
    } catch {
      return false;
    }
  }, [baseUrl]);

  // Session restore on load — there's no token in JS to check, so this asks the backend
  // whether the request's cookies represent a valid session. If the (short-lived) access
  // token cookie has already expired, one silent refresh is attempted before giving up, so
  // a plain browser refresh doesn't log an otherwise-valid session out.
  useEffect(() => {
    setIsMounted(true);
    let cancelled = false;

    (async () => {
      try {
        let me = await fetchMe();
        if (!me) {
          const refreshed = await refreshSession();
          if (refreshed) me = await fetchMe();
        }
        if (!cancelled) setUser(me);
      } catch (e) {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fetchMe, refreshSession]);

  // Background silent refresh so long-lived sessions don't quietly expire mid-use.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const ok = await refreshSession();
      if (!ok && userRef.current) {
        setUser(null);
        router.push('/login');
      }
    }, SILENT_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, refreshSession, router]);

  useEffect(() => {
    if (!user) {
      setGrantedPagesReady(false);
      return;
    }
    setGrantedPagesReady(false);
    fetchMe()
      .then(me => {
        if (me) setUser(prev => prev ? { ...prev, grantedPages: me.grantedPages } : prev);
      })
      .catch(err => console.error('Failed to load granted pages:', err))
      .finally(() => setGrantedPagesReady(true));
  }, [user?.id, fetchMe]);

  // Silently refresh granted pages on every navigation — an admin-granted page should show
  // up the next time this user moves around the app, not only after a full re-login. This
  // doesn't touch grantedPagesReady, so it never re-blocks the redirect guard below.
  useEffect(() => {
    if (!user) return;
    fetchMe()
      .then(me => {
        if (me) setUser(prev => prev ? { ...prev, grantedPages: me.grantedPages } : prev);
      })
      .catch(err => console.error('Failed to refresh granted pages:', err));
  }, [pathname]);

  const getDashboardRoute = (user: User | null) => {
    if (!user) return '/login';
    if (user.mustChangePassword) return '/set-password';
    if (user.destination) return user.destination;

    const { role } = user;
    if (role === 'admin' || role === 'ops') return '/dashboard';
    return '/my-workspace';
  };

  useEffect(() => {
    if (!loading && isMounted) {
      if (!user && !pathname.startsWith('/login')) {
        router.push('/login');
      } else if (user) {
        if (user.mustChangePassword && pathname !== '/set-password') {
          router.push('/set-password');
        } else if (!user.mustChangePassword && (pathname === '/login' || pathname === '/set-password')) {
          router.push(getDashboardRoute(user));
        }
      }
    }
  }, [user, loading, pathname, router, isMounted]);

  const login = (newUser: User) => {
    setUser(newUser);
    router.push(getDashboardRoute(newUser));
  };

  const logout = () => {
    fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    // The app-state cache holds tasks, client commercials, roster and attendance - it must not
    // survive into the next person's session on a shared browser.
    try { localStorage.removeItem('invictus_app_state_v2'); } catch { /* storage unavailable */ }
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, grantedPagesReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
