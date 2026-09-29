import { ENGINE_VERSION, budgetShare, evaluate, type Answers, type CategoryId } from '@/engine';
import type { Copy, ExampleCopy } from '@/i18n/it';
import { it } from '@/i18n/it';
import type { Item, Price } from '@/storage/types';
import { questionsIn } from './questions';

type ExampleKey = keyof Copy['examples'];

interface ExampleSeed {
  key: ExampleKey;
  id: string;
  category: CategoryId;
  imageUrl: string;
  price: Price;
  url: string;
  asin: string;
  daysAgo: number;
  answers: Answers;
}

/** The monthly budget the example items were evaluated against. */
const EXAMPLE_BUDGET: Price = { amount: 400, currency: 'EUR' };

const SEEDS: ExampleSeed[] = [
  {
    key: 'headphones',
    id: 'example-headphones',
    category: 'tech',
    imageUrl: '/examples/headphones.svg',
    price: { amount: 249, currency: 'EUR' },
    url: 'https://www.amazon.it/dp/B0EXAMPLE1',
    asin: 'B0EXAMPLE1',
    daysAgo: 1,
    answers: {
      own_similar: 'yes',
      own_works: 'yes',
      new_different: 'no',
      concrete_need: 'no',
      weekly_use: 'yes',
      problem_soon: 'no',
      impulse_today: 'yes',
      budget_sacrifice: 'yes',
    },
  },
  {
    key: 'airfryer',
    id: 'example-airfryer',
    category: 'kitchen',
    imageUrl: '/examples/airfryer.svg',
    price: { amount: 89.99, currency: 'EUR' },
    url: 'https://www.amazon.it/dp/B0EXAMPLE2',
    asin: 'B0EXAMPLE2',
    daysAgo: 4,
    answers: {
      own_similar: 'no',
      concrete_need: 'maybe',
      weekly_use: 'yes',
      problem_soon: 'no',
      impulse_today: 'no',
      budget_sacrifice: 'no',
      kitchen_frequency: 'yes',
      kitchen_same_result: 'maybe',
      kitchen_reach: 'yes',
      local_cheaper: 'no',
      borrow_rent_used: 'no',
      replace_broken: 'no',
      budget_month_spent: 'no',
      budget_regret: 'maybe',
      wanted_before: 'yes',
      full_price_later: 'maybe',
      wait_30_days: 'maybe',
      recommend_friend: 'yes',
      pay_30_more: 'no',
    },
  },
  {
    key: 'shoes',
    id: 'example-shoes',
    category: 'sport',
    imageUrl: '/examples/shoes.svg',
    price: { amount: 119.9, currency: 'EUR' },
    url: 'https://www.amazon.it/dp/B0EXAMPLE3',
    asin: 'B0EXAMPLE3',
    daysAgo: 9,
    answers: {
      own_similar: 'yes',
      own_works: 'no',
      new_different: 'no',
      concrete_need: 'yes',
      weekly_use: 'yes',
      problem_soon: 'yes',
      impulse_today: 'no',
      budget_sacrifice: 'no',
    },
  },
];

function isoDaysAgo(days: number): string {
  const date = new Date('2026-09-20T09:30:00.000Z');
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function toItem(seed: ExampleSeed, copy: Copy): Item {
  const askedOrder = Object.keys(seed.answers);
  const timestamp = isoDaysAgo(seed.daysAgo);
  const text: ExampleCopy = copy.examples[seed.key];
  const item: Item = {
    id: seed.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    source: { url: seed.url, asin: seed.asin, marketplace: 'it' },
    title: text.title,
    imageUrl: seed.imageUrl,
    price: seed.price,
    category: seed.category,
    answers: seed.answers,
    askedOrder,
    budget: EXAMPLE_BUDGET,
    result: evaluate(
      questionsIn(copy),
      seed.category,
      seed.answers,
      budgetShare(seed.price, EXAMPLE_BUDGET),
    ),
    engineVersion: ENGINE_VERSION,
  };
  if (text.note) item.note = text.note;
  return item;
}

/** Demo items in the given language, so the app never looks empty when someone tries it. */
export function exampleItems(copy: Copy): Item[] {
  return SEEDS.map((seed) => toItem(seed, copy));
}

/** The demo items in Italian, the app's first language. */
export const EXAMPLE_ITEMS: Item[] = exampleItems(it);
