export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type Size = 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-stone-950';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 dark:bg-brand-500 dark:text-stone-950 dark:hover:bg-brand-200',
  secondary:
    'bg-white text-stone-800 ring-1 ring-stone-300 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-700 dark:hover:bg-stone-800',
  ghost: 'text-stone-700 hover:bg-stone-200/70 dark:text-stone-300 dark:hover:bg-stone-800',
  danger: 'text-rose-700 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/40',
};

const SIZES: Record<Size, string> = {
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-14 px-6 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}
