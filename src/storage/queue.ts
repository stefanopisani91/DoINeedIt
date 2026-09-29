import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { newId } from '@/lib/format';
import type { ItemSource, Price } from './types';

export const QUEUE_KEY = 'doineedit:queue';
export const QUEUE_VERSION = 1;
export const MAX_QUEUE = 100;

/** A product waiting to be evaluated, e.g. picked from a wish list. */
export interface QueuedProduct {
  id: string;
  addedAt: string;
  source: ItemSource;
  title: string;
  imageUrl?: string;
  price?: Price;
  /** The wish list it came from, when known. */
  listTitle?: string;
}

export type QueueInput = Omit<QueuedProduct, 'id' | 'addedAt'>;

interface QueueState {
  queue: QueuedProduct[];
  /** Adds products not already waiting (same ASIN or url); returns how many were added. */
  add: (products: QueueInput[]) => number;
  remove: (id: string) => void;
  clear: () => void;
}

export function queueKey(source: ItemSource): string {
  return source.asin ? `asin:${source.asin}` : `url:${source.url}`;
}

/**
 * Products to evaluate one at a time. They stay in this browser and are not
 * exported: they are not evaluations yet, only a to-do list.
 */
export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      add: (products) => {
        const present = new Set(get().queue.map((p) => queueKey(p.source)));
        const fresh: QueuedProduct[] = [];
        for (const product of products) {
          const key = queueKey(product.source);
          if (present.has(key)) continue;
          present.add(key);
          fresh.push({ ...product, id: newId(), addedAt: new Date().toISOString() });
        }
        if (fresh.length > 0) {
          set((state) => ({ queue: [...state.queue, ...fresh].slice(-MAX_QUEUE) }));
        }
        return fresh.length;
      },
      remove: (id) => set((state) => ({ queue: state.queue.filter((p) => p.id !== id) })),
      clear: () => set({ queue: [] }),
    }),
    {
      name: QUEUE_KEY,
      version: QUEUE_VERSION,
      partialize: (state) => ({ queue: state.queue }),
    },
  ),
);

export function selectQueued(id: string | null) {
  return (state: QueueState) => (id ? state.queue.find((p) => p.id === id) : undefined);
}
