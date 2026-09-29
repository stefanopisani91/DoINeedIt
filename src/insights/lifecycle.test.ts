import { describe, expect, it } from 'vitest';
import type { Result, Verdict } from '@/engine/types';
import type { HistoryEntry, Item } from '@/storage/types';
import {
  COOLING_OFF_DAYS,
  MAX_HISTORY,
  addDays,
  coolingOff,
  readyToReconsider,
  reconsiderAt,
  toHistoryEntry,
  withHistory,
} from './lifecycle';

const NOW = new Date('2026-09-29T12:00:00.000Z');

/** ISO timestamp `days` days before NOW (fractions allowed). */
const daysAgo = (days: number): string => new Date(NOW.getTime() - days * 86_400_000).toISOString();

function resultFor(verdict: Verdict, score: number): Result {
  return {
    score,
    verdict,
    dimensions: { utility: 55, urgency: 30, alternatives: 40, impulse: 25, budget: null },
    confidence: 72,
    drivers: [],
    budget: null,
    answeredCount: 8,
    maybeCount: 1,
  };
}

/** A realistic item, modelled on the headphones example, evaluated at `updatedAt`. */
function makeItem(verdict: Verdict, updatedAt: string, overrides: Partial<Item> = {}): Item {
  const score = verdict === 'buy' ? 78 : verdict === 'wait' ? 52 : 24;
  return {
    id: `item-${verdict}-${updatedAt}`,
    createdAt: updatedAt,
    updatedAt,
    source: { url: 'https://www.amazon.it/dp/B0EXAMPLE1', asin: 'B0EXAMPLE1', marketplace: 'it' },
    title: 'Cuffie wireless con cancellazione del rumore',
    imageUrl: '/examples/headphones.svg',
    price: { amount: 249, currency: 'EUR' },
    category: 'tech',
    answers: { own_similar: 'yes', own_works: 'yes', concrete_need: 'no', impulse_today: 'yes' },
    askedOrder: ['own_similar', 'own_works', 'concrete_need', 'impulse_today'],
    budget: { amount: 400, currency: 'EUR' },
    result: resultFor(verdict, score),
    engineVersion: 3,
    ...overrides,
  };
}

describe('addDays', () => {
  it('adds whole days in UTC and returns an ISO string', () => {
    expect(addDays('2026-09-20T09:30:00.000Z', 30)).toBe('2026-10-20T09:30:00.000Z');
    expect(addDays('2026-09-20T09:30:00.000Z', 0)).toBe('2026-09-20T09:30:00.000Z');
    expect(addDays('2026-01-01T00:00:00.000Z', -1)).toBe('2025-12-31T00:00:00.000Z');
  });

  it('normalises an offset timestamp to UTC', () => {
    expect(addDays('2026-09-20T11:30:00.000+02:00', 1)).toBe('2026-09-21T09:30:00.000Z');
  });
});

describe('reconsiderAt', () => {
  it('is null unless the verdict is wait', () => {
    expect(reconsiderAt(makeItem('buy', daysAgo(2)))).toBeNull();
    expect(reconsiderAt(makeItem('skip', daysAgo(2)))).toBeNull();
  });

  it('derives the date from updatedAt with the default or a custom wait', () => {
    const item = makeItem('wait', '2026-09-19T12:00:00.000Z');
    expect(reconsiderAt(item)).toBe('2026-10-19T12:00:00.000Z');
    expect(reconsiderAt(item, 7)).toBe('2026-09-26T12:00:00.000Z');
    expect(COOLING_OFF_DAYS).toBe(30);
  });

  it('prefers the stored reconsiderAt over the derived one', () => {
    const item = makeItem('wait', daysAgo(10), { reconsiderAt: '2026-12-01T00:00:00.000Z' });
    expect(reconsiderAt(item)).toBe('2026-12-01T00:00:00.000Z');
    expect(reconsiderAt(item, 3)).toBe('2026-12-01T00:00:00.000Z');
  });
});

