'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isMounted, setIsMounted] = useState(false);

  // Read from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = localStorage.getItem('igt-theme') as Theme | null;
      if (stored === 'light' || stored === 'dark') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTheme(stored);
        document.documentElement.setAttribute('data-theme', stored);
      }
    } catch {}
  }, []);

  const toggle = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('igt-theme', next);
          document.documentElement.setAttribute('data-theme', next);
        } catch {}
      }
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
