import { describe, expect, it } from 'vitest';
import type { CategoryId, Verdict } from '@/engine';
import { EXAMPLE_ITEMS } from '@/data/examples';
import { CATEGORIES } from '@/data/categories';
import type { Item, Price } from '@/storage/types';
import {
  applyQuery,
  countByVerdict,
  DEFAULT_QUERY,
  highlightText,
  isDefaultQuery,
  normalizeText,
  parseQuery,
  serializeQuery,
  tokens,
  type LibraryQuery,
} from './library';

const base = EXAMPLE_ITEMS[0]!;

interface Overrides {
  title?: string;
  note?: string;
  url?: string;
  category?: CategoryId;
  verdict?: Verdict;
  score?: number;
  price?: Price;
  updatedAt?: string;
}

/** A minimal item on top of an example: no note, price or decision unless given. */
function item(id: string, over: Overrides = {}): Item {
  const next: Item = {
    ...base,
    id,
    title: over.title ?? 'Oggetto',
    category: over.category ?? 'other',
    updatedAt: over.updatedAt ?? '2026-09-10T10:00:00.000Z',
    source: { url: over.url ?? 'https://shop.example/p/1' },
    result: {
      ...base.result,
      verdict: over.verdict ?? 'wait',
      score: over.score ?? 50,
    },
  };
  delete next.note;
  delete next.price;
  delete next.decision;
  delete next.reconsiderAt;
  if (over.note !== undefined) next.note = over.note;
  if (over.price !== undefined) next.price = over.price;
  return next;
}

const label = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
const eur = (amount: number): Price => ({ amount, currency: 'EUR' });
const ids = (items: Item[]) => items.map((x) => x.id);

describe('parseQuery and serializeQuery', () => {
  it('reads the defaults from an empty URL and writes nothing for them', () => {
    expect(parseQuery(new URLSearchParams())).toEqual(DEFAULT_QUERY);
    expect(serializeQuery(DEFAULT_QUERY).toString()).toBe('');
    expect(isDefaultQuery(DEFAULT_QUERY)).toBe(true);
  });

  it('round-trips a full query and omits only the default values', () => {
    const query: LibraryQuery = {
      q: 'cuffie blu',
      verdict: 'skip',
      category: 'tech',
      sort: 'price-asc',
    };
    const params = serializeQuery(query);
    expect(params.get('q')).toBe('cuffie blu');
    expect(params.get('v')).toBe('skip');
    expect(params.get('c')).toBe('tech');
    expect(params.get('sort')).toBe('price-asc');
    expect(parseQuery(params)).toEqual(query);
    expect(isDefaultQuery(query)).toBe(false);

    const partial: LibraryQuery = { ...DEFAULT_QUERY, verdict: 'buy' };
    expect(serializeQuery(partial).toString()).toBe('v=buy');
    expect(parseQuery(serializeQuery(partial))).toEqual(partial);
  });

  it('falls back to the defaults for unknown values', () => {
    const params = new URLSearchParams('v=maybe&c=toys&sort=alphabetical');
    expect(parseQuery(params)).toEqual(DEFAULT_QUERY);
  });

  it('treats a blank search as no search', () => {
    const query: LibraryQuery = { ...DEFAULT_QUERY, q: '   ' };
    expect(serializeQuery(query).has('q')).toBe(false);
    expect(isDefaultQuery(query)).toBe(true);
    expect(isDefaultQuery({ ...DEFAULT_QUERY, sort: 'score-desc' })).toBe(false);
  });
});

describe('normalizeText and tokens', () => {
  it('lowers the case, strips accents and collapses whitespace', () => {
    expect(normalizeText('  Caffè   Latte\tÀ la carte ')).toBe('caffe latte a la carte');
  });

  it('splits into words and never yields empty tokens', () => {
    expect(tokens('  Cuffie  Bluetooth ')).toEqual(['cuffie', 'bluetooth']);
    expect(tokens('')).toEqual([]);
    expect(tokens('   ')).toEqual([]);
  });
});

describe('applyQuery', () => {
  const coffee = item('coffee', { title: 'Macchina per il Caffè', category: 'kitchen' });
  const headphones = item('headphones', {
    title: 'Cuffie Bluetooth',
    url: 'https://www.amazon.it/dp/B0EXAMPLE1',
    category: 'tech',
    note: 'Viste in un video',
  });
  const earbuds = item('earbuds', { title: 'Cuffie con filo', category: 'tech' });
  const all = [coffee, headphones, earbuds];
  const search = (q: string) => ids(applyQuery(all, { ...DEFAULT_QUERY, q }, label));

  it('ignores accents in both the search and the title', () => {
    expect(search('caffe')).toEqual(['coffee']);
    expect(search('CAFFÈ')).toEqual(['coffee']);
  });

  it('requires every token (AND)', () => {
    expect(search('cuffie')).toEqual(['headphones', 'earbuds']);
    expect(search('cuffie bluetooth')).toEqual(['headphones']);
    expect(search('cuffie caffe')).toEqual([]);
  });

  it('searches the host of the source url, the note and the category label', () => {
    expect(search('amazon')).toEqual(['headphones']);
    expect(search('video')).toEqual(['headphones']);
    expect(search('tecnologia')).toEqual(['headphones', 'earbuds']);
    expect(search('cucina')).toEqual(['coffee']);
  });

  it('filters by verdict and by category', () => {
    const items = [
      item('a', { verdict: 'buy', category: 'tech' }),
      item('b', { verdict: 'skip', category: 'tech' }),
      item('c', { verdict: 'skip', category: 'home' }),
    ];
    expect(ids(applyQuery(items, { ...DEFAULT_QUERY, verdict: 'skip' }, label))).toEqual([
      'b',
      'c',
    ]);
    expect(ids(applyQuery(items, { ...DEFAULT_QUERY, category: 'tech' }, label))).toEqual([
      'a',
      'b',
    ]);
    expect(
      ids(applyQuery(items, { ...DEFAULT_QUERY, verdict: 'skip', category: 'tech' }, label)),
    ).toEqual(['b']);
  });

  it('does not mutate the input', () => {
    const items = [item('a', { score: 10 }), item('b', { score: 90 })];
    applyQuery(items, { ...DEFAULT_QUERY, sort: 'score-desc' }, label);
    expect(ids(items)).toEqual(['a', 'b']);
  });
});

