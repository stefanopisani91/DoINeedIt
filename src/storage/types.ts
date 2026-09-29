import type { Answers, CategoryId, Result } from '@/engine';

export interface Price {
  amount: number;
  currency: string;
}

export interface ItemSource {
  url: string;
  asin?: string;
  marketplace?: string;
}

export interface Item {
  id: string;
  createdAt: string;
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
}

/** A product the user is about to evaluate, before any answer is given. */
export interface Draft {
  source: ItemSource;
  title: string;
  imageUrl?: string;
  price?: Price;
  category: CategoryId;
}
