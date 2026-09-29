import type { CategoryId, Verdict } from '@/engine';
import { CATEGORY_IDS } from '@/data/categories';
import type { Item, Price } from '@/storage/types';

/** Sums per ISO currency, never converted, rounded to 2 decimals: { EUR: 338.99, USD: 20 }. */
export type MoneyByCurrency = Record<string, number>;

export interface VerdictCounts {
  buy: number;
  wait: number;
  skip: number;
}

export interface OutcomeCounts {
  bought: number;
  skipped: number;
  none: number;
}

export interface MonthBucket {
  /** 'YYYY-MM', UTC. */
  month: string;
  /** Evaluations whose `updatedAt` falls in the month. */
  count: number;
  verdicts: VerdictCounts;
  /** Stopped impulses evaluated in the month. */
  notSpent: MoneyByCurrency;
  /** 'bought' decisions whose `decision.at` falls in the month. */
  spent: MoneyByCurrency;
}

export interface CategoryBucket {
  category: CategoryId;
  count: number;
  verdicts: VerdictCounts;
  notSpent: MoneyByCurrency;
  /** Rounded integer, null without items. */
  averageScore: number | null;
}

/** What was spent this month, compared with the monthly budget in its currency. */
export interface BudgetMonth {
  month: string;
  currency: string;
  spent: number;
  budget: number;
  /** `spent / budget`, not rounded; 0 when the budget amount is not positive. */
  share: number;
}

export interface Insights {
  total: number;
  verdicts: VerdictCounts;
  outcomes: OutcomeCounts;
  /** Rounded integer, null without items. */
  averageScore: number | null;
  /** Σ maybeCount / Σ answeredCount, 0..1, null when Σ answeredCount is 0. */
  maybeShare: number | null;
  /** Items for which `isStoppedImpulse` holds. */
  impulsesStopped: number;
  /** Stopped impulses: `decision?.price ?? item.price`. */
  notSpent: MoneyByCurrency;
  /** Outcome 'bought': `decision.price ?? item.price`. */
  spent: MoneyByCurrency;
  /** Stopped or bought items without any price, excluded from the sums. */
  unpriced: number;
  /** The last `months` months ending with now's month, ascending, empty months included. */
  byMonth: MonthBucket[];
  /** Only categories with count > 0, by count desc, ties in CATEGORY_IDS order. */
  byCategory: CategoryBucket[];
  /** Only with `options.budget`: spent this month in the budget currency. */
  currentMonth: BudgetMonth | null;
}

export interface InsightsOptions {
  /** The reference date; defaults to the current time. */
  now?: Date;
  /** How many months `byMonth` covers, ending with now's month; defaults to 6. */
  months?: number;
  /** The monthly budget `currentMonth` is compared with. */
  budget?: Price | null;
}

const DEFAULT_MONTHS = 6;

interface MonthAccumulator {
  month: string;
  count: number;
  verdicts: VerdictCounts;
  notSpent: Price[];
  spent: Price[];
}

interface CategoryAccumulator {
  category: CategoryId;
  count: number;
  verdicts: VerdictCounts;
  notSpent: Price[];
  scoreSum: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptyVerdicts(): VerdictCounts {
  return { buy: 0, wait: 0, skip: 0 };
}

function averageOf(sum: number, count: number): number | null {
  return count > 0 ? Math.round(sum / count) : null;
}

function monthKeyOf(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** The outcome wins over the verdict: 'skipped' is a stopped impulse; without a decision a 'skip' verdict is. */
export function isStoppedImpulse(item: Item): boolean {
  if (item.decision) return item.decision.outcome === 'skipped';
  return item.result.verdict === 'skip';
}

/** Adds the amounts per currency, skipping missing prices; the totals are rounded to 2 decimals. */
export function sumByCurrency(prices: ReadonlyArray<Price | undefined>): MoneyByCurrency {
  const totals: MoneyByCurrency = {};
  for (const price of prices) {
    if (!price) continue;
    totals[price.currency] = (totals[price.currency] ?? 0) + price.amount;
  }
  for (const currency of Object.keys(totals)) {
    totals[currency] = round2(totals[currency] ?? 0);
  }
  return totals;
}

/** The 'YYYY-MM' key of an ISO date, in UTC: '2026-09'. */
export function monthKey(iso: string): string {
  return monthKeyOf(new Date(iso));
}

/** The keys of the last `months` months, ascending, ending with now's month. */
export function lastMonths(now: Date, months: number): string[] {
  const count = Math.max(0, Math.floor(months));
  const keys: string[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    keys.push(monthKeyOf(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1))));
  }
  return keys;
}

