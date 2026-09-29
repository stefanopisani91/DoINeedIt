import type { Answers, CategoryId, FlowState, Question, Result, Stage } from './types';
import {
  CLEAR_ENOUGH,
  EARLY_STOP,
  MIN_STAGE_ANSWERS,
  NEGLIGIBLE_BUDGET_SHARE,
  TIE_BREAK_BAND,
} from './config';
import {
  budgetImpact,
  computeConfidence,
  computeDimensions,
  computeDrivers,
  computeScore,
  verdictFor,
} from './scoring';

/**
 * Questions that apply to a category, category-specific ones first within each
 * stage. When the price is a negligible share of the monthly budget, the budget
 * questions are left out: the price already answers them.
 */
export function questionsFor(
  all: Question[],
  category: CategoryId,
  budgetShare?: number,
): Question[] {
  const negligible = budgetShare !== undefined && budgetShare < NEGLIGIBLE_BUDGET_SHARE;
  const applicable = all.filter(
    (q) =>
      (!q.categories || q.categories.includes(category)) &&
      !(negligible && q.dimension === 'budget'),
  );
  const specific = applicable.filter((q) => q.categories);
  const generic = applicable.filter((q) => !q.categories);
  const byStage = (stage: Stage) => [
    ...specific.filter((q) => q.stage === stage),
    ...generic.filter((q) => q.stage === stage),
  ];
  return [...byStage(1), ...byStage(2), ...byStage(3)];
}

function isVisible(question: Question, answers: Answers): boolean {
  if (!question.showIf) return true;
  const parentAnswer = answers[question.showIf.questionId];
  return parentAnswer !== undefined && question.showIf.answers.includes(parentAnswer);
}

function pending(questions: Question[], answers: Answers, stage: Stage): Question | undefined {
  return questions.find((q) => q.stage === stage && !answers[q.id] && isVisible(q, answers));
}

function answeredInStage(questions: Question[], answers: Answers, stage: Stage): number {
  return questions.filter((q) => q.stage === stage && answers[q.id]).length;
}

function isClear(score: number, band: { low: number; high: number }) {
  return score <= band.low || score >= band.high;
}

/**
 * Picks the next question, or null when the evaluation is complete.
 *
 * Stage 1 (core) is always completed. The flow then stops early if the score
 * is already clear. Stage 2 (deepening, category-specific first) stops as
 * soon as the picture becomes clear after a minimum number of answers.
 * Stage 3 (tie-break) runs only when the score is still around the middle.
 */
export function nextQuestion(all: Question[], state: FlowState): Question | null {
  const questions = questionsFor(all, state.category, state.budgetShare);
  const { answers, budgetShare } = state;

  const core = pending(questions, answers, 1);
  if (core) return core;

  const afterCore = computeScore(questions, answers, budgetShare);
  if (isClear(afterCore, EARLY_STOP)) return null;

  const deepening = pending(questions, answers, 2);
  if (deepening) {
    const done = answeredInStage(questions, answers, 2);
    const clear = isClear(computeScore(questions, answers, budgetShare), CLEAR_ENOUGH);
    if (done >= MIN_STAGE_ANSWERS && clear) return null;
    return deepening;
  }

  const afterDeepening = computeScore(questions, answers, budgetShare);
  const uncertain = afterDeepening >= TIE_BREAK_BAND.low && afterDeepening <= TIE_BREAK_BAND.high;
  if (!uncertain) return null;

  return pending(questions, answers, 3) ?? null;
}

/** Number of questions the flow could still ask at most, used for progress hints. */
export function remainingUpperBound(all: Question[], state: FlowState): number {
  const questions = questionsFor(all, state.category, state.budgetShare);
  return questions.filter((q) => !state.answers[q.id] && isVisible(q, state.answers)).length;
}

/**
 * Scores a finished (or partial) evaluation. `budgetShare` is the price divided
 * by the monthly budget; leave it undefined when either is unknown.
 */
export function evaluate(
  all: Question[],
  category: CategoryId,
  answers: Answers,
  budgetShare?: number,
): Result {
  const questions = questionsFor(all, category, budgetShare);
  const answered = questions.filter((q) => answers[q.id]);
  const maybeCount = answered.filter((q) => answers[q.id] === 'maybe').length;
  const score = computeScore(questions, answers, budgetShare);
  return {
    score,
    verdict: verdictFor(score),
    dimensions: computeDimensions(questions, answers, budgetShare),
    confidence: computeConfidence(score, answered.length, maybeCount),
    drivers: computeDrivers(questions, answers),
    budget: budgetImpact(budgetShare),
    answeredCount: answered.length,
    maybeCount,
  };
}

/** Applies an answer and returns the new state; never mutates the input. */
export function applyAnswer(
  state: FlowState,
  questionId: string,
  answer: Answers[string],
): FlowState {
  return {
    ...state,
    answers: { ...state.answers, [questionId]: answer },
    askedOrder: state.askedOrder.includes(questionId)
      ? state.askedOrder
      : [...state.askedOrder, questionId],
  };
}

/** Removes the last answer (and any follow-up answers that depended on it). */
export function undoLastAnswer(all: Question[], state: FlowState): FlowState {
  const lastId = state.askedOrder[state.askedOrder.length - 1];
  if (!lastId) return state;
  const answers = { ...state.answers };
  delete answers[lastId];
  const askedOrder = state.askedOrder.slice(0, -1);
  // Drop answers to questions that are no longer visible without the removed answer.
  for (const q of all) {
    if (q.showIf && answers[q.id] && !isVisible(q, answers)) {
      delete answers[q.id];
      const index = askedOrder.indexOf(q.id);
      if (index >= 0) askedOrder.splice(index, 1);
    }
  }
  return { ...state, answers, askedOrder };
}
