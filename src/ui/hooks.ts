import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Question } from '@/engine';
import { categoriesIn, type Category } from '@/data/categories';
import { questionsIn } from '@/data/questions';
import { useCopy } from '@/i18n';
import { parseQuery, serializeQuery, type LibraryQuery } from '@/lib/library';

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

type PatchQuery = (partial: Partial<LibraryQuery>) => void;

/**
 * The library search, filters and sort, kept in the URL (`q`, `v`, `c`, `sort`)
 * so a reload or the back button finds the same view. Defaults are left out,
 * so the home stays at `/` until something changes, and every change replaces
 * the history entry instead of adding one.
 */
export function useLibraryQuery(): [LibraryQuery, PatchQuery, () => void] {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseQuery(params), [params]);
  const patch = useCallback<PatchQuery>(
    (partial) => {
      setParams((current) => serializeQuery({ ...parseQuery(current), ...partial }), {
        replace: true,
      });
    },
    [setParams],
  );
  const reset = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);
  return [query, patch, reset];
}
