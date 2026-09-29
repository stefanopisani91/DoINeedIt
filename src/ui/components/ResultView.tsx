import type { ReactNode } from 'react';
import { questionById } from '@/data/questions';
import { categoryById } from '@/data/categories';
import { useCopy } from '@/i18n';
import { formatDate, formatPrice } from '@/lib/format';
import type { Item } from '@/storage/types';
import { useQuestions } from '../hooks';
import { verdictStyle } from '../verdict';
import { DimensionBars } from './DimensionBars';
import { Icon } from './Icon';
import { ProductImage } from './ProductImage';
import { ScoreRing } from './ScoreRing';
import { Surface } from './Surface';

interface ResultViewProps {
  item: Item;
  /** Whose evaluation this is: the reader's own (default) or one somebody shared with them. */
  perspective?: 'own' | 'shared';
}

/** The strongest answer weighs 3: the bars of the "why" list are scaled to it. */
const MAX_CONTRIBUTION = 3;

const CHIP = 'rounded-full bg-surface/70 px-3 py-1 text-sm text-ink ring-1 ring-line';

const SUMMARY =
  'flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-card p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:p-6 [&::-webkit-details-marker]:hidden';

function Badge({ contribution }: { contribution: number }) {
  const copy = useCopy();
  const badge =
    contribution > 0
      ? {
          sign: '+',
          label: copy.result.contributionFor,
          className: 'bg-buy-100 text-buy-800 dark:bg-buy-900/40 dark:text-buy-300',
        }
      : contribution < 0
        ? {
            sign: '−',
            label: copy.result.contributionAgainst,
            className: 'bg-skip-100 text-skip-800 dark:bg-skip-900/40 dark:text-skip-300',
          }
        : {
            sign: '=',
            label: copy.result.contributionNeutral,
            className: 'bg-surface-sunken text-ink-muted',
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

/** One line of the "why" list: the sign, the text and a small bar sized to the weight. */
function Driver({ contribution, children }: { contribution: number; children: ReactNode }) {
  const share = Math.min(1, Math.abs(contribution) / MAX_CONTRIBUTION);
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-start gap-3 text-sm">
      <Badge contribution={contribution} />
      <span className="text-ink">{children}</span>
      <span
        aria-hidden="true"
        className="mt-1.5 h-1.5 w-16 overflow-hidden rounded-full bg-surface-sunken"
      >
        <span
          className={`block h-full rounded-full ${contribution < 0 ? 'bg-skip-500' : 'bg-buy-500'}`}
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </span>
    </li>
  );
}

/** The full read-only presentation of an evaluated item, shared by the detail and shared pages. */
export function ResultView({ item, perspective = 'own' }: ResultViewProps) {
  const copy = useCopy();
  const questions = useQuestions();
  const { result } = item;
  const style = verdictStyle(result.verdict, copy);
  const category = categoryById(item.category, copy);
  const shared = perspective === 'shared';
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
  // The most recent previous evaluation, when the item was re-evaluated.
  const previous = item.history?.at(-1);
  const previousLine = previous
    ? previous.score === result.score
      ? copy.history.same(formatDate(previous.at, copy.locale))
      : copy.history.delta(result.score - previous.score, formatDate(previous.at, copy.locale))
    : null;

  return (
    <div className="space-y-6">
      {/*
        The hero is the one place the verdict is spelled out. It is a plain
        section rather than a Surface: the verdict tint has to win over the
        surface background, and two `bg-*` utilities on one element resolve by
        stylesheet order, not by intent.
      */}
      <section
        className={`animate-fade-up rounded-card p-5 ring-1 shadow-card sm:p-6 ${style.surface}`}
      >
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex flex-col items-center gap-3">
            <ScoreRing
              score={result.score}
              verdict={result.verdict}
              label={copy.result.scoreLabel}
            />
            <p className="max-w-40 text-center text-xs text-ink-faint sm:max-w-48">
              {copy.result.thresholdsHint}
            </p>
          </div>
          <div className="text-center sm:text-left">
            <p className={`text-2xl font-bold text-balance sm:text-3xl ${style.text}`}>
              {style.label}
            </p>
            <p className="mt-2 text-ink-muted">{style.lead}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className={CHIP}>{copy.result.confidence(result.confidence)}</span>
              <span className={CHIP}>
                {copy.result.answered(result.answeredCount, result.maybeCount)}
              </span>
              {item.decision && (
                <span className={CHIP}>
                  {copy.decision.sharedOutcome(copy.decision[item.decision.outcome])}
                </span>
              )}
              {previousLine && <span className={`${CHIP} tabular-nums`}>{previousLine}</span>}
            </div>
          </div>
        </div>
      </section>

      <Surface className="flex items-start gap-4">
        <ProductImage src={item.imageUrl} alt="" className="h-24 w-24 shrink-0 rounded-tile" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg leading-snug font-bold">{item.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            <span aria-hidden="true">{category.emoji} </span>
            {category.label}
            {item.price && (
              <>
                {' · '}
                <span className="tabular-nums">
                  {formatPrice(item.price.amount, item.price.currency, copy.locale)}
                </span>
              </>
            )}
            {' · '}
            {copy.result.evaluatedOn(formatDate(item.updatedAt, copy.locale))}
          </p>
          {item.note && (
            <blockquote className="mt-3 border-l-2 border-line-strong pl-3 text-sm">
              <span className="eyebrow block">
                {shared ? copy.shared.noteLabel : copy.result.noteLabel}
              </span>
              <span className="mt-0.5 block text-ink-muted italic">{item.note}</span>
            </blockquote>
          )}
        </div>
      </Surface>

      <Surface>
        <h2 className="eyebrow">{copy.result.why}</h2>
        {result.drivers.length === 0 && !budgetLine ? (
          <p className="mt-3 text-sm text-ink-muted">{copy.result.driversEmpty}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {result.budget && budgetLine && (
              <Driver contribution={result.budget.contribution}>{budgetLine}</Driver>
            )}
            {result.drivers.map((driver) => (
              <Driver key={driver.questionId} contribution={driver.contribution}>
                {questionText(driver.questionId, driver.text)}{' '}
                <span className="font-semibold">{copy.answers[driver.answer]}</span>
              </Driver>
            ))}
          </ul>
        )}
      </Surface>

      <Surface>
        <h2 className="eyebrow mb-4">{copy.result.dimensionsTitle}</h2>
        <DimensionBars dimensions={result.dimensions} />
      </Surface>

      <Surface>
        <h2 className="eyebrow">{copy.result.suggestionsTitle}</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
          {copy.suggestions[result.verdict].map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </Surface>

      <Surface padding="none">
        <details className="group">
          <summary className={SUMMARY}>
            <h2 className="eyebrow">
              {shared ? copy.shared.answersTitle : copy.result.answersTitle}
            </h2>
            <Icon
              name="chevron-down"
              className="text-ink-faint transition-transform group-open:rotate-180"
            />
          </summary>
          <ol className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
            {item.askedOrder.map((questionId, index) => {
              const answer = item.answers[questionId];
              if (!answer) return null;
              return (
                <li key={questionId} className="flex gap-3 text-sm">
                  <span className="w-5 shrink-0 text-ink-faint tabular-nums">{index + 1}.</span>
                  <span className="flex-1 text-ink">{questionText(questionId)}</span>
                  <span className="shrink-0 font-semibold">{copy.answers[answer]}</span>
                </li>
              );
            })}
          </ol>
        </details>
      </Surface>
    </div>
  );
}
