export type Variant = 'primary' | 'accent' | 'secondary' | 'soft' | 'ghost' | 'danger';
export type Size = 'sm' | 'md' | 'lg' | 'xl';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-[background-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 aria-busy:cursor-progress';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 dark:bg-brand-500 dark:text-stone-950 dark:hover:bg-brand-400',
  accent: 'bg-accent-400 text-stone-950 hover:bg-accent-300',
  secondary:
    'bg-surface text-ink ring-1 ring-line-strong hover:bg-surface-sunken dark:ring-line-strong',
  soft: 'bg-surface-sunken text-ink hover:bg-line',
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'text-skip-700 hover:bg-skip-100 dark:text-skip-300 dark:hover:bg-skip-900/40',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm pointer-coarse:min-h-11',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-14 px-6 text-base',
  xl: 'min-h-16 px-6 text-lg rounded-tile',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}
