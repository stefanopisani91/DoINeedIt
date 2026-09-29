import type { Answers, CategoryId, Result, Verdict } from '@/engine';

export interface Price {
  amount: number;
  currency: string;
}

export interface ItemSource {
  url: string;
  asin?: string;
  marketplace?: string;
}

/** What the user did after the verdict. Absence means they are still deciding. */
export type DecisionOutcome = 'bought' | 'skipped';

export interface Decision {
  outcome: DecisionOutcome;
  /** When the outcome was recorded. */
  at: string;
  /** The price actually paid, when known and different from the listed one. */
  price?: Price;
}

/** A light summary of a previous evaluation of the same item, oldest first. */
export interface HistoryEntry {
  /** When that evaluation was made. */
  at: string;
  score: number;
  verdict: Verdict;
  answeredCount: number;
  /** The outcome recorded before the re-evaluation, if any. */
  outcome?: DecisionOutcome;
}

export interface Item {
  id: string;
  createdAt: string;
  /** Date of the last evaluation. Recording a decision or a note does not change it. */
  updatedAt: string;
  source: ItemSource;
  title: string;
  imageUrl?: string;
  price?: Price;
  category: CategoryId;
  answers: Answers;
  askedOrder: string[];
  /** The monthly budget the price was compared with, when the evaluation used one. */
  budget?: Price;
  result: Result;
  engineVersion: number;
  note?: string;
  /** What happened after the verdict, once the user records it. */
  decision?: Decision;
  /** When to reconsider a "wait" verdict; set at evaluation time, derived for older items. */
  reconsiderAt?: string;
  /** Previous evaluations of the same item, oldest first, capped by the lifecycle module. */
  history?: HistoryEntry[];
}

/** A product the user is about to evaluate, before any answer is given. */
export interface Draft {
  source: ItemSource;
  title: string;
  imageUrl?: string;
  price?: Price;
  category: CategoryId;
}
