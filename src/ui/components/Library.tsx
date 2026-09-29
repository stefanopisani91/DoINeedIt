import { useState, type ChangeEvent } from 'react';
import type { Verdict } from '@/engine';
import { useCopy } from '@/i18n';
import { computeInsights } from '@/insights/insights';
import { readyToReconsider } from '@/insights/lifecycle';
import { formatPrice } from '@/lib/format';
import { isCategoryId, isSortKey, SORT_KEYS, type LibraryQuery } from '@/lib/library';
import type { Item, Price } from '@/storage/types';
import { useCategories } from '../hooks';
import { VERDICTS, verdictStyle } from '../verdict';
import { Button } from './Button';
import { Field, Input, Select } from './Field';
import { Icon } from './Icon';
import { Surface } from './Surface';

interface LibraryToolbarProps {
  query: LibraryQuery;
  onChange: (partial: Partial<LibraryQuery>) => void;
  /** Verdict counts of the items the other filters leave, shown on the chips. */
  counts: Record<Verdict, number>;
}

/** Checked look of the verdict chips, one static string per value so Tailwind sees them all. */
const CHECKED: Record<Verdict | 'all', string> = {
  all: 'peer-checked:bg-brand-700 peer-checked:text-white peer-checked:ring-brand-700 dark:peer-checked:bg-brand-500 dark:peer-checked:text-stone-950 dark:peer-checked:ring-brand-500',
  buy: 'peer-checked:bg-buy-100 peer-checked:text-buy-800 peer-checked:ring-buy-500 dark:peer-checked:bg-buy-900/40 dark:peer-checked:text-buy-300',
  wait: 'peer-checked:bg-wait-100 peer-checked:text-wait-800 peer-checked:ring-wait-500 dark:peer-checked:bg-wait-900/40 dark:peer-checked:text-wait-300',
  skip: 'peer-checked:bg-skip-100 peer-checked:text-skip-800 peer-checked:ring-skip-500 dark:peer-checked:bg-skip-900/40 dark:peer-checked:text-skip-300',
};

function sameQuery(a: LibraryQuery, b: LibraryQuery): boolean {
  return a.q === b.q && a.verdict === b.verdict && a.category === b.category && a.sort === b.sort;
}

/** Search, sort, verdict chips and category filter of the library. */
export function LibraryToolbar({ query, onChange, counts }: LibraryToolbarProps) {
  const copy = useCopy();
  const categories = useCategories();
  // The URL is the source of truth; a local draft answers every control at once
  // while the navigation (a transition) catches up, and follows the URL when
  // that changes from elsewhere (reset, back button).
  const [draft, setDraft] = useState<LibraryQuery>(query);
  const [seen, setSeen] = useState<LibraryQuery>(query);
  if (!sameQuery(query, seen)) {
    setSeen(query);
    setDraft(query);
  }
  const change = (partial: Partial<LibraryQuery>) => {
    setDraft((current) => ({ ...current, ...partial }));
    onChange(partial);
  };
  const total = VERDICTS.reduce((sum, verdict) => sum + counts[verdict], 0);

  const search = (event: ChangeEvent<HTMLInputElement>) => change({ q: event.target.value });
  const clearSearch = () => change({ q: '' });
  const sort = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (isSortKey(value)) change({ sort: value });
  };
  const category = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'all' || isCategoryId(value)) change({ category: value });
  };

  return (
    <form role="search" className="space-y-3" onSubmit={(event) => event.preventDefault()}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field id="library-search" label={copy.home.library.search} className="min-w-0 flex-1">
          <div className="relative">
            <Icon
              name="search"
              size={20}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
            />
            <Input
              id="library-search"
              type="search"
              value={draft.q}
              onChange={search}
              placeholder={copy.home.library.searchPlaceholder}
              autoComplete="off"
              enterKeyHint="search"
              className="appearance-none pr-12 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {draft.q !== '' && (
              <Button
                iconOnly
                variant="ghost"
                size="sm"
                leadingIcon="x"
                aria-label={copy.home.library.clearSearch}
                onClick={clearSearch}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              />
            )}
          </div>
        </Field>
        <Field id="library-sort" label={copy.home.library.sort} className="sm:w-56">
          <Select id="library-sort" value={draft.sort} onChange={sort}>
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {copy.home.library.sortOptions[key]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <fieldset className="min-w-0 flex-1">
          <legend className="sr-only">{copy.home.library.verdictFilter}</legend>
          <div className="-mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Chip
              value="all"
              checked={draft.verdict === 'all'}
              onChange={() => change({ verdict: 'all' })}
              label={copy.home.library.all}
              count={total}
              checkedClass={CHECKED.all}
            />
            {VERDICTS.map((verdict) => {
              const style = verdictStyle(verdict, copy);
              return (
                <Chip
                  key={verdict}
                  value={verdict}
                  checked={draft.verdict === verdict}
                  onChange={() => change({ verdict })}
                  label={style.short}
                  count={counts[verdict]}
                  dot={style.fill}
                  checkedClass={CHECKED[verdict]}
                />
              );
            })}
          </div>
        </fieldset>
        <Field id="library-category" label={copy.home.library.category} className="sm:w-56">
          <Select id="library-category" value={draft.category} onChange={category}>
            <option value="all">{copy.home.library.allCategories}</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.emoji} {item.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </form>
  );
}

