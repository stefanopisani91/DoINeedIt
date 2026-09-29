import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION, type CategoryId, type Verdict } from '@/engine';
import { EXAMPLE_ITEMS } from '@/data/examples';
import type { Decision, Item, Price } from '@/storage/types';
import {
  computeInsights,
  isStoppedImpulse,
  lastMonths,
  monthKey,
  sumByCurrency,
  type Insights,
} from './insights';

const NOW = new Date('2026-09-29T12:00:00Z');
const EUR = (amount: number): Price => ({ amount, currency: 'EUR' });
const USD = (amount: number): Price => ({ amount, currency: 'USD' });
const EMPTY_VERDICTS = { buy: 0, wait: 0, skip: 0 };

interface Seed {
  id?: string;
  category?: CategoryId;
  verdict?: Verdict;
  score?: number;
  answeredCount?: number;
  maybeCount?: number;
  price?: Price;
  updatedAt?: string;
  decision?: Decision;
}

let counter = 0;

/** A minimal, valid Item; only the fields the insights read are configurable. */
function makeItem(seed: Seed = {}): Item {
  counter += 1;
  const updatedAt = seed.updatedAt ?? '2026-09-10T10:00:00.000Z';
  const item: Item = {
    id: seed.id ?? `item-${counter}`,
    createdAt: updatedAt,
    updatedAt,
    source: { url: `https://example.com/p/${counter}` },
    title: `Item ${counter}`,
    category: seed.category ?? 'tech',
    answers: {},
    askedOrder: [],
    result: {
      score: seed.score ?? 50,
      verdict: seed.verdict ?? 'wait',
      dimensions: { utility: null, urgency: null, alternatives: null, impulse: null, budget: null },
      confidence: 50,
      drivers: [],
      budget: null,
      answeredCount: seed.answeredCount ?? 0,
      maybeCount: seed.maybeCount ?? 0,
    },
    engineVersion: ENGINE_VERSION,
  };
  if (seed.price) item.price = seed.price;
  if (seed.decision) item.decision = seed.decision;
  return item;
}

const bought = (at: string, price?: Price): Decision =>
  price ? { outcome: 'bought', at, price } : { outcome: 'bought', at };
const skipped = (at: string, price?: Price): Decision =>
  price ? { outcome: 'skipped', at, price } : { outcome: 'skipped', at };

describe('isStoppedImpulse', () => {
  it('is true for a "skip" verdict without a decision, false for the other verdicts', () => {
    expect(isStoppedImpulse(makeItem({ verdict: 'skip' }))).toBe(true);
    expect(isStoppedImpulse(makeItem({ verdict: 'wait' }))).toBe(false);
    expect(isStoppedImpulse(makeItem({ verdict: 'buy' }))).toBe(false);
  });

  it('lets the outcome win over the verdict in both directions', () => {
    expect(
      isStoppedImpulse(makeItem({ verdict: 'buy', decision: skipped('2026-09-11T00:00:00Z') })),
    ).toBe(true);
    expect(
      isStoppedImpulse(makeItem({ verdict: 'skip', decision: bought('2026-09-11T00:00:00Z') })),
    ).toBe(false);
    expect(
      isStoppedImpulse(makeItem({ verdict: 'wait', decision: skipped('2026-09-11T00:00:00Z') })),
    ).toBe(true);
  });
});

describe('sumByCurrency', () => {
  it('returns an empty object without prices', () => {
    expect(sumByCurrency([])).toEqual({});
    expect(sumByCurrency([undefined, undefined])).toEqual({});
  });

  it('keeps currencies apart and skips missing prices', () => {
    expect(sumByCurrency([EUR(249), undefined, USD(20), EUR(89.99)])).toEqual({
      EUR: 338.99,
      USD: 20,
    });
  });

  it('rounds each total to 2 decimals', () => {
    expect(sumByCurrency([EUR(0.1), EUR(0.2)])).toEqual({ EUR: 0.3 });
    expect(sumByCurrency([EUR(1.005), EUR(1.005)])).toEqual({ EUR: 2.01 });
  });
});

