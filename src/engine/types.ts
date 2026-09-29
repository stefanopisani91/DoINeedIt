/** A user's answer to a single question. */
export type Answer = 'yes' | 'no' | 'maybe';

/**
 * The aspects of a purchase the engine evaluates.
 * `budget` is reserved for the upcoming budget criterion: the engine already
 * handles it, it simply has no questions yet.
 */
export type Dimension = 'utility' | 'urgency' | 'alternatives' | 'impulse' | 'budget';

/**
 * How a "yes" affects the necessity score.
 * - `need`: answering yes means the purchase is more necessary.
 * - `skip`: answering yes means the purchase is less necessary.
 */
export type Polarity = 'need' | 'skip';

/** 1 = core questions, 2 = deepening questions, 3 = tie-break questions. */
export type Stage = 1 | 2 | 3;

export type Weight = 1 | 2 | 3;

export type Verdict = 'buy' | 'wait' | 'skip';

export type CategoryId =
  'tech' | 'home' | 'kitchen' | 'clothing' | 'sport' | 'media' | 'health' | 'other';

export interface Question {
  id: string;
  text: string;
  hint?: string;
  dimension: Dimension;
  stage: Stage;
  weight: Weight;
  polarity: Polarity;
  /** When set, the question is asked only for these categories. */
  categories?: CategoryId[];
  /** When set, the question is asked only after the referenced question got one of these answers. */
  showIf?: { questionId: string; answers: Answer[] };
}

export type Answers = Record<string, Answer>;

export interface Driver {
  questionId: string;
  text: string;
  answer: Answer;
  /** Signed, weighted contribution to the score (positive = more necessary). */
  contribution: number;
}

export interface Result {
  /** Necessity score, 0 (skip it) to 100 (you need it). */
  score: number;
  verdict: Verdict;
  /** Sub-score per dimension, or null when no question of that dimension was answered. */
  dimensions: Record<Dimension, number | null>;
  /** How reliable the score is, 0 to 100. */
  confidence: number;
  /** The answers that moved the score the most, strongest first. */
  drivers: Driver[];
  answeredCount: number;
  maybeCount: number;
}

export interface FlowState {
  category: CategoryId;
  answers: Answers;
  /** Ids of the questions asked so far, in the order they were shown. */
  askedOrder: string[];
}