describe('applyQuery sorting', () => {
  const old = item('old', { score: 70, price: eur(30), updatedAt: '2026-09-01T00:00:00.000Z' });
  const mid = item('mid', { score: 70, price: eur(10), updatedAt: '2026-09-05T00:00:00.000Z' });
  const fresh = item('new', { score: 20, price: eur(20), updatedAt: '2026-09-09T00:00:00.000Z' });
  const unpricedOld = item('free-old', { score: 40, updatedAt: '2026-09-02T00:00:00.000Z' });
  const unpricedNew = item('free-new', { score: 40, updatedAt: '2026-09-08T00:00:00.000Z' });
  const items = [old, unpricedOld, fresh, mid, unpricedNew];
  const sorted = (sort: LibraryQuery['sort']) =>
    ids(applyQuery(items, { ...DEFAULT_QUERY, sort }, label));

  it('puts the most recent first by default', () => {
    expect(sorted('recent')).toEqual(['new', 'free-new', 'mid', 'free-old', 'old']);
  });

  it('sorts by score, breaking ties with the most recent first', () => {
    expect(sorted('score-desc')).toEqual(['mid', 'old', 'free-new', 'free-old', 'new']);
    expect(sorted('score-asc')).toEqual(['new', 'free-new', 'free-old', 'mid', 'old']);
  });

  it('sorts by price with the unpriced items last, most recent first among them', () => {
    expect(sorted('price-desc')).toEqual(['old', 'new', 'mid', 'free-new', 'free-old']);
    expect(sorted('price-asc')).toEqual(['mid', 'new', 'old', 'free-new', 'free-old']);
  });

  it('is stable for equal keys', () => {
    const twins = [
      item('first', { score: 50, updatedAt: '2026-09-05T00:00:00.000Z' }),
      item('second', { score: 50, updatedAt: '2026-09-05T00:00:00.000Z' }),
    ];
    expect(ids(applyQuery(twins, { ...DEFAULT_QUERY, sort: 'score-desc' }, label))).toEqual([
      'first',
      'second',
    ]);
  });
});

describe('countByVerdict', () => {
  it('counts every verdict, zero included', () => {
    expect(countByVerdict([])).toEqual({ buy: 0, wait: 0, skip: 0 });
    expect(
      countByVerdict([
        item('a', { verdict: 'buy' }),
        item('b', { verdict: 'skip' }),
        item('c', { verdict: 'skip' }),
      ]),
    ).toEqual({ buy: 1, wait: 0, skip: 2 });
  });
});

describe('highlightText', () => {
  it('returns the whole text unmarked without words', () => {
    expect(highlightText('Cuffie', [])).toEqual([{ text: 'Cuffie', match: false }]);
    expect(highlightText('Cuffie', ['  '])).toEqual([{ text: 'Cuffie', match: false }]);
    expect(highlightText('', ['a'])).toEqual([]);
  });

  it('marks matches ignoring case and accents, keeping the original characters', () => {
    expect(highlightText('Caffè freddo', ['caffe'])).toEqual([
      { text: 'Caffè', match: true },
      { text: ' freddo', match: false },
    ]);
    expect(highlightText('Cuffie Bluetooth', ['BLUE'])).toEqual([
      { text: 'Cuffie ', match: false },
      { text: 'Blue', match: true },
      { text: 'tooth', match: false },
    ]);
  });

  it('marks every occurrence of every word and merges adjacent runs', () => {
    expect(highlightText('Tazza da tè, tazza grande', ['tazza', 'te'])).toEqual([
      { text: 'Tazza', match: true },
      { text: ' da ', match: false },
      { text: 'tè', match: true },
      { text: ', ', match: false },
      { text: 'tazza', match: true },
      { text: ' grande', match: false },
    ]);
    expect(highlightText('abcd', ['ab', 'cd'])).toEqual([{ text: 'abcd', match: true }]);
  });

  it('keeps characters outside the basic plane aligned', () => {
    expect(highlightText('🎧 Cuffie', ['cuffie'])).toEqual([
      { text: '🎧 ', match: false },
      { text: 'Cuffie', match: true },
    ]);
  });
});
