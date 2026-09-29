import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { it } from '@/i18n/it';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand-100 text-brand-900 dark:bg-brand-900/60 dark:text-brand-100'
      : 'text-stone-600 hover:bg-stone-200/70 dark:text-stone-300 dark:hover:bg-stone-800'
  }`;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2" aria-label={it.app.name}>
            <Logo />
            <span className="text-lg font-bold tracking-tight">{it.app.name}</span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Navigazione">
            <NavLink to="/" end className={navClass}>
              {it.app.nav.home}
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              {it.app.nav.settings}
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <footer className="mx-auto w-full max-w-3xl px-4 py-6 text-center text-xs text-stone-500 dark:text-stone-400">
        {it.app.footer}{' '}
        <Link
          to="/privacy"
          className="underline underline-offset-2 hover:text-stone-700 dark:hover:text-stone-200"
        >
          {it.app.privacyLink}
        </Link>
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-brand-700 dark:fill-brand-500" />
      <path
        d="M20 34l8 8 16-18"
        fill="none"
        stroke="currentColor"
        className="text-white dark:text-stone-950"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="18" r="7" fill="#fbbf24" />
    </svg>
  );
}