describe('coolingOff', () => {
  it('is none for a buy verdict', () => {
    expect(coolingOff(makeItem('buy', daysAgo(10)), NOW)).toEqual({
      state: 'none',
      reconsiderAt: null,
      daysLeft: 0,
    });
    expect(coolingOff(makeItem('skip', daysAgo(10)), NOW).state).toBe('none');
  });

  it('is cooling with the days left when the wait was evaluated 10 days ago', () => {
    const item = makeItem('wait', '2026-09-19T12:00:00.000Z');
    expect(coolingOff(item, NOW)).toEqual({
      state: 'cooling',
      reconsiderAt: '2026-10-19T12:00:00.000Z',
      daysLeft: 20,
    });
  });

  it('rounds a partial day up', () => {
    // 10.5 days ago: 19.5 days left, shown as 20.
    expect(coolingOff(makeItem('wait', daysAgo(10.5)), NOW).daysLeft).toBe(20);
    // One second before the wait ends still counts as a day.
    const almost = makeItem('wait', daysAgo(30), { reconsiderAt: addDays(daysAgo(0), 1 / 86_400) });
    expect(coolingOff(almost, NOW)).toMatchObject({ state: 'cooling', daysLeft: 1 });
  });

  it('is ready with no days left once the wait is over', () => {
    const item = makeItem('wait', daysAgo(31));
    expect(coolingOff(item, NOW)).toEqual({
      state: 'ready',
      reconsiderAt: daysAgo(1),
      daysLeft: 0,
    });
    // The very instant the wait ends counts as ready.
    expect(coolingOff(makeItem('wait', daysAgo(30)), NOW).state).toBe('ready');
  });

  it('is none for a wait with a recorded decision', () => {
    const item = makeItem('wait', daysAgo(40), {
      decision: { outcome: 'skipped', at: daysAgo(20) },
    });
    expect(coolingOff(item, NOW)).toEqual({ state: 'none', reconsiderAt: null, daysLeft: 0 });
  });

  it('uses the stored reconsiderAt over the derived one', () => {
    const item = makeItem('wait', daysAgo(10), { reconsiderAt: daysAgo(-5) });
    expect(coolingOff(item, NOW)).toEqual({
      state: 'cooling',
      reconsiderAt: daysAgo(-5),
      daysLeft: 5,
    });
    const overdue = makeItem('wait', daysAgo(1), { reconsiderAt: daysAgo(2) });
    expect(coolingOff(overdue, NOW).state).toBe('ready');
  });
});

describe('readyToReconsider', () => {
  it('returns only the ready items, oldest wait first', () => {
    const ready60 = makeItem('wait', daysAgo(60), { id: 'ready-60' });
    const ready35 = makeItem('wait', daysAgo(35), { id: 'ready-35' });
    const readyStored = makeItem('wait', daysAgo(5), {
      id: 'ready-stored',
      reconsiderAt: daysAgo(3),
    });
    const cooling = makeItem('wait', daysAgo(10), { id: 'cooling' });
    const bought = makeItem('buy', daysAgo(90), { id: 'bought' });
    const decided = makeItem('wait', daysAgo(90), {
      id: 'decided',
      decision: { outcome: 'bought', at: daysAgo(50) },
    });

    const ready = readyToReconsider([cooling, readyStored, bought, ready35, decided, ready60], NOW);

    expect(ready.map((item) => item.id)).toEqual(['ready-60', 'ready-35', 'ready-stored']);
  });

  it('keeps the input order for equal dates and does not mutate the list', () => {
    const a = makeItem('wait', daysAgo(40), { id: 'a' });
    const b = makeItem('wait', daysAgo(40), { id: 'b' });
    const items = [b, a];
    expect(readyToReconsider(items, NOW).map((item) => item.id)).toEqual(['b', 'a']);
    expect(items.map((item) => item.id)).toEqual(['b', 'a']);
    expect(readyToReconsider([], NOW)).toEqual([]);
  });
});

describe('toHistoryEntry', () => {
  it('summarises the evaluation', () => {
    const item = makeItem('wait', '2026-09-19T12:00:00.000Z');
    const entry: HistoryEntry = {
      at: '2026-09-19T12:00:00.000Z',
      score: 52,
      verdict: 'wait',
      answeredCount: 8,
    };
    expect(toHistoryEntry(item)).toEqual(entry);
    expect(toHistoryEntry(item)).not.toHaveProperty('outcome');
  });

  it('records the decision outcome when there is one', () => {
    const item = makeItem('buy', daysAgo(3), { decision: { outcome: 'bought', at: daysAgo(1) } });
    expect(toHistoryEntry(item).outcome).toBe('bought');
  });
});

