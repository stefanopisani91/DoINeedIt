import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Price } from './types';

export const SETTINGS_KEY = 'doineedit:settings';

interface SettingsState {
  /** Monthly budget for non-essential purchases, or null when never set. */
  budget: Price | null;
  setBudget: (budget: Price | null) => void;
}

/** User preferences. They stay in this browser and never travel in exports or shared links. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      budget: null,
      setBudget: (budget) => set({ budget }),
    }),
    {
      name: SETTINGS_KEY,
      version: 1,
      partialize: (state) => ({ budget: state.budget }),
    },
  ),
);
