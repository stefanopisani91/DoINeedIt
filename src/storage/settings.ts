import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/i18n';
import type { Price } from './types';

export const SETTINGS_KEY = 'doineedit:settings';
/**
 * Version 2 added the interface language. The theme and the onboarding flag
 * came later without a bump: they are optional additions filled by defaults,
 * and a bump is only for migrations that transform data. With the same version
 * zustand `persist` does not call `migrate`, and its default `merge` spreads the
 * persisted object over the initial state, so the missing keys keep their
 * initial values (`theme: null`, `onboardingSeen: false`). `migrateSettings`
 * still fills them for every older shape.
 */
export const SETTINGS_VERSION = 2;

export type Theme = 'light' | 'dark';

const THEMES: readonly Theme[] = ['light', 'dark'];

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

interface SettingsState {
  /** Monthly budget for non-essential purchases, or null when never set. */
  budget: Price | null;
  setBudget: (budget: Price | null) => void;
  /** Interface language, or null to follow the browser. */
  language: Language | null;
  setLanguage: (language: Language | null) => void;
  /** Interface theme, or null to follow the system. */
  theme: Theme | null;
  setTheme: (theme: Theme | null) => void;
  /** Whether the first-run welcome panel was dismissed. */
  onboardingSeen: boolean;
  setOnboardingSeen: (seen: boolean) => void;
}

type PersistedSettings = Pick<SettingsState, 'budget' | 'language' | 'theme' | 'onboardingSeen'>;

/**
 * Brings settings persisted by an older version up to date, filling the
 * defaults for every field an older shape lacks. Values of the wrong type are
 * treated as missing.
 */
export function migrateSettings(persisted: unknown, version: number): PersistedSettings {
  const state = (persisted ?? {}) as Partial<Record<keyof PersistedSettings, unknown>>;
  const budget = (state.budget ?? null) as Price | null;
  const theme = isTheme(state.theme) ? state.theme : null;
  const onboardingSeen = state.onboardingSeen === true;
  if (version < 2) {
    // Version 2 added the interface language; before it the app was Italian only.
    return { budget, language: null, theme, onboardingSeen };
  }
  return { budget, language: (state.language ?? null) as Language | null, theme, onboardingSeen };
}

/** User preferences. They stay in this browser and never travel in exports or shared links. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      budget: null,
      setBudget: (budget) => set({ budget }),
      language: null,
      setLanguage: (language) => set({ language }),
      theme: null,
      setTheme: (theme) => set({ theme }),
      onboardingSeen: false,
      setOnboardingSeen: (onboardingSeen) => set({ onboardingSeen }),
    }),
    {
      name: SETTINGS_KEY,
      version: SETTINGS_VERSION,
      partialize: (state) => ({
        budget: state.budget,
        language: state.language,
        theme: state.theme,
        onboardingSeen: state.onboardingSeen,
      }),
      migrate: migrateSettings,
    },
  ),
);
