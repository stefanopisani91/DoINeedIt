import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Item } from './types';

export const STORAGE_KEY = 'doineedit:v1';
export const STORAGE_VERSION = 2;
export const MAX_ITEMS = 500;

interface ItemsState {
  items: Item[];
  upsert: (item: Item) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Adds items that are not already present; returns how many were added. */
  merge: (items: Item[]) => number;
}

/** Brings a state persisted by an older version up to date. */
export function migrateItems(persisted: unknown, version: number): { items: Item[] } {
  const state = (persisted ?? {}) as { items?: Item[] };
  const items = Array.isArray(state.items) ? state.items : [];
  if (version < 2) {
    // Version 2 added the budget component to results.
    return { items: items.map((item) => ({ ...item, result: { ...item.result, budget: null } })) };
  }
  return { items };
}

function sortNewestFirst(items: Item[]): Item[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const useItemsStore = create<ItemsState>()(
  persist(
    (set, get) => ({
      items: [],
      upsert: (item) =>
        set((state) => {
          const others = state.items.filter((x) => x.id !== item.id);
          return { items: sortNewestFirst([item, ...others]).slice(0, MAX_ITEMS) };
        }),
      remove: (id) => set((state) => ({ items: state.items.filter((x) => x.id !== id) })),
      clear: () => set({ items: [] }),
      merge: (incoming) => {
        const existing = new Set(get().items.map((x) => x.id));
        const fresh = incoming.filter((x) => !existing.has(x.id));
        if (fresh.length > 0) {
          set((state) => ({
            items: sortNewestFirst([...fresh, ...state.items]).slice(0, MAX_ITEMS),
          }));
        }
        return fresh.length;
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      partialize: (state) => ({ items: state.items }),
      migrate: migrateItems,
    },
  ),
);

export function selectItem(id: string | undefined) {
  return (state: ItemsState) => (id ? state.items.find((x) => x.id === id) : undefined);
}
