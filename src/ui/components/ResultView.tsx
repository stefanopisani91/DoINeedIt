import { questionById } from '@/data/questions';
import { categoryById } from '@/data/categories';
import { useCopy } from '@/i18n';
import { formatDate, formatPrice } from '@/lib/format';
import type { Item } from '@/storage/types';
import { useQuestions } from '../hooks';
import { verdictStyle } from '../verdict';
import { DimensionBars } from './DimensionBars';
import { ProductImage } from './ProductImage';
import { ScoreRing } from './ScoreRing';

interface ResultViewProps {
  item: Item;
}

function Badge({ contribution }: { contribution: number }) {
  const copy = useCopy();
  const badge =
    contribution > 0
      ? {
          sign: '+',
          label: copy.result.contributionFor,
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
        }
      : contribution < 0
        ? {
            sign: '−',
            label: copy.result.contributionAgainst,
            className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
          }
        : {
            sign: '=',
            label: copy.result.contributionNeutral,
            className: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
          };
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
  const copy = useCopy();
  const questions = useQuestions();
  const { result } = item;
  const style = verdictStyle(result.verdict, copy);
  const category = categoryById(item.category, copy);
  const budgetLine = result.budget
    ? copy.result.budgetShare(
        Math.round(result.budget.share * 100),
        item.budget
          ? formatPrice(item.budget.amount, item.budget.currency, copy.locale)
          : undefined,
      )
    : null;
  // Questions are shown in the language in use; the text stored with the
  // answer is the fallback for questions that no longer exist.
  const questionText = (id: string, stored?: string) =>
    questionById(id, questions)?.text ?? stored ?? id;

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-center gap-5 rounded-3xl bg-white p-6 ring-1 ring-stone-200 sm:flex-row sm:items-start dark:bg-stone-900 dark:ring-stone-800">
        <ProductImage src={item.imageUrl} alt="" className="h-40 w-40 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{item.title}</h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            <span aria-hidden="true">{category.emoji} </span>
            {category.label}
            {item.price && (
              <> · {formatPrice(item.price.amount, item.price.currency, copy.locale)}</>
            )}
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {copy.result.evaluatedOn(formatDate(item.updatedAt, copy.locale))}
          </p>
          {item.note && (
            <blockquote className="mt-3 border-l-2 border-stone-300 pl-3 text-sm italic text-stone-600 dark:border-stone-700 dark:text-stone-300">
              {item.note}
            </blockquote>
          )}
        </div>
      </section>

      <section className="flex flex-col items-center gap-6 rounded-3xl bg-white p-6 ring-1 ring-stone-200 sm:flex-row dark:bg-stone-900 dark:ring-stone-800">
        <ScoreRing score={result.score} verdict={result.verdict} label={copy.result.scoreLabel} />
        <div className="flex-1 text-center sm:text-left">
          <p
            className={`inline-block rounded-full px-4 py-1.5 text-lg font-bold ${style.bg} ${style.text}`}
          >
            {style.label}
          </p>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
            {copy.result.confidence(result.confidence)} ·{' '}
            {copy.result.answered(result.answeredCount, result.maybeCount)}
          </p>
          <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {copy.result.why}
          </h2>
          {result.drivers.length === 0 && !budgetLine ? (
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
              {copy.result.driversEmpty}
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
                    <span className="text-stone-700 dark:text-stone-200">
                      {questionText(driver.questionId, driver.text)}
                    </span>{' '}
                    <span className="font-semibold">{copy.answers[driver.answer]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {copy.result.dimensionsTitle}
        </h2>
        <DimensionBars dimensions={result.dimensions} />
      </section>

      <section className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {copy.result.suggestionsTitle}
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-stone-700 dark:text-stone-200">
          {copy.suggestions[result.verdict].map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <details className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {copy.result.answersTitle}
        </summary>
        <ol className="mt-4 space-y-3">
          {item.askedOrder.map((questionId, index) => {
            const answer = item.answers[questionId];
            if (!answer) return null;
            return (
              <li key={questionId} className="flex gap-3 text-sm">
                <span className="w-5 shrink-0 tabular-nums text-stone-400">{index + 1}.</span>
                <span className="flex-1 text-stone-700 dark:text-stone-200">
                  {questionText(questionId)}
                </span>
                <span className="shrink-0 font-semibold">{copy.answers[answer]}</span>
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}
