import { ENGINE_VERSION, budgetShare, evaluate, type Answers, type CategoryId } from '@/engine';
import type { Item, Price } from '@/storage/types';
import { QUESTIONS } from './questions';

interface ExampleSeed {
  id: string;
  title: string;
  category: CategoryId;
  imageUrl: string;
  price: Price;
  url: string;
  asin: string;
  daysAgo: number;
  answers: Answers;
  note?: string;
}

/** The monthly budget the example items were evaluated against. */
const EXAMPLE_BUDGET: Price = { amount: 400, currency: 'EUR' };

const SEEDS: ExampleSeed[] = [
  {
    id: 'example-headphones',
    title: 'Cuffie Bluetooth over-ear con cancellazione del rumore',
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
    note: 'Viste in un video, le mie funzionano ancora benissimo.',
  },
  {
    id: 'example-airfryer',
    title: 'Friggitrice ad aria 5,5 L con doppio cestello',
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
    id: 'example-shoes',
    title: 'Scarpe da corsa ammortizzate, ricambio del modello che uso',
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
    note: 'Le vecchie hanno 900 km e mi fanno male al ginocchio.',
  },
];

function isoDaysAgo(days: number): string {
  const date = new Date('2026-09-20T09:30:00.000Z');
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function toItem(seed: ExampleSeed): Item {
  const askedOrder = Object.keys(seed.answers);
  const timestamp = isoDaysAgo(seed.daysAgo);
  const item: Item = {
    id: seed.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    source: { url: seed.url, asin: seed.asin, marketplace: 'it' },
    title: seed.title,
    imageUrl: seed.imageUrl,
    price: seed.price,
    category: seed.category,
    answers: seed.answers,
    askedOrder,
    budget: EXAMPLE_BUDGET,
    result: evaluate(
      QUESTIONS,
      seed.category,
      seed.answers,
      budgetShare(seed.price, EXAMPLE_BUDGET),
    ),
    engineVersion: ENGINE_VERSION,
  };
  if (seed.note) item.note = seed.note;
  return item;
}

/** Demo items, so the app never looks empty when someone tries it for the first time. */
export const EXAMPLE_ITEMS: Item[] = SEEDS.map(toItem);
