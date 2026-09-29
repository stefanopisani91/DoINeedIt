import { questionById } from '@/data/questions';
import { categoryById } from '@/data/categories';
import { it } from '@/i18n/it';
import { formatDate, formatPrice } from '@/lib/format';
import type { Item } from '@/storage/types';
import { verdictStyle } from '../verdict';
import { DimensionBars } from './DimensionBars';
import { ProductImage } from './ProductImage';
import { ScoreRing } from './ScoreRing';

interface ResultViewProps {
  item: Item;
}

function contributionBadge(contribution: number) {
  if (contribution > 0) {
    return {
      sign: '+',
      label: it.result.contributionFor,
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    };
  }
  if (contribution < 0) {
    return {
      sign: '−',
      label: it.result.contributionAgainst,
      className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
    };
  }
  return {
    sign: '=',
    label: it.result.contributionNeutral,
    className: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  };
}

function Badge({ contribution }: { contribution: number }) {
  const badge = contributionBadge(contribution);
  return (
    <span
      className={`mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1 text-xs font-bold tabular-nums ${badge.className}`}
      aria-label={badge.label}
    >
      {badge.sign}
    </span>
  );
}

/** The full read-only presentation of an evaluated item, shared by the detail and shared pages. */
export function ResultView({ item }: ResultViewProps) {
  const { result } = item;
  const style = verdictStyle(result.verdict);
  const category = categoryById(item.category);
  const budgetLine = result.budget
    ? it.result.budgetShare(
        Math.round(result.budget.share * 100),
        item.budget ? formatPrice(item.budget.amount, item.budget.currency) : undefined,
      )
    : null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-center gap-5 rounded-3xl bg-white p-6 ring-1 ring-stone-200 sm:flex-row sm:items-start dark:bg-stone-900 dark:ring-stone-800">
        <ProductImage src={item.imageUrl} alt="" className="h-40 w-40 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{item.title}</h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            <span aria-hidden="true">{category.emoji} </span>
            {category.label}
            {item.price && <> · {formatPrice(item.price.amount, item.price.currency)}</>}
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {it.result.evaluatedOn(formatDate(item.updatedAt))}
          </p>
          {item.note && (
            <blockquote className="mt-3 border-l-2 border-stone-300 pl-3 text-sm italic text-stone-600 dark:border-stone-700 dark:text-stone-300">
              {item.note}
            </blockquote>
          )}
        </div>
      </section>

      <section className="flex flex-col items-center gap-6 rounded-3xl bg-white p-6 ring-1 ring-stone-200 sm:flex-row dark:bg-stone-900 dark:ring-stone-800">
        <ScoreRing score={result.score} verdict={result.verdict} label={it.result.scoreLabel} />
        <div className="flex-1 text-center sm:text-left">
          <p
            className={`inline-block rounded-full px-4 py-1.5 text-lg font-bold ${style.bg} ${style.text}`}
          >
            {style.label}
          </p>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
            {it.result.confidence(result.confidence)} ·{' '}
            {it.result.answered(result.answeredCount, result.maybeCount)}
          </p>
          <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {it.result.why}
          </h2>
          {result.drivers.length === 0 && !budgetLine ? (
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
              {it.result.driversEmpty}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {result.budget && budgetLine && (
                <li className="flex items-start gap-2 text-sm">
                  <Badge contribution={result.budget.contribution} />
                  <span className="text-stone-700 dark:text-stone-200">{budgetLine}</span>
                </li>
              )}
              {result.drivers.map((driver) => (
                <li key={driver.questionId} className="flex items-start gap-2 text-sm">
                  <Badge contribution={driver.contribution} />
                  <span>
                    <span className="text-stone-700 dark:text-stone-200">{driver.text}</span>{' '}
                    <span className="font-semibold">{it.answers[driver.answer]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {it.result.dimensionsTitle}
        </h2>
        <DimensionBars dimensions={result.dimensions} />
      </section>

      <section className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {it.result.suggestionsTitle}
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-stone-700 dark:text-stone-200">
          {it.suggestions[result.verdict].map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <details className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {it.result.answersTitle}
        </summary>
        <ol className="mt-4 space-y-3">
          {item.askedOrder.map((questionId, index) => {
            const question = questionById(questionId);
            const answer = item.answers[questionId];
            if (!question || !answer) return null;
            return (
              <li key={questionId} className="flex gap-3 text-sm">
                <span className="w-5 shrink-0 tabular-nums text-stone-400">{index + 1}.</span>
                <span className="flex-1 text-stone-700 dark:text-stone-200">{question.text}</span>
                <span className="shrink-0 font-semibold">{it.answers[answer]}</span>
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}
