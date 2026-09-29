import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Draft } from './types';

export interface DraftState {
  draft: (Draft & { itemId?: string; createdAt?: string }) | null;
  setDraft: (draft: DraftState['draft']) => void;
  clearDraft: () => void;
}

/** The product being evaluated right now. Survives a page refresh, not a closed tab. */
export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null }),
    }),
    {
      name: 'doineedit:draft',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
