import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('traceops-theme') as Theme) || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('traceops-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle };
}
