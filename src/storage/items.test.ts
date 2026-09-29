/** @vitest-environment jsdom */
import { EXAMPLE_ITEMS } from '@/data/examples';
import { decodeShare, encodeShare } from '@/lib/share';
import { parseImport } from './export';
import { itemSchema } from './schema';
import { useItemsStore } from './store';
import type { Item } from './types';

const headphones = EXAMPLE_ITEMS.find((item) => item.id === 'example-headphones')!;
const airfryer = EXAMPLE_ITEMS.find((item) => item.id === 'example-airfryer')!;
const shoes = EXAMPLE_ITEMS.find((item) => item.id === 'example-shoes')!;

describe('the example items', () => {
  it('tell the whole story: one stopped impulse, one purchase, one still waiting', () => {
    expect(headphones.result.verdict).toBe('skip');
    expect(headphones.decision).toEqual({ outcome: 'skipped', at: '2026-09-20T09:30:00.000Z' });
    expect(shoes.result.verdict).toBe('buy');
    expect(shoes.decision).toMatchObject({ outcome: 'bought', price: { amount: 109.9 } });
    expect(airfryer.result.verdict).toBe('wait');
    expect(airfryer.decision).toBeUndefined();
    // Recorded the way the questionnaire does it: thirty days after the verdict.
    expect(airfryer.reconsiderAt).toBe('2026-10-16T09:30:00.000Z');
    expect(headphones.reconsiderAt).toBeUndefined();
  });

  it('pass the schema with the 2.0 fields', () => {
    for (const item of EXAMPLE_ITEMS) expect(itemSchema.safeParse(item).success).toBe(true);
  });
});

describe('items from other versions', () => {
  it('accepts a 1.x item without the 2.0 fields', () => {
    const { decision, reconsiderAt, ...legacy } = headphones;
    void decision;
    void reconsiderAt;
    const parsed = itemSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty('decision');
  });

  it('drops unknown keys instead of rejecting the item, so newer files still import', () => {
    const parsed = itemSchema.safeParse({ ...headphones, futureField: { anything: true } });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty('futureField');
  });

  it('does not cap the history in the schema: a long history never invalidates an item', () => {
    const entry = { at: headphones.updatedAt, score: 40, verdict: 'wait', answeredCount: 8 };
    const parsed = itemSchema.safeParse({ ...headphones, history: Array(15).fill(entry) });
    expect(parsed.success).toBe(true);
  });

  it('round-trips decision, reconsiderAt and history through a shared link and an export', () => {
    const item: Item = {
      ...airfryer,
      history: [
        { at: '2026-08-01T10:00:00.000Z', score: 62, verdict: 'wait', answeredCount: 12 },
        {
          at: '2026-07-01T10:00:00.000Z',
          score: 30,
          verdict: 'skip',
          answeredCount: 8,
          outcome: 'skipped',
        },
      ],
    };
    expect(decodeShare(encodeShare(item))).toEqual(item);
    const file = JSON.stringify({
      app: 'doineedit',
      version: 2,
      exportedAt: '2026-09-29T00:00:00.000Z',
      items: [item, shoes],
    });
    const imported = parseImport(file);
    expect(imported.ok && imported.items).toEqual([item, shoes]);
  });
});

describe('recording what happened after the verdict', () => {
  beforeEach(() => {
    useItemsStore.setState({ items: [] });
    useItemsStore.getState().merge(EXAMPLE_ITEMS);
  });

  const find = (id: string) => useItemsStore.getState().items.find((item) => item.id === id)!;

  it('setDecision records and removes the outcome without touching updatedAt or the order', () => {
    const before = useItemsStore.getState().items.map((item) => item.id);
    useItemsStore.getState().setDecision(airfryer.id, {
      outcome: 'bought',
      at: '2026-09-29T10:00:00.000Z',
    });
    expect(find(airfryer.id).decision).toEqual({
      outcome: 'bought',
      at: '2026-09-29T10:00:00.000Z',
    });
    expect(find(airfryer.id).updatedAt).toBe(airfryer.updatedAt);
    expect(useItemsStore.getState().items.map((item) => item.id)).toEqual(before);

    useItemsStore.getState().setDecision(airfryer.id, null);
    expect(find(airfryer.id)).not.toHaveProperty('decision');
  });

  it('setNote trims, removes an empty note and leaves updatedAt alone', () => {
    useItemsStore.getState().setNote(airfryer.id, '  Aspetto i saldi.  ');
    expect(find(airfryer.id).note).toBe('Aspetto i saldi.');
    expect(find(airfryer.id).updatedAt).toBe(airfryer.updatedAt);
    useItemsStore.getState().setNote(airfryer.id, '   ');
    expect(find(airfryer.id)).not.toHaveProperty('note');
  });

  it('ignores an unknown id', () => {
    const before = useItemsStore.getState().items;
    useItemsStore.getState().setDecision('missing', { outcome: 'bought', at: 'now' });
    useItemsStore.getState().setNote('missing', 'x');
    expect(useItemsStore.getState().items).toEqual(before);
  });
});
