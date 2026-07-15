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

  // Read from localStorage on mount (only on client)
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem('igt-theme') as Theme | null;
      if (stored === 'light' || stored === 'dark') {
        setTheme(stored);
        document.documentElement.setAttribute('data-theme', stored);
      }
    } catch (e) {
      console.error('Failed to load theme:', e);
    }
  }, []);

  const toggle = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('igt-theme', next);
          document.documentElement.setAttribute('data-theme', next);
        }
      } catch (e) {
        console.error('Failed to save theme:', e);
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
