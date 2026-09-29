import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { manifestFor, useCopy } from '@/i18n';
import { pageTitle } from '../page-title';

/**
 * Keeps the document in step with the language and the page: `lang`,
 * description and manifest follow the language; the title follows the route.
 * After a navigation (never on the first paint) it moves the focus to the main
 * landmark, scrolls to the top and announces the new page to screen readers.
 */
export function RouteAnnouncer() {
  const copy = useCopy();
  const { pathname } = useLocation();
  const [announcement, setAnnouncement] = useState('');
  const firstRender = useRef(true);

  useEffect(() => {
    document.documentElement.lang = copy.lang;
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute('content', copy.app.description);
    document
      .querySelector<HTMLLinkElement>('link[rel="manifest"]')
      ?.setAttribute('href', manifestFor(copy.lang === 'it' ? 'it' : 'en'));
  }, [copy]);

  useEffect(() => {
    const title = pageTitle(pathname, copy);
    document.title = title;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById('main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    setAnnouncement(title);
    // The announcement is transient: an empty region keeps the text out of
    // the page for anyone else, screen readers included.
    const timer = window.setTimeout(() => setAnnouncement(''), 1000);
    return () => window.clearTimeout(timer);
  }, [pathname, copy]);

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {announcement}
    </div>
  );
}

/** What a lazily loaded page shows while its code arrives. */
export function PageFallback() {
  const copy = useCopy();
  return (
    <div role="status" className="space-y-4" aria-busy="true">
      <span className="sr-only">{copy.common.loading}</span>
      <div className="h-8 w-1/2 animate-pulse-soft rounded-control bg-surface-sunken" />
      <div className="h-40 animate-pulse-soft rounded-card bg-surface-sunken" />
      <div className="h-24 animate-pulse-soft rounded-card bg-surface-sunken" />
    </div>
  );
}
