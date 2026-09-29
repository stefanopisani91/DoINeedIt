import { useSettingsStore } from '@/storage/settings';
import { en } from './en';
import { it, type Copy } from './it';

export type { Copy } from './it';

export const LANGUAGES = ['it', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const COPY: Record<Language, Copy> = { it, en };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * The language the browser asks for, in the app's terms: Italian when any
 * preferred language is Italian, English otherwise.
 */
export function detectLanguage(preferred: readonly string[]): Language {
  return preferred.some((tag) => /^it\b/i.test(tag)) ? 'it' : 'en';
}

export function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages ?? (navigator.language ? [navigator.language] : []);
}

/** The language in use: the one chosen in the settings, or the browser's. */
export function resolveLanguage(chosen: Language | null, preferred = browserLanguages()): Language {
  return chosen ?? detectLanguage(preferred);
}

export function useLanguage(): Language {
  const chosen = useSettingsStore((state) => state.language);
  return resolveLanguage(chosen);
}

/** The user-facing copy in the language in use. */
export function useCopy(): Copy {
  return COPY[useLanguage()];
}

/** Paths of the static manifests, one per language. */
export function manifestFor(language: Language): string {
  return language === 'it' ? '/manifest.webmanifest' : '/manifest.en.webmanifest';
}
