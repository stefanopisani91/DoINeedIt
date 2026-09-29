/** Bump when the scoring rules change, so stored results can be recomputed. */
export const ENGINE_VERSION = 1;

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
