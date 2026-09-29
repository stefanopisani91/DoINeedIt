import { useMemo } from 'react';
import type { Question } from '@/engine';
import { categoriesIn, type Category } from '@/data/categories';
import { questionsIn } from '@/data/questions';
import { useCopy } from '@/i18n';

/** The question bank in the language in use. */
export function useQuestions(): Question[] {
  const copy = useCopy();
  return useMemo(() => questionsIn(copy), [copy]);
}

/** The categories in the language in use. */
export function useCategories(): Category[] {
  const copy = useCopy();
  return useMemo(() => categoriesIn(copy), [copy]);
}
