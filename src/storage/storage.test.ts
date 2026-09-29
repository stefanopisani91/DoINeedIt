import { beforeEach, describe, expect, it } from 'vitest';
import { useItemsStore, STORAGE_KEY } from './store';
import { buildExport, parseImport } from './export';
import { EXAMPLE_ITEMS } from '@/data/examples';

describe('items store', () => {
  beforeEach(() => {
    useItemsStore.getState().clear();
  });

  it('persists items to localStorage and keeps the newest first', () => {
    const [a, b] = EXAMPLE_ITEMS;
    useItemsStore.getState().upsert({ ...a!, updatedAt: '2026-01-01T00:00:00.000Z' });
    useItemsStore.getState().upsert({ ...b!, updatedAt: '2026-02-01T00:00:00.000Z' });
    expect(useItemsStore.getState().items.map((x) => x.id)).toEqual([b!.id, a!.id]);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toContain(a!.id);
  });

  it('replaces an item with the same id', () => {
    const item = EXAMPLE_ITEMS[0]!;
    useItemsStore.getState().upsert(item);
    useItemsStore.getState().upsert({ ...item, title: 'Nuovo titolo' });
    expect(useItemsStore.getState().items).toHaveLength(1);
    expect(useItemsStore.getState().items[0]?.title).toBe('Nuovo titolo');
  });

  it('merges without duplicates and removes items', () => {
    const added = useItemsStore.getState().merge(EXAMPLE_ITEMS);
    expect(added).toBe(EXAMPLE_ITEMS.length);
    expect(useItemsStore.getState().merge(EXAMPLE_ITEMS)).toBe(0);
    useItemsStore.getState().remove(EXAMPLE_ITEMS[0]!.id);
    expect(useItemsStore.getState().items).toHaveLength(EXAMPLE_ITEMS.length - 1);
  });
});

describe('export / import', () => {
  it('round-trips through the export file format', () => {
    const file = buildExport(EXAMPLE_ITEMS);
    const outcome = parseImport(JSON.stringify(file));
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.items).toEqual(EXAMPLE_ITEMS);
      expect(outcome.skipped).toBe(0);
    }
  });

  it('keeps the valid items of a partially broken file', () => {
    const file = buildExport(EXAMPLE_ITEMS);
    const broken = { ...file, items: [...file.items, { id: 'x' }] };
    const outcome = parseImport(JSON.stringify(broken));
    expect(outcome).toMatchObject({ ok: true, skipped: 1 });
  });

  it('rejects garbage', () => {
    expect(parseImport('{')).toEqual({ ok: false, reason: 'invalid-json' });
    expect(parseImport('{"hello":1}')).toEqual({ ok: false, reason: 'invalid-format' });
    expect(parseImport('{"items":[{"id":"x"}]}')).toEqual({ ok: false, reason: 'invalid-format' });
  });
});
