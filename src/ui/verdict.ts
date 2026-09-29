import type { Verdict } from '@/engine';
import type { Copy } from '@/i18n';

/**
 * Everything the interface needs to show a verdict: the texts from the copy
 * and the classes, all static so Tailwind sees them. Colors come from the
 * `buy`/`wait`/`skip` tokens in index.css; nothing here names a palette.
 */
export interface VerdictStyle {
  label: string;
  short: string;
  lead: string;
  /** Verdict-colored text. */
  text: string;
  /** Soft tinted background for badges and pills. */
  bg: string;
  /** Tinted card surface with its ring. */
  surface: string;
  ring: string;
  /** Left border of a list card. */
  border: string;
  /** Solid fill for bars and chart segments. */
  fill: string;
  /** SVG stroke for rings and donuts. */
  stroke: string;
  /** SVG fill for bars and chart segments (`fill` is a CSS background). */
  svgFill: string;
}

const STYLES: Record<Verdict, Omit<VerdictStyle, 'label' | 'short' | 'lead'>> = {
  buy: {
    text: 'text-buy-700 dark:text-buy-300',
    bg: 'bg-buy-100 dark:bg-buy-900/40',
    surface: 'bg-buy-50 ring-buy-200 dark:bg-buy-950/50 dark:ring-buy-900',
    ring: 'ring-buy-500/40',
    border: 'border-buy-500',
    fill: 'bg-buy-500',
    stroke: 'stroke-buy-500',
    svgFill: 'fill-buy-500',
  },
  wait: {
    text: 'text-wait-700 dark:text-wait-300',
    bg: 'bg-wait-100 dark:bg-wait-900/40',
    surface: 'bg-wait-50 ring-wait-200 dark:bg-wait-950/50 dark:ring-wait-900',
    ring: 'ring-wait-500/40',
    border: 'border-wait-500',
    fill: 'bg-wait-500',
    stroke: 'stroke-wait-500',
    svgFill: 'fill-wait-500',
  },
  skip: {
    text: 'text-skip-700 dark:text-skip-300',
    bg: 'bg-skip-100 dark:bg-skip-900/40',
    surface: 'bg-skip-50 ring-skip-200 dark:bg-skip-950/50 dark:ring-skip-900',
    ring: 'ring-skip-500/40',
    border: 'border-skip-500',
    fill: 'bg-skip-500',
    stroke: 'stroke-skip-500',
    svgFill: 'fill-skip-500',
  },
};

export const VERDICTS: readonly Verdict[] = ['buy', 'wait', 'skip'];

export function verdictStyle(verdict: Verdict, copy: Copy): VerdictStyle {
  return { ...STYLES[verdict], ...copy.verdict[verdict] };
}
