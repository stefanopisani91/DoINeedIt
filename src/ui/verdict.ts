import type { Verdict } from '@/engine';
import { it } from '@/i18n/it';

export interface VerdictStyle {
  label: string;
  short: string;
  text: string;
  bg: string;
  ring: string;
  stroke: string;
}

const STYLES: Record<Verdict, Omit<VerdictStyle, 'label' | 'short'>> = {
  buy: {
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    ring: 'ring-emerald-500/40',
    stroke: '#10b981',
  },
  wait: {
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    ring: 'ring-amber-500/40',
    stroke: '#f59e0b',
  },
  skip: {
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-100 dark:bg-rose-900/40',
    ring: 'ring-rose-500/40',
    stroke: '#f43f5e',
  },
};

export function verdictStyle(verdict: Verdict): VerdictStyle {
  return { ...STYLES[verdict], ...it.verdict[verdict] };
}
