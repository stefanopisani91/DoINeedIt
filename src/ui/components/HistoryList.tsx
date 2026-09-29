import { useCopy } from '@/i18n';
import { formatDate } from '@/lib/format';
import type { HistoryEntry } from '@/storage/types';
import { verdictStyle } from '../verdict';
import { Icon } from './Icon';
import { Surface } from './Surface';

interface HistoryListProps {
  /** Previous evaluations, oldest first, as the item stores them. */
  history: readonly HistoryEntry[];
}

/** The previous evaluations of an item, most recent first, folded away by default. */
export function HistoryList({ history }: HistoryListProps) {
  const copy = useCopy();
  const entries = history.map((entry, index) => ({ entry, key: `${entry.at}-${index}` })).reverse();
  return (
    <Surface padding="none">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-card p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:p-6 [&::-webkit-details-marker]:hidden">
          <h2 className="eyebrow">{copy.history.title}</h2>
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            {copy.history.count(history.length)}
            <Icon
              name="chevron-down"
              className="text-ink-faint transition-transform group-open:rotate-180"
            />
          </span>
        </summary>
        <ol className="divide-y divide-line border-t border-line px-5 sm:px-6">
          {entries.map(({ entry, key }) => {
            const style = verdictStyle(entry.verdict, copy);
            return (
              <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm">
                <time dateTime={entry.at} className="text-ink-muted tabular-nums">
                  {formatDate(entry.at, copy.locale)}
                </time>
                <span className="font-semibold tabular-nums">{entry.score}%</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}
                >
                  {style.short}
                </span>
                {entry.outcome && (
                  <span className="text-ink-muted">{copy.decision[entry.outcome]}</span>
                )}
              </li>
            );
          })}
        </ol>
      </details>
    </Surface>
  );
}
