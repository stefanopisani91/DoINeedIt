import type { CategoryId, Verdict } from '@/engine';
import { CATEGORY_IDS } from '@/data/categories';
import type { Item } from '@/storage/types';

/** How the library can be ordered. */
export type SortKey = 'recent' | 'score-desc' | 'score-asc' | 'price-desc' | 'price-asc';

export const SORT_KEYS: readonly SortKey[] = [
  'recent',
  'score-desc',
  'score-asc',
  'price-desc',
  'price-asc',
];

/** Search text, filters and sort of the library; it lives in the URL. */
export interface LibraryQuery {
  q: string;
  verdict: Verdict | 'all';
  category: CategoryId | 'all';
  sort: SortKey;
}

export const DEFAULT_QUERY: LibraryQuery = {
  q: '',
  verdict: 'all',
  category: 'all',
  sort: 'recent',
};

const VERDICT_VALUES: readonly Verdict[] = ['buy', 'wait', 'skip'];
const COMBINING_MARKS = /[̀-ͯ]/g;

function isVerdict(value: string): value is Verdict {
  return (VERDICT_VALUES as readonly string[]).includes(value);
}

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}

export function isSortKey(value: string): value is SortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

/** Reads the query from the URL (keys `q`, `v`, `c`, `sort`); unknown values fall back to the defaults. */
export function parseQuery(params: URLSearchParams): LibraryQuery {
  const verdict = params.get('v') ?? '';
  const category = params.get('c') ?? '';
  const sort = params.get('sort') ?? '';
  return {
    q: params.get('q') ?? '',
    verdict: isVerdict(verdict) ? verdict : DEFAULT_QUERY.verdict,
    category: isCategoryId(category) ? category : DEFAULT_QUERY.category,
    sort: isSortKey(sort) ? sort : DEFAULT_QUERY.sort,
  };
}

/** Writes the query for the URL, leaving out every default value so `/` stays clean. */
export function serializeQuery(query: LibraryQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q.trim() !== '') params.set('q', query.q);
  if (query.verdict !== DEFAULT_QUERY.verdict) params.set('v', query.verdict);
  if (query.category !== DEFAULT_QUERY.category) params.set('c', query.category);
  if (query.sort !== DEFAULT_QUERY.sort) params.set('sort', query.sort);
  return params;
}

/** True when nothing narrows or reorders the library; a blank search counts as nothing. */
export function isDefaultQuery(query: LibraryQuery): boolean {
  return (
    query.q.trim() === '' &&
    query.verdict === DEFAULT_QUERY.verdict &&
    query.category === DEFAULT_QUERY.category &&
    query.sort === DEFAULT_QUERY.sort
  );
}

/** Case and accent folding of one string, keeping its whitespace: the matchers build on it. */
function foldText(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

/** Lower case, without diacritics (NFD with the marks stripped), whitespace collapsed and trimmed. */
export function normalizeText(text: string): string {
  return foldText(text).replace(/\s+/g, ' ').trim();
}

/** The search words: normalized and split on whitespace, never empty. */
export function tokens(q: string): string[] {
  const normalized = normalizeText(q);
  return normalized === '' ? [] : normalized.split(' ');
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function searchable(item: Item, categoryLabel: (id: CategoryId) => string): string {
  return normalizeText(
    [item.title, item.note ?? '', hostOf(item.source.url), categoryLabel(item.category)].join(' '),
  );
}

function newestFirst(a: Item, b: Item): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

/** Items without a price go last whatever the direction; ties go to the newest. */
function byPrice(direction: 1 | -1): (a: Item, b: Item) => number {
  return (a, b) => {
    if (a.price && b.price) {
      return direction * (a.price.amount - b.price.amount) || newestFirst(a, b);
    }
    if (a.price) return -1;
    if (b.price) return 1;
    return newestFirst(a, b);
  };
}

const COMPARATORS: Record<SortKey, (a: Item, b: Item) => number> = {
  recent: newestFirst,
  'score-desc': (a, b) => b.result.score - a.result.score || newestFirst(a, b),
  'score-asc': (a, b) => a.result.score - b.result.score || newestFirst(a, b),
  'price-desc': byPrice(-1),
  'price-asc': byPrice(1),
};

/**
 * Filters and sorts the library. Every search token must appear (AND) in the
 * title, the note, the host of the source url or the category label in the
 * language in use, ignoring case and accents. The sort is stable and ties go
 * to the most recently evaluated item; prices are compared by amount, whatever
 * the currency. Never mutates `items`.
 */
export function applyQuery(
  items: readonly Item[],
  query: LibraryQuery,
  categoryLabel: (id: CategoryId) => string,
): Item[] {
  const words = tokens(query.q);
  return items
    .filter((item) => {
      if (query.verdict !== 'all' && item.result.verdict !== query.verdict) return false;
      if (query.category !== 'all' && item.category !== query.category) return false;
      if (words.length === 0) return true;
      const text = searchable(item, categoryLabel);
      return words.every((word) => text.includes(word));
    })
    .sort(COMPARATORS[query.sort]);
}

export function countByVerdict(items: readonly Item[]): Record<Verdict, number> {
  const counts: Record<Verdict, number> = { buy: 0, wait: 0, skip: 0 };
  for (const item of items) counts[item.result.verdict] += 1;
  return counts;
}

/** A run of text, marked when it matches one of the highlighted words. */
export interface TextSegment {
  text: string;
  match: boolean;
}

/**
 * Splits `text` into runs to render, marking the parts that match any of the
 * `highlight` words the way the search does (case and accents ignored). The
 * original characters are kept as they are; only the flags come from the
 * folded text.
 */
export function highlightText(text: string, highlight: readonly string[]): TextSegment[] {
  if (text === '') return [];
  const words = highlight.flatMap((word) => tokens(word));
  if (words.length === 0) return [{ text, match: false }];

  // Fold one code point at a time, remembering where each folded code point came from.
  const chars = Array.from(text);
  const origin: number[] = [];
  let folded = '';
  chars.forEach((char, index) => {
    const piece = foldText(char);
    for (let k = Array.from(piece).length; k > 0; k -= 1) origin.push(index);
    folded += piece;
  });
  // indexOf counts UTF-16 units: map each unit offset back to a folded code point.
  const pointAtUnit: number[] = [];
  let point = 0;
  for (const codePoint of Array.from(folded)) {
    for (let k = codePoint.length; k > 0; k -= 1) pointAtUnit.push(point);
    point += 1;
  }
  pointAtUnit.push(point);

  const matched: boolean[] = chars.map(() => false);
  for (const word of words) {
    let at = folded.indexOf(word);
    while (at !== -1) {
      const start = pointAtUnit[at] ?? point;
      const end = pointAtUnit[at + word.length] ?? point;
      for (let p = start; p < end; p += 1) {
        const index = origin[p];
        if (index !== undefined) matched[index] = true;
      }
      at = folded.indexOf(word, at + 1);
    }
  }

  const segments: TextSegment[] = [];
  chars.forEach((char, index) => {
    const match = matched[index] ?? false;
    const last = segments[segments.length - 1];
    if (last && last.match === match) last.text += char;
    else segments.push({ text: char, match });
  });
  return segments;
}
