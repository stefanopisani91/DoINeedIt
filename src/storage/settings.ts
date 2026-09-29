import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/i18n';
import type { Price } from './types';

export const SETTINGS_KEY = 'doineedit:settings';
export const SETTINGS_VERSION = 2;

interface SettingsState {
  /** Monthly budget for non-essential purchases, or null when never set. */
  budget: Price | null;
  setBudget: (budget: Price | null) => void;
  /** Interface language, or null to follow the browser. */
  language: Language | null;
  setLanguage: (language: Language | null) => void;
}

type PersistedSettings = Pick<SettingsState, 'budget' | 'language'>;

/** Brings settings persisted by an older version up to date. */
export function migrateSettings(persisted: unknown, version: number): PersistedSettings {
  const state = (persisted ?? {}) as Partial<PersistedSettings>;
  const budget = state.budget ?? null;
  if (version < 2) {
    // Version 2 added the interface language; before it the app was Italian only.
    return { budget, language: null };
  }
  return { budget, language: state.language ?? null };
}

/** User preferences. They stay in this browser and never travel in exports or shared links. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      budget: null,
      setBudget: (budget) => set({ budget }),
      language: null,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: SETTINGS_KEY,
      version: SETTINGS_VERSION,
      partialize: (state) => ({ budget: state.budget, language: state.language }),
      migrate: migrateSettings,
    },
  ),
);
