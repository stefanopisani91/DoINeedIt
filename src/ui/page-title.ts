import type { Copy } from '@/i18n';

type PageKey = keyof Copy['pages'];

/** Which page a path belongs to, for its document title. */
export function pageKey(pathname: string): PageKey | 'home' {
  if (pathname === '/') return 'home';
  if (pathname === '/new') return 'new';
  if (pathname === '/wishlist') return 'wishlist';
  if (pathname === '/evaluate') return 'evaluate';
  if (pathname.startsWith('/items/')) return 'item';
  if (pathname === '/i') return 'shared';
  if (pathname === '/settings') return 'settings';
  if (pathname === '/privacy') return 'privacy';
  if (pathname === '/insights') return 'insights';
  return 'notFound';
}

/** The document title: the full app title on the home, "Page · DoINeedIt" elsewhere. */
export function pageTitle(pathname: string, copy: Copy): string {
  const key = pageKey(pathname);
  if (key === 'home') return copy.app.documentTitle;
  return `${copy.pages[key]} · ${copy.app.name}`;
}