function categoryOrder(category: CategoryId): number {
  const index = CATEGORY_IDS.indexOf(category);
  return index === -1 ? CATEGORY_IDS.length : index;
}

/** Aggregates the evaluations into totals, monthly and per-category buckets. Pure: the items are not touched. */
export function computeInsights(items: readonly Item[], options: InsightsOptions = {}): Insights {
  const now = options.now ?? new Date();
  const months = options.months ?? DEFAULT_MONTHS;
  const budget = options.budget ?? null;
  const nowKey = monthKeyOf(now);

  const verdicts = emptyVerdicts();
  const outcomes: OutcomeCounts = { bought: 0, skipped: 0, none: 0 };
  let scoreSum = 0;
  let maybeSum = 0;
  let answeredSum = 0;
  let impulsesStopped = 0;
  let unpriced = 0;
  let currentSpent = 0;
  const notSpentPrices: Price[] = [];
  const spentPrices: Price[] = [];

  const byMonth = new Map<string, MonthAccumulator>(
    lastMonths(now, months).map((month) => [
      month,
      { month, count: 0, verdicts: emptyVerdicts(), notSpent: [], spent: [] },
    ]),
  );
  const byCategory = new Map<CategoryId, CategoryAccumulator>();

  for (const item of items) {
    const verdict: Verdict = item.result.verdict;
    verdicts[verdict] += 1;
    outcomes[item.decision?.outcome ?? 'none'] += 1;
    scoreSum += item.result.score;
    maybeSum += item.result.maybeCount;
    answeredSum += item.result.answeredCount;

    const stopped = isStoppedImpulse(item);
    const bought = item.decision?.outcome === 'bought';
    const price = item.decision?.price ?? item.price;

    if (stopped) {
      impulsesStopped += 1;
      if (price) notSpentPrices.push(price);
      else unpriced += 1;
    }
    if (bought) {
      if (price) spentPrices.push(price);
      else unpriced += 1;
    }

    const evaluated = byMonth.get(monthKey(item.updatedAt));
    if (evaluated) {
      evaluated.count += 1;
      evaluated.verdicts[verdict] += 1;
      if (stopped && price) evaluated.notSpent.push(price);
    }
    if (bought && price && item.decision) {
      const decidedKey = monthKey(item.decision.at);
      byMonth.get(decidedKey)?.spent.push(price);
      if (budget && decidedKey === nowKey && price.currency === budget.currency) {
        currentSpent += price.amount;
      }
    }

    let category = byCategory.get(item.category);
    if (!category) {
      category = {
        category: item.category,
        count: 0,
        verdicts: emptyVerdicts(),
        notSpent: [],
        scoreSum: 0,
      };
      byCategory.set(item.category, category);
    }
    category.count += 1;
    category.verdicts[verdict] += 1;
    category.scoreSum += item.result.score;
    if (stopped && price) category.notSpent.push(price);
  }

  const monthBuckets: MonthBucket[] = [...byMonth.values()].map((acc) => ({
    month: acc.month,
    count: acc.count,
    verdicts: acc.verdicts,
    notSpent: sumByCurrency(acc.notSpent),
    spent: sumByCurrency(acc.spent),
  }));

  const categoryBuckets: CategoryBucket[] = [...byCategory.values()]
    .sort((a, b) => b.count - a.count || categoryOrder(a.category) - categoryOrder(b.category))
    .map((acc) => ({
      category: acc.category,
      count: acc.count,
      verdicts: acc.verdicts,
      notSpent: sumByCurrency(acc.notSpent),
      averageScore: averageOf(acc.scoreSum, acc.count),
    }));

  let currentMonth: BudgetMonth | null = null;
  if (budget) {
    const spent = round2(currentSpent);
    currentMonth = {
      month: nowKey,
      currency: budget.currency,
      spent,
      budget: budget.amount,
      share: budget.amount > 0 ? spent / budget.amount : 0,
    };
  }

  return {
    total: items.length,
    verdicts,
    outcomes,
    averageScore: averageOf(scoreSum, items.length),
    maybeShare: answeredSum > 0 ? maybeSum / answeredSum : null,
    impulsesStopped,
    notSpent: sumByCurrency(notSpentPrices),
    spent: sumByCurrency(spentPrices),
    unpriced,
    byMonth: monthBuckets,
    byCategory: categoryBuckets,
    currentMonth,
  };
}
