import { Surface } from '../Surface';

type Tone = 'default' | 'buy' | 'wait' | 'skip';

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}

const VALUE_TONES: Record<Tone, string> = {
  default: 'text-ink',
  buy: 'text-buy-700 dark:text-buy-300',
  wait: 'text-wait-700 dark:text-wait-300',
  skip: 'text-skip-700 dark:text-skip-300',
};

/**
 * One headline number. It renders a `<div>` with its `<dt>` and `<dd>`, so the
 * page places it inside a `<dl>` grid together with the other tiles.
 */
export function StatTile({ label, value, hint, tone = 'default' }: StatTileProps) {
  return (
    <Surface as="div" padding="sm" className="min-w-0">
      <dt className="eyebrow">{label}</dt>
      <dd className={`mt-1 text-2xl leading-tight font-bold tabular-nums ${VALUE_TONES[tone]}`}>
        {value}
      </dd>
      {hint && <dd className="mt-1 text-xs text-ink-faint">{hint}</dd>}
    </Surface>
  );
}
