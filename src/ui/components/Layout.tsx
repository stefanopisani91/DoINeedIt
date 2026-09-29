import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCopy } from '@/i18n';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { UpdateBanner } from './UpdateBanner';

interface NavItem {
  to: string;
  end?: boolean;
  icon: IconName;
  /** Full name, used as the accessible name and shown from `sm:` up. */
  label: string;
  /** Short label for the bottom bar on phones; it is part of the full name. */
  short: string;
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors sm:min-h-11 sm:flex-row sm:gap-2 sm:rounded-control sm:px-3 sm:text-sm ${
    isActive
      ? 'text-brand-700 dark:text-brand-300 sm:bg-brand-100 sm:dark:bg-brand-900/60'
      : 'text-ink-faint hover:text-ink sm:hover:bg-surface-sunken'
  }`;

export function Layout({ children }: { children: ReactNode }) {
  const copy = useCopy();
  const items: NavItem[] = [
    { to: '/', end: true, icon: 'home', label: copy.app.nav.home, short: copy.app.nav.homeShort },
    { to: '/new', icon: 'plus', label: copy.app.nav.new, short: copy.app.nav.newShort },
    { to: '/insights', icon: 'chart', label: copy.app.nav.insights, short: copy.app.nav.insights },
    {
      to: '/settings',
      icon: 'settings',
      label: copy.app.nav.settings,
      short: copy.app.nav.settingsShort,
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-30 focus:rounded-control focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-white focus:outline-none"
      >
        {copy.app.skipToContent}
      </a>
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label={copy.app.name}
          >
            <Logo size={32} />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight">{copy.app.name}</span>
              <span className="mt-0.5 hidden text-xs text-ink-faint sm:inline">
                {copy.app.tagline}
              </span>
            </span>
          </Link>
          {/* One nav for every screen: a bottom bar on phones, inline in the header from `sm:`. */}
          <nav
            aria-label={copy.app.nav.label}
            className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:flex sm:gap-1 sm:border-0 sm:bg-transparent sm:pb-0 sm:backdrop-blur-none"
          >
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end ?? false}
                className={navClass}
                aria-label={item.label}
              >
                <Icon name={item.icon} size={20} />
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24 focus:outline-none sm:py-8"
      >
        {children}
      </main>
      <footer className="mx-auto w-full max-w-3xl px-4 pt-4 pb-24 text-center text-xs text-ink-faint sm:pb-6">
        <p>
          {copy.app.footer}{' '}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-ink">
            {copy.app.privacyLink}
          </Link>
        </p>
        <p className="mt-1">{copy.app.version(__APP_VERSION__)}</p>
      </footer>
      <UpdateBanner />
    </div>
  );
}
