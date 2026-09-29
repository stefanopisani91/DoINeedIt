import type { Weight } from './types';

/** Bump when the scoring rules change, so stored results can be recomputed. */
export const ENGINE_VERSION = 2;

/** After the core questions, stop early when the score is already this clear. */
export const EARLY_STOP = { low: 25, high: 75 } as const;

/**
 * During the deepening stages the flow stops as soon as at least
 * MIN_STAGE_ANSWERS of that stage were answered and the score left this band.
 */
export const CLEAR_ENOUGH = { low: 30, high: 70 } as const;
export const MIN_STAGE_ANSWERS = 3;

/** The tie-break stage runs only when the score is still inside this band. */
export const TIE_BREAK_BAND = { low: 40, high: 60 } as const;

/** Verdict thresholds on the 0–100 score. */
export const VERDICT = { buy: 70, wait: 40 } as const;

export const MAX_DRIVERS = 3;

/** Weight of the automatic price-versus-budget component, as much as the strongest question. */
export const BUDGET_WEIGHT: Weight = 3;

/**
 * How a share of the monthly budget maps to a signed value: up to 5% of the
 * budget the price is negligible (+1), above 60% it weighs as much as a firm
 * "skip" answer (−1). Each band applies up to its `upTo` share, inclusive.
 */
export const BUDGET_BANDS: ReadonlyArray<{ upTo: number; value: number }> = [
  { upTo: 0.05, value: 1 },
  { upTo: 0.15, value: 0.5 },
  { upTo: 0.3, value: 0 },
  { upTo: 0.6, value: -0.5 },
  { upTo: Number.POSITIVE_INFINITY, value: -1 },
];

/** Below this share of the budget the budget questions are not worth asking. */
export const NEGLIGIBLE_BUDGET_SHARE = 0.05;
