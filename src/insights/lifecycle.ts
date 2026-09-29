import type { HistoryEntry, Item } from '@/storage/types';

/** How many previous evaluations an item remembers. */
export const MAX_HISTORY = 10;
/** Default wait, in days, before a "wait" verdict is worth reconsidering. */
export const COOLING_OFF_DAYS = 30;
const DAY_MS = 86_400_000;

export interface CoolingOff {
  state: 'none' | 'cooling' | 'ready';
  /** ISO date the wait ends, or null when the item is not waiting. */
  reconsiderAt: string | null;
  /** Whole days left, 0 when ready or not waiting. */
  daysLeft: number;
}

/** Adds whole days to an ISO timestamp (UTC arithmetic); returns an ISO string. */
export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString();
}

/**
 * When to reconsider the item: only for a 'wait' verdict without a recorded
 * decision. Uses item.reconsiderAt when present, otherwise derives it from
 * updatedAt + days (items evaluated before 2.0 have no stored date).
 */
export function reconsiderAt(item: Item, days: number = COOLING_OFF_DAYS): string | null {
  if (item.result.verdict !== 'wait' || item.decision !== undefined) return null;
  return item.reconsiderAt ?? addDays(item.updatedAt, days);
}

/** daysLeft = ceil((reconsiderAt - now) / day), clamped at 0; 'ready' when now >= reconsiderAt. */
export function coolingOff(item: Item, now: Date): CoolingOff {
  const at = reconsiderAt(item);
  if (at === null) return { state: 'none', reconsiderAt: null, daysLeft: 0 };
  const remaining = new Date(at).getTime() - now.getTime();
  if (remaining <= 0) return { state: 'ready', reconsiderAt: at, daysLeft: 0 };
  return { state: 'cooling', reconsiderAt: at, daysLeft: Math.ceil(remaining / DAY_MS) };
}

/** Items whose cooling-off is 'ready', sorted by reconsiderAt ascending (oldest wait first). */
export function readyToReconsider(items: readonly Item[], now: Date): Item[] {
  return items
    .flatMap((item) => {
      const { state, reconsiderAt: at } = coolingOff(item, now);
      return state === 'ready' && at !== null ? [{ item, at: new Date(at).getTime() }] : [];
    })
    .sort((a, b) => a.at - b.at)
    .map(({ item }) => item);
}

/**
 * Called when an item is re-evaluated: returns `next` with a summary of
 * `previous` appended to its history (oldest first, capped at MAX_HISTORY),
 * keeping `previous.createdAt` and, when `next` has no note, `previous.note`.
 * The previous decision is not carried over (it belongs to the old verdict;
 * it lives on in the history entry as `outcome`). Never mutates its inputs.
 * With `previous` undefined returns `next` unchanged.
 */
export function withHistory(previous: Item | undefined, next: Item): Item {
  if (previous === undefined) return next;
  const history = [...(previous.history ?? []), toHistoryEntry(previous)].slice(-MAX_HISTORY);
  const note = hasNote(next) ? next.note : previous.note;
  return {
    ...next,
    createdAt: previous.createdAt,
    ...(note !== undefined ? { note } : {}),
    history,
  };
}

/** Builds the history entry that summarises an evaluation. */
export function toHistoryEntry(item: Item): HistoryEntry {
  return {
    at: item.updatedAt,
    score: item.result.score,
    verdict: item.result.verdict,
    answeredCount: item.result.answeredCount,
    ...(item.decision !== undefined ? { outcome: item.decision.outcome } : {}),
  };
}

/** A blank note counts as no note. */
function hasNote(item: Item): boolean {
  return item.note !== undefined && item.note.trim() !== '';
}