interface ChipProps {
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  count: number;
  /** Solid verdict color for the small dot before the label. */
  dot?: string;
  checkedClass: string;
}

/** A radio dressed as a pill: the input covers the pill, so it is what gets clicked and focused. */
function Chip({ value, checked, onChange, label, count, dot, checkedClass }: ChipProps) {
  return (
    <label className="relative shrink-0">
      <input
        type="radio"
        name="library-verdict"
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      />
      <span
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-sm font-medium text-ink-muted ring-1 ring-line-strong transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas ${checkedClass}`}
      >
        {dot && <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />}
        {label}
        <span className="text-xs tabular-nums opacity-70">{count}</span>
      </span>
    </label>
  );
}

interface LibrarySummaryProps {
  items: readonly Item[];
  now: Date;
  budget: Price | null;
}

/** Four figures and the verdict distribution of the whole library. Reading only: no links, no buttons. */
export function LibrarySummary({ items, now, budget }: LibrarySummaryProps) {
  const copy = useCopy();
  const insights = computeInsights(items, { now, budget });
  const ready = readyToReconsider(items, now).length;
  const currencies = Object.entries(insights.notSpent).sort((a, b) => b[1] - a[1]);
  const main = currencies[0];
  const fallbackCurrency =
    budget?.currency ?? items.find((item) => item.price)?.price?.currency ?? 'EUR';
  const unspent = main
    ? formatPrice(main[1], main[0], copy.locale)
    : formatPrice(0, fallbackCurrency, copy.locale);
  const others = Math.max(0, currencies.length - 1);
  const total = insights.total;
  const share = (count: number) => (total > 0 ? `${(count / total) * 100}%` : '0%');

  return (
    <Surface aria-labelledby="summary-title">
      <h2 id="summary-title" className="eyebrow">
        {copy.home.summary.title}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile value={String(total)} label={copy.home.summary.evaluated(total)} />
        <Tile
          value={String(insights.impulsesStopped)}
          label={copy.home.summary.stopped(insights.impulsesStopped)}
        />
        <Tile
          value={unspent}
          label={copy.home.summary.unspent}
          {...(others > 0 ? { extra: copy.home.summary.otherCurrencies(others) } : {})}
        />
        <Tile value={String(ready)} label={copy.home.summary.toReconsider} />
      </dl>
      <div
        className="mt-4 flex h-2 overflow-hidden rounded-full bg-surface-sunken"
        aria-hidden="true"
      >
        {VERDICTS.map(
          (verdict) =>
            insights.verdicts[verdict] > 0 && (
              <div
                key={verdict}
                className={`transition-[width] duration-300 ${verdictStyle(verdict, copy).fill}`}
                style={{ width: share(insights.verdicts[verdict]) }}
              />
            ),
        )}
      </div>
      <span className="sr-only">
        {copy.home.summary.distribution(
          insights.verdicts.buy,
          insights.verdicts.wait,
          insights.verdicts.skip,
        )}
      </span>
    </Surface>
  );
}

interface TileProps {
  value: string;
  label: string;
  extra?: string;
}

/** Number over its label; the term comes first in the DOM, the number first on screen. */
function Tile({ value, label, extra }: TileProps) {
  return (
    <div className="flex flex-col-reverse rounded-tile bg-surface-sunken px-3 py-2.5">
      <dt className="text-xs text-ink-faint">
        {label}
        {extra && <span className="block">{extra}</span>}
      </dt>
      <dd className="text-2xl leading-tight font-bold break-words tabular-nums">{value}</dd>
    </div>
  );
}