describe('monthKey', () => {
  it('formats the UTC year and zero-padded month', () => {
    expect(monthKey('2026-09-29T12:00:00Z')).toBe('2026-09');
    expect(monthKey('2026-01-05T00:00:00.000Z')).toBe('2026-01');
  });

  it('uses UTC, not the offset written in the date', () => {
    // 23:30 at UTC-2 on September 30th is already October 1st in UTC.
    expect(monthKey('2026-09-30T23:30:00-02:00')).toBe('2026-10');
    // 00:30 at UTC+2 on October 1st is still September 30th in UTC.
    expect(monthKey('2026-10-01T00:30:00+02:00')).toBe('2026-09');
  });
});

describe('lastMonths', () => {
  it('lists the months ascending, ending with the current one', () => {
    expect(lastMonths(NOW, 6)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(lastMonths(NOW, 1)).toEqual(['2026-09']);
  });

  it('crosses the year boundary', () => {
    expect(lastMonths(new Date('2027-01-15T08:00:00Z'), 3)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
    ]);
    expect(lastMonths(new Date('2026-02-01T00:00:00Z'), 14)[0]).toBe('2025-01');
  });

  it('returns nothing for zero or negative months', () => {
    expect(lastMonths(NOW, 0)).toEqual([]);
    expect(lastMonths(NOW, -2)).toEqual([]);
  });
});