describe('withHistory', () => {
  const previous = makeItem('wait', '2026-08-01T10:00:00.000Z', {
    id: 'same-item',
    createdAt: '2026-07-01T10:00:00.000Z',
    note: 'Wait for the autumn sale',
    decision: { outcome: 'skipped', at: '2026-08-10T10:00:00.000Z' },
    reconsiderAt: '2026-08-31T10:00:00.000Z',
  });
  const next = makeItem('buy', '2026-09-29T09:00:00.000Z', { id: 'same-item' });

  it('returns next unchanged without a previous evaluation', () => {
    expect(withHistory(undefined, next)).toBe(next);
  });

  it('keeps the original createdAt and the previous note when next has none', () => {
    const merged = withHistory(previous, next);
    expect(merged.createdAt).toBe('2026-07-01T10:00:00.000Z');
    expect(merged.updatedAt).toBe('2026-09-29T09:00:00.000Z');
    expect(merged.note).toBe('Wait for the autumn sale');
    expect(merged.result.verdict).toBe('buy');
  });

  it('prefers the note of the new evaluation', () => {
    const noted = makeItem('buy', daysAgo(0), { id: 'same-item', note: 'Found it cheaper' });
    expect(withHistory(previous, noted).note).toBe('Found it cheaper');
    // A blank note counts as no note.
    const blank = makeItem('buy', daysAgo(0), { id: 'same-item', note: '   ' });
    expect(withHistory(previous, blank).note).toBe('Wait for the autumn sale');
    // Neither side has a note: the property is absent, not undefined.
    const bare = withHistory(makeItem('wait', daysAgo(40)), next);
    expect(bare).not.toHaveProperty('note');
  });

  it('does not carry over the previous decision or reconsider date', () => {
    const merged = withHistory(previous, next);
    expect(merged).not.toHaveProperty('decision');
    expect(merged).not.toHaveProperty('reconsiderAt');
  });

  it('appends a summary of the previous evaluation with its outcome', () => {
    const merged = withHistory(previous, next);
    expect(merged.history).toEqual([
      {
        at: '2026-08-01T10:00:00.000Z',
        score: 52,
        verdict: 'wait',
        answeredCount: 8,
        outcome: 'skipped',
      },
    ]);
  });

  it('appends after the existing history, oldest first', () => {
    const older: HistoryEntry = {
      at: '2026-06-01T10:00:00.000Z',
      score: 30,
      verdict: 'skip',
      answeredCount: 6,
    };
    const merged = withHistory({ ...previous, history: [older] }, next);
    expect(merged.history?.map((entry) => entry.at)).toEqual([
      '2026-06-01T10:00:00.000Z',
      '2026-08-01T10:00:00.000Z',
    ]);
  });

  it('caps the history at MAX_HISTORY keeping the most recent entries', () => {
    const full: HistoryEntry[] = Array.from({ length: MAX_HISTORY }, (_, index) => ({
      at: `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
      score: 40 + index,
      verdict: 'wait',
      answeredCount: 8,
    }));
    const merged = withHistory({ ...previous, history: full }, next);
    expect(merged.history).toHaveLength(MAX_HISTORY);
    expect(merged.history?.[0]?.at).toBe('2026-01-02T10:00:00.000Z');
    expect(merged.history?.at(-1)).toEqual(toHistoryEntry(previous));
    expect(MAX_HISTORY).toBe(10);
  });

  it('never mutates its inputs', () => {
    const withOld = { ...previous, history: [toHistoryEntry(makeItem('skip', daysAgo(100)))] };
    const previousSnapshot = structuredClone(withOld);
    const nextSnapshot = structuredClone(next);

    const merged = withHistory(withOld, next);

    expect(withOld).toEqual(previousSnapshot);
    expect(next).toEqual(nextSnapshot);
    expect(merged).not.toBe(next);
    expect(merged.history).not.toBe(withOld.history);
  });
});
