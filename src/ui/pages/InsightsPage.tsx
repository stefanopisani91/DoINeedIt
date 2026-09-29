import { useId, useMemo, useState } from 'react';
import { categoryById } from '@/data/categories';
import { useCopy } from '@/i18n';
import { computeInsights } from '@/insights/insights';
import { readyToReconsider } from '@/insights/lifecycle';
import { formatPrice } from '@/lib/format';
import { useSettingsStore } from '@/storage/settings';
import { useItemsStore } from '@/storage/store';
import { ButtonLink } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ItemCard } from '../components/ItemCard';
import { Surface } from '../components/Surface';
import { BarChart } from '../components/charts/BarChart';
import { Donut } from '../components/charts/Donut';
import { StatTile } from '../components/charts/StatTile';
import { VERDICTS, verdictStyle } from '../verdict';

export function InsightsPage() {
  const copy = useCopy();
  const items = useItemsStore((state) => state.items);
  const budget = useSettingsStore((state) => state.budget);
  // Fixed at mount: one reference date for the month buckets and the cooling-off list.
  const [now] = useState(() => new Date());
  const insights = useMemo(() => computeInsights(items, { now, budget }), [items, now, budget]);
  const ready = useMemo(() => readyToReconsider(items, now), [items, now]);
  const categoriesId = useId();
  const budgetId = useId();
  const reconsiderId = useId();

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-title font-bold">{copy.insights.title}</h1>
        <EmptyState
          title={copy.insights.empty}
          body={copy.insights.intro}
          action={<ButtonLink to="/new">{copy.app.nav.new}</ButtonLink>}
        />
      </div>
    );
  }

  // Sums are never converted: the largest one leads, the others go in the hint.
  const notSpent = Object.entries(insights.notSpent).sort((a, b) => b[1] - a[1]);
  const [leading, ...otherCurrencies] = notSpent;
  const notSpentValue = leading ? formatPrice(leading[1], leading[0], copy.locale) : '–';
  const notSpentHint =
    otherCurrencies.length > 0
      ? [
          copy.insights.mixedCurrencies,
          otherCurrencies.map(([currency, amount]) => formatPrice(amount, currency, copy.locale)),
        ]
          .flat()
          .join(' ')
      : copy.insights.notSpentHint;

  const slices = VERDICTS.map((verdict) => {
    const style = verdictStyle(verdict, copy);
    return {
      label: style.label,
      value: insights.verdicts[verdict],
      strokeClassName: style.stroke,
      fillClassName: style.fill,
    };
  });

  // The bucket key is a UTC month: read it in UTC too, or a negative offset would name the month before.
  const monthFormat = new Intl.DateTimeFormat(copy.locale, { month: 'short', timeZone: 'UTC' });
  const groups = insights.byMonth.map((bucket) => ({
    label: monthFormat.format(new Date(`${bucket.month}-01T00:00:00Z`)),
    segments: VERDICTS.map((verdict) => ({
      label: verdictStyle(verdict, copy).label,
      value: bucket.verdicts[verdict],
      className: verdictStyle(verdict, copy).svgFill,
    })),
  }));
  const numberFormat = new Intl.NumberFormat(copy.locale);
  const formatCount = (value: number) => numberFormat.format(value);

  const maxCategoryCount = Math.max(1, ...insights.byCategory.map((bucket) => bucket.count));
  const month = insights.currentMonth;
  const overBudget = month !== null && month.share > 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title font-bold">{copy.insights.title}</h1>
        <p className="mt-2 text-ink-muted">{copy.insights.intro}</p>
      </div>

      <div className="space-y-2">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label={copy.insights.notSpent}
            value={notSpentValue}
            hint={notSpentHint}
            tone="buy"
          />
          <StatTile
            label={copy.insights.impulsesLabel}
            value={formatCount(insights.impulsesStopped)}
            tone="skip"
          />
          <StatTile label={copy.insights.evaluations} value={formatCount(insights.total)} />
          <StatTile
            label={copy.insights.averageScore}
            value={insights.averageScore === null ? '–' : `${insights.averageScore}%`}
            {...(insights.maybeShare !== null
              ? { hint: copy.insights.maybeShare(Math.round(insights.maybeShare * 100)) }
              : {})}
          />
        </dl>
        {insights.unpriced > 0 && (
          <p className="text-xs text-ink-faint">{copy.insights.unpriced(insights.unpriced)}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Surface as="div">
          <Donut
            title={copy.insights.verdictsChart}
            slices={slices}
            centerValue={formatCount(insights.total)}
            centerLabel={copy.insights.evaluations}
            showDataLabel={copy.insights.showData}
            tableCaption={copy.insights.verdictsChart}
            labelHeader={copy.insights.table.verdict}
            valueHeader={copy.insights.table.count}
          />
        </Surface>
        <Surface as="div">
          <BarChart
            title={copy.insights.monthsChart}
            groups={groups}
            formatValue={formatCount}
            showDataLabel={copy.insights.showData}
            tableCaption={copy.insights.monthsChart}
            labelHeader={copy.insights.table.month}
            totalHeader={copy.insights.table.count}
          />
        </Surface>
      </div>

      <Surface aria-labelledby={categoriesId}>
        <h2 id={categoriesId} className="eyebrow">
          {copy.insights.categoriesChart}
        </h2>
        <ul className="mt-4 space-y-3">
          {insights.byCategory.map((bucket) => {
            const category = categoryById(bucket.category, copy);
            return (
              <li key={bucket.category} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 truncate sm:w-44">
                  <span aria-hidden="true">{category.emoji} </span>
                  {category.label}
                </span>
                <div
                  aria-hidden="true"
                  className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken"
                >
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(bucket.count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right tabular-nums">
                  {formatCount(bucket.count)}
                </span>
              </li>
            );
          })}
        </ul>
      </Surface>

      <Surface aria-labelledby={budgetId}>
        <h2 id={budgetId} className="eyebrow">
          {copy.insights.budgetTitle}
        </h2>
        {month ? (
          <>
            <p className="mt-2 text-sm text-ink-muted">
              {copy.insights.budgetMonth(
                formatPrice(month.spent, month.currency, copy.locale),
                formatPrice(month.budget, month.currency, copy.locale),
              )}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div
                role="meter"
                aria-valuemin={0}
                aria-valuemax={month.budget}
                aria-valuenow={month.spent}
                aria-label={copy.insights.budgetTitle}
                className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-sunken"
              >
                <div
                  className={`h-full rounded-full ${overBudget ? 'bg-skip-500' : 'bg-brand-600'}`}
                  style={{ width: `${Math.min(100, month.share * 100)}%` }}
                />
              </div>
              <span className="text-sm tabular-nums text-ink-muted">
                {Math.round(month.share * 100)}%
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-muted">{copy.insights.budgetNone}</p>
            <ButtonLink to="/settings" variant="secondary" size="sm" className="mt-3">
              {copy.settings.budgetTitle}
            </ButtonLink>
          </>
        )}
      </Surface>

      <Surface aria-labelledby={reconsiderId}>
        <h2 id={reconsiderId} className="eyebrow">
          {copy.coolingOff.sectionTitle}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{copy.coolingOff.sectionBody}</p>
        {ready.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">{copy.coolingOff.none}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {ready.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}