describe('computeInsights', () => {
  it('is all zeros and nulls for an empty list, with six empty months', () => {
    const insights = computeInsights([], { now: NOW });
    expect(insights).toEqual<Insights>({
      total: 0,
      verdicts: EMPTY_VERDICTS,
      outcomes: { bought: 0, skipped: 0, none: 0 },
      averageScore: null,
      maybeShare: null,
      impulsesStopped: 0,
      notSpent: {},
      spent: {},
      unpriced: 0,
      byMonth: lastMonths(NOW, 6).map((month) => ({
        month,
        count: 0,
        verdicts: EMPTY_VERDICTS,
        notSpent: {},
        spent: {},
      })),
      byCategory: [],
      currentMonth: null,
    });
    expect(insights.byMonth).toHaveLength(6);
    expect(insights.byMonth[0]?.month).toBe('2026-04');
    expect(insights.byMonth[5]?.month).toBe('2026-09');
  });

  it('counts verdicts and outcomes', () => {
    const items = [
      makeItem({ verdict: 'buy' }),
      makeItem({ verdict: 'buy', decision: bought('2026-09-12T00:00:00Z') }),
      makeItem({ verdict: 'wait' }),
      makeItem({ verdict: 'skip', decision: skipped('2026-09-12T00:00:00Z') }),
      makeItem({ verdict: 'skip' }),
    ];
    const insights = computeInsights(items, { now: NOW });
    expect(insights.total).toBe(5);
    expect(insights.verdicts).toEqual({ buy: 2, wait: 1, skip: 2 });
    expect(insights.outcomes).toEqual({ bought: 1, skipped: 1, none: 3 });
  });

  it('counts unpriced stopped and bought items and leaves the sums empty', () => {
    const items = [
      makeItem({ verdict: 'skip' }),
      makeItem({ verdict: 'buy', decision: bought('2026-09-12T00:00:00Z') }),
      makeItem({ verdict: 'wait', decision: skipped('2026-09-12T00:00:00Z') }),
      // Neither stopped nor bought: never counted as unpriced.
      makeItem({ verdict: 'wait' }),
      makeItem({ verdict: 'buy' }),
    ];
    const insights = computeInsights(items, { now: NOW });
    expect(insights.impulsesStopped).toBe(2);
    expect(insights.unpriced).toBe(3);
    expect(insights.notSpent).toEqual({});
    expect(insights.spent).toEqual({});
    expect(insights.byMonth[5]?.notSpent).toEqual({});
    expect(insights.byMonth[5]?.spent).toEqual({});
    expect(insights.byCategory[0]?.notSpent).toEqual({});
  });

  it('keeps EUR and USD apart in every sum', () => {
    const items = [
      makeItem({ verdict: 'skip', price: EUR(249) }),
      makeItem({ verdict: 'skip', price: EUR(89.99) }),
      makeItem({ verdict: 'skip', price: USD(20) }),
      makeItem({ verdict: 'buy', price: EUR(30), decision: bought('2026-09-12T00:00:00Z') }),
      makeItem({ verdict: 'buy', price: USD(15.5), decision: bought('2026-09-12T00:00:00Z') }),
    ];
    const insights = computeInsights(items, { now: NOW });
    expect(insights.notSpent).toEqual({ EUR: 338.99, USD: 20 });
    expect(insights.spent).toEqual({ EUR: 30, USD: 15.5 });
    expect(insights.unpriced).toBe(0);
    expect(insights.byMonth[5]?.notSpent).toEqual({ EUR: 338.99, USD: 20 });
    expect(insights.byMonth[5]?.spent).toEqual({ EUR: 30, USD: 15.5 });
    expect(insights.byCategory[0]?.notSpent).toEqual({ EUR: 338.99, USD: 20 });
  });

  it('lets the outcome override the verdict: buy then skipped is not spent, skip then bought is spent', () => {
    const items = [
      makeItem({ verdict: 'buy', price: EUR(100), decision: skipped('2026-09-12T00:00:00Z') }),
      makeItem({ verdict: 'skip', price: EUR(40), decision: bought('2026-09-12T00:00:00Z') }),
    ];
    const insights = computeInsights(items, { now: NOW });
    expect(insights.verdicts).toEqual({ buy: 1, wait: 0, skip: 1 });
    expect(insights.outcomes).toEqual({ bought: 1, skipped: 1, none: 0 });
    expect(insights.impulsesStopped).toBe(1);
    expect(insights.notSpent).toEqual({ EUR: 100 });
    expect(insights.spent).toEqual({ EUR: 40 });
  });

  it('prefers the price recorded with the decision over the listed one', () => {
    const items = [
      makeItem({
        verdict: 'buy',
        price: EUR(100),
        decision: bought('2026-09-12T00:00:00Z', EUR(79.9)),
      }),
      makeItem({
        verdict: 'wait',
        price: USD(50),
        decision: skipped('2026-09-12T00:00:00Z', USD(45)),
      }),
      // A decision price without a listed price still counts.
      makeItem({ verdict: 'wait', decision: bought('2026-09-12T00:00:00Z', EUR(10)) }),
    ];
    const insights = computeInsights(items, { now: NOW });
    expect(insights.spent).toEqual({ EUR: 89.9 });
    expect(insights.notSpent).toEqual({ USD: 45 });
    expect(insights.unpriced).toBe(0);
  });

  it('buckets evaluations by updatedAt and spending by decision.at, with empty months in order', () => {
    const items = [
      // Evaluated in July, bought in September: counted in July, spent in September.
      makeItem({
        verdict: 'wait',
        price: EUR(60),
        updatedAt: '2026-07-20T10:00:00Z',
        decision: bought('2026-09-03T10:00:00Z'),
      }),
      // Evaluated and stopped in September.
      makeItem({ verdict: 'skip', price: EUR(25), updatedAt: '2026-09-15T10:00:00Z' }),
      // Evaluated in April, the first month of the window.
      makeItem({ verdict: 'buy', updatedAt: '2026-04-01T00:00:00Z' }),
      // Evaluated before the window: counted in the totals, absent from byMonth.
      makeItem({ verdict: 'skip', price: EUR(5), updatedAt: '2026-03-31T23:59:59Z' }),
    ];
    const insights = computeInsights(items, { now: NOW });
    expect(insights.total).toBe(4);
    expect(insights.notSpent).toEqual({ EUR: 30 });
    expect(insights.byMonth.map((b) => b.month)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(insights.byMonth.map((b) => b.count)).toEqual([1, 0, 0, 1, 0, 1]);
    expect(insights.byMonth[0]?.verdicts).toEqual({ buy: 1, wait: 0, skip: 0 });
    expect(insights.byMonth[3]).toEqual({
      month: '2026-07',
      count: 1,
      verdicts: { buy: 0, wait: 1, skip: 0 },
      notSpent: {},
      spent: {},
    });
    expect(insights.byMonth[4]).toEqual({
      month: '2026-08',
      count: 0,
      verdicts: EMPTY_VERDICTS,
      notSpent: {},
      spent: {},
    });
    expect(insights.byMonth[5]).toEqual({
      month: '2026-09',
      count: 1,
      verdicts: { buy: 0, wait: 0, skip: 1 },
      notSpent: { EUR: 25 },
      spent: { EUR: 60 },
    });
  });

  it('honours the months option and defaults to six', () => {
    expect(computeInsights([], { now: NOW }).byMonth).toHaveLength(6);
    expect(computeInsights([], { now: NOW, months: 3 }).byMonth.map((b) => b.month)).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(computeInsights([], { now: NOW, months: 0 }).byMonth).toEqual([]);
  });

  it('spans the year boundary in byMonth', () => {
    const january = new Date('2027-01-10T09:00:00Z');
    const items = [makeItem({ verdict: 'wait', updatedAt: '2026-12-24T18:00:00Z' })];
    const insights = computeInsights(items, { now: january, months: 3 });
    expect(insights.byMonth.map((b) => b.month)).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(insights.byMonth.map((b) => b.count)).toEqual([0, 1, 0]);
  });

  it('computes maybeShare from the answered questions, null when nothing was answered', () => {
    expect(computeInsights([makeItem({ answeredCount: 0, maybeCount: 0 })]).maybeShare).toBeNull();
    const items = [
      makeItem({ answeredCount: 8, maybeCount: 2 }),
      makeItem({ answeredCount: 12, maybeCount: 3 }),
      makeItem({ answeredCount: 0, maybeCount: 0 }),
    ];
    expect(computeInsights(items).maybeShare).toBeCloseTo(5 / 20, 10);
  });

  it('rounds averageScore to an integer, overall and per category', () => {
    const items = [
      makeItem({ score: 60, category: 'tech' }),
      makeItem({ score: 61, category: 'tech' }),
      makeItem({ score: 61, category: 'home' }),
    ];
    const insights = computeInsights(items, { now: NOW });
    // 182 / 3 = 60.67
    expect(insights.averageScore).toBe(61);
    expect(insights.byCategory.find((b) => b.category === 'tech')?.averageScore).toBe(61); // 60.5
    expect(insights.byCategory.find((b) => b.category === 'home')?.averageScore).toBe(61);
    expect(computeInsights([makeItem({ score: 72 })]).averageScore).toBe(72);
  });

  it('orders byCategory by count, ties in CATEGORY_IDS order, without empty categories', () => {
    const items = [
      makeItem({ category: 'media', verdict: 'skip', price: EUR(12) }),
      makeItem({ category: 'media', verdict: 'buy', score: 80 }),
      makeItem({ category: 'kitchen', verdict: 'wait' }),
      makeItem({ category: 'other', verdict: 'skip', price: EUR(8) }),
      makeItem({ category: 'tech', verdict: 'skip', price: USD(99) }),
    ];
    const insights = computeInsights(items, { now: NOW });
    expect(insights.byCategory.map((b) => b.category)).toEqual([
      'media',
      'tech',
      'kitchen',
      'other',
    ]);
    expect(insights.byCategory.map((b) => b.count)).toEqual([2, 1, 1, 1]);
    expect(insights.byCategory[0]).toEqual({
      category: 'media',
      count: 2,
      verdicts: { buy: 1, wait: 0, skip: 1 },
      notSpent: { EUR: 12 },
      averageScore: 65,
    });
    expect(insights.byCategory[1]?.notSpent).toEqual({ USD: 99 });
    expect(insights.byCategory[2]?.notSpent).toEqual({});
    expect(insights.byCategory.some((b) => b.category === 'clothing')).toBe(false);
  });

  describe('currentMonth', () => {
    const items = [
      // Bought this month in EUR, at the decision price.
      makeItem({
        verdict: 'wait',
        price: EUR(100),
        updatedAt: '2026-08-20T10:00:00Z',
        decision: bought('2026-09-05T10:00:00Z', EUR(90)),
      }),
      makeItem({ verdict: 'buy', price: EUR(30.5), decision: bought('2026-09-28T10:00:00Z') }),
      // Bought last month: not this month's spending.
      makeItem({ verdict: 'buy', price: EUR(500), decision: bought('2026-08-31T23:00:00Z') }),
      // Bought this month in another currency.
      makeItem({ verdict: 'buy', price: USD(40), decision: bought('2026-09-10T10:00:00Z') }),
      // Stopped: not spent.
      makeItem({ verdict: 'skip', price: EUR(70) }),
    ];

    it('is null without a budget', () => {
      expect(computeInsights(items, { now: NOW }).currentMonth).toBeNull();
      expect(computeInsights(items, { now: NOW, budget: null }).currentMonth).toBeNull();
    });

    it('sums this month only, in the budget currency, and computes the share', () => {
      const insights = computeInsights(items, { now: NOW, budget: EUR(400) });
      expect(insights.currentMonth).toEqual({
        month: '2026-09',
        currency: 'EUR',
        spent: 120.5,
        budget: 400,
        share: 120.5 / 400,
      });
      expect(insights.spent).toEqual({ EUR: 620.5, USD: 40 });
    });

    it('is zero, not null, with a budget in a currency nothing was bought in', () => {
      const insights = computeInsights(items, {
        now: NOW,
        budget: { amount: 300, currency: 'GBP' },
      });
      expect(insights.currentMonth).toEqual({
        month: '2026-09',
        currency: 'GBP',
        spent: 0,
        budget: 300,
        share: 0,
      });
    });

    it('is zero with a budget and no items', () => {
      expect(computeInsights([], { now: NOW, budget: EUR(400) }).currentMonth).toEqual({
        month: '2026-09',
        currency: 'EUR',
        spent: 0,
        budget: 400,
        share: 0,
      });
    });

    it('does not divide by a zero budget', () => {
      const insights = computeInsights(items, { now: NOW, budget: EUR(0) });
      expect(insights.currentMonth?.spent).toBe(120.5);
      expect(insights.currentMonth?.share).toBe(0);
    });

    it('ignores the byMonth window: the current month is always available', () => {
      const insights = computeInsights(items, { now: NOW, months: 0, budget: EUR(400) });
      expect(insights.byMonth).toEqual([]);
      expect(insights.currentMonth?.spent).toBe(120.5);
    });
  });

  it('does not mutate the items', () => {
    const items = [
      makeItem({ verdict: 'skip', price: EUR(10), category: 'home' }),
      makeItem({ verdict: 'buy', price: EUR(20), decision: bought('2026-09-12T00:00:00Z') }),
    ];
    const snapshot = JSON.stringify(items);
    const frozen = items.map((item) => Object.freeze({ ...item }));
    computeInsights(frozen, { now: NOW, budget: EUR(100) });
    expect(JSON.stringify(items)).toBe(snapshot);
  });

  it('is deterministic', () => {
    const items = [
      makeItem({ verdict: 'skip', price: EUR(10) }),
      makeItem({ verdict: 'buy', price: USD(20), decision: bought('2026-09-12T00:00:00Z') }),
    ];
    const options = { now: NOW, budget: EUR(100) };
    expect(computeInsights(items, options)).toEqual(computeInsights(items, options));
  });

  it('summarises the example items', () => {
    const insights = computeInsights(EXAMPLE_ITEMS, { now: NOW, budget: EUR(400) });
    expect(insights.total).toBe(EXAMPLE_ITEMS.length);
    // Headphones skipped, shoes bought, air fryer still waiting.
    expect(insights.outcomes).toEqual({ bought: 1, skipped: 1, none: 1 });
    expect(insights.verdicts.buy + insights.verdicts.wait + insights.verdicts.skip).toBe(
      EXAMPLE_ITEMS.length,
    );
    // All examples were evaluated in September 2026; the shoes were bought at 109.90.
    expect(insights.byMonth[5]?.count).toBe(EXAMPLE_ITEMS.length);
    expect(insights.byMonth.slice(0, 5).every((b) => b.count === 0)).toBe(true);
    expect(insights.spent).toEqual({ EUR: 109.9 });
    expect(insights.currentMonth).toEqual({
      month: '2026-09',
      currency: 'EUR',
      spent: 109.9,
      budget: 400,
      share: 109.9 / 400,
    });
    const skipped = EXAMPLE_ITEMS.filter((item) => item.result.verdict === 'skip');
    expect(insights.impulsesStopped).toBe(skipped.length);
    expect(insights.notSpent).toEqual(sumByCurrency(skipped.map((item) => item.price)));
    expect(insights.unpriced).toBe(0);
    expect(insights.byCategory).toHaveLength(EXAMPLE_ITEMS.length);
    expect(insights.averageScore).toBe(
      Math.round(
        EXAMPLE_ITEMS.reduce((sum, item) => sum + item.result.score, 0) / EXAMPLE_ITEMS.length,
      ),
    );
  });
});
