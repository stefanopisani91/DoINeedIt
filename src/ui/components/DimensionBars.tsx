import { DIMENSIONS, type Dimension } from '@/engine';
import { useCopy } from '@/i18n';

interface DimensionBarsProps {
  dimensions: Record<Dimension, number | null>;
}

function barColor(value: number): string {
  if (value >= 70) return 'bg-emerald-500';
  if (value >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function DimensionBars({ dimensions }: DimensionBarsProps) {
  const copy = useCopy();
  return (
    <ul className="space-y-3">
      {DIMENSIONS.map((dimension) => {
        const value = dimensions[dimension];
        if (value === null && dimension === 'budget') return null;
        return (
          <li key={dimension}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">
                {copy.dimensions[dimension]}
                <span className="ml-2 hidden text-xs font-normal text-stone-500 sm:inline dark:text-stone-400">
                  {copy.dimensionHints[dimension]}
                </span>
              </span>
              <span className="text-sm tabular-nums text-stone-600 dark:text-stone-300">
                {value === null ? '–' : `${value}%`}
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={value ?? 0}
              aria-label={copy.dimensions[dimension]}
            >
              {value !== null && (
                <div
                  className={`h-full rounded-full ${barColor(value)}`}
                  style={{ width: `${value}%` }}
                />
              )}
            </div>
            {value === null && (
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {copy.result.noData}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
