import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'dvora-theme-override';

function applyThemeClass(theme) {
  const html = document.documentElement;
  html.classList.remove('theme-dark', 'theme-light');
  if (theme) html.classList.add(`theme-${theme}`);
}

/**
 * Hook that manages manual theme override.
 * Returns: { theme, toggleTheme }
 *   - theme: current effective theme ('dark' | 'light')
 *   - toggleTheme: flips between dark and light and persists to localStorage
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      applyThemeClass(saved);
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // Listen to system changes when no manual override is set
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      if (!localStorage.getItem(THEME_KEY)) {
        const sys = mq.matches ? 'light' : 'dark';
        setTheme(sys);
        // No class applied — auto CSS takes over
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      applyThemeClass(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
