export type Theme = 'light' | 'dark';

export const THEME_KEY = 'theme';

export function systemTheme(): Theme {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0c15' : '#ffffff');
}

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}
