import type { Answer, Answers, Dimension, Driver, Polarity, Question, Verdict } from './types';
import { MAX_DRIVERS, VERDICT } from './config';

export const DIMENSIONS: Dimension[] = ['utility', 'urgency', 'alternatives', 'impulse', 'budget'];

/** Signed value of an answer: +1 pushes toward "need", −1 toward "skip", 0 is neutral. */
export function answerValue(answer: Answer, polarity: Polarity): number {
  if (answer === 'maybe') return 0;
  const base = answer === 'yes' ? 1 : -1;
  return polarity === 'need' ? base : -base;
}

interface Totals {
  numerator: number;
  denominator: number;
}

function accumulate(questions: Question[], answers: Answers, filter?: (q: Question) => boolean) {
  const totals: Totals = { numerator: 0, denominator: 0 };
  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer) continue;
    if (filter && !filter(question)) continue;
    totals.numerator += answerValue(answer, question.polarity) * question.weight;
    totals.denominator += question.weight;
  }
  return totals;
}

/** Maps weighted totals to 0–100; with nothing answered the score is a neutral 50. */
function toScore({ numerator, denominator }: Totals): number {
  if (denominator === 0) return 50;
  return Math.round(50 + (50 * numerator) / denominator);
}

export function computeScore(questions: Question[], answers: Answers): number {
  return toScore(accumulate(questions, answers));
}

export function computeDimensions(
  questions: Question[],
  answers: Answers,
): Record<Dimension, number | null> {
  const out = {} as Record<Dimension, number | null>;
  for (const dimension of DIMENSIONS) {
    const totals = accumulate(questions, answers, (q) => q.dimension === dimension);
    out[dimension] = totals.denominator === 0 ? null : toScore(totals);
  }
  return out;
}

export function verdictFor(score: number): Verdict {
  if (score >= VERDICT.buy) return 'buy';
  if (score >= VERDICT.wait) return 'wait';
  return 'skip';
}

/**
 * Confidence blends three signals: how far the score is from the neutral 50,
 * how many answers were a firm yes/no, and how many questions were answered.
 */
export function computeConfidence(score: number, answeredCount: number, maybeCount: number) {
  if (answeredCount === 0) return 0;
  const clarity = Math.abs(score - 50) / 50;
  const certainty = 1 - maybeCount / answeredCount;
  const coverage = Math.min(answeredCount, 12) / 12;
  return Math.round(100 * (0.4 * clarity + 0.35 * certainty + 0.25 * coverage));
}

export function computeDrivers(questions: Question[], answers: Answers): Driver[] {
  const drivers: Driver[] = [];
  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer || answer === 'maybe') continue;
    drivers.push({
      questionId: question.id,
      text: question.text,
      answer,
      contribution: answerValue(answer, question.polarity) * question.weight,
    });
  }
  return drivers
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, MAX_DRIVERS);
}
