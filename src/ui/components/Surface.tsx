import type { HTMLAttributes, ReactNode } from 'react';

type Tone = 'default' | 'sunken' | 'dashed' | 'brand';
type Padding = 'none' | 'sm' | 'md' | 'lg';

interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'article' | 'aside' | 'li' | 'form' | 'nav' | 'header' | 'footer';
  tone?: Tone;
  padding?: Padding;
  /** Lifts on hover, for cards that are links. */
  interactive?: boolean;
  children?: ReactNode;
}

const TONES: Record<Tone, string> = {
  default: 'bg-surface ring-1 ring-line shadow-card',
  sunken: 'bg-surface-sunken ring-1 ring-line',
  dashed: 'border border-dashed border-line-strong',
  brand: 'bg-brand-700 text-white ring-1 ring-brand-800 dark:bg-brand-900 dark:ring-brand-800',
};

const PADDINGS: Record<Padding, string> = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-10',
};

/** The card every block of content sits on: one place for radius, border, shadow and hover. */
export function Surface({
  as: Tag = 'section',
  tone = 'default',
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}: SurfaceProps) {
  const hover = interactive
    ? 'transition-[box-shadow,transform] duration-150 hover:shadow-raised hover:ring-line-strong'
    : '';
  return (
    <Tag
      className={`rounded-card ${TONES[tone]} ${PADDINGS[padding]} ${hover} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
