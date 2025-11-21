'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'labre-theme';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
};

function applyAttributeTheme(attribute: string, theme: Theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (attribute === 'class') {
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  } else {
    root.setAttribute(attribute, theme);
  }
}

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'light',
  enableSystem = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  const setTheme = useCallback(
    (nextTheme: Theme, persist = true) => {
      setThemeState(nextTheme);
      applyAttributeTheme(attribute, nextTheme);

      if (persist && typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      }
    },
    [attribute]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    const fallbackTheme: Theme = prefersDark && enableSystem ? 'dark' : defaultTheme;
    const initialTheme = storedTheme ?? fallbackTheme;

    setTheme(initialTheme, Boolean(storedTheme));

    if (!enableSystem || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (storedValue) return;
      setTheme(event.matches ? 'dark' : 'light', false);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [defaultTheme, enableSystem, setTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
