import type { Theme } from '@/storage/settings';

/** The browser theme-color per theme: brand-700 in light, brand-950 in dark. */
export const THEME_COLORS: Record<Theme, string> = { light: '#0f766e', dark: '#042f2e' };

/** The attribute on <html> that the stylesheet reads to pick the theme. */
export const THEME_ATTRIBUTE = 'data-theme';

/** The theme to show: the chosen one, or the system preference when nothing was chosen. */
export function resolveTheme(chosen: Theme | null, prefersDark: boolean): Theme {
  return chosen ?? (prefersDark ? 'dark' : 'light');
}

/** Whether the system asks for a dark theme; false where matchMedia is missing (tests, SSR). */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Writes the resolved theme on <html data-theme> and on the single <meta name="theme-color">. */
export function applyTheme(theme: Theme, doc: Document = document): void {
  doc.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  const meta = doc.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
}
