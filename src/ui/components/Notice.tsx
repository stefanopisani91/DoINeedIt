import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<Tone, string> = {
  info: 'bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-100 dark:ring-sky-900',
  success:
    'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-900',
  warning:
    'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-100 dark:ring-amber-900',
  error:
    'bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-100 dark:ring-rose-900',
};

export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl px-4 py-3 text-sm ring-1 ${TONES[tone]}`}
    >
      {children}
    </div>
  );
}
