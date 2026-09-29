/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest';
import { migrateItems, useItemsStore, STORAGE_KEY } from './store';
import { SETTINGS_KEY, migrateSettings, useSettingsStore } from './settings';
import { buildExport, parseImport } from './export';
import { EXAMPLE_ITEMS } from '@/data/examples';
import type { Item } from './types';

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

/** An item as version 1 stored it: no monthly budget and no budget component in the result. */
function asVersion1(item: Item): Record<string, unknown> {
  const { result, ...rest } = item;
  const legacyResult: Record<string, unknown> = { ...result };
  delete legacyResult['budget'];
  const legacy: Record<string, unknown> = { ...rest, result: legacyResult };
  delete legacy['budget'];
  return legacy;
}

describe('migration', () => {
  it('adds the budget component to results stored before version 2', () => {
    const migrated = migrateItems({ items: [asVersion1(EXAMPLE_ITEMS[0]!)] }, 1);
    expect(migrated.items[0]?.result.budget).toBeNull();
    expect(migrated.items[0]?.budget).toBeUndefined();
    expect(migrateItems(undefined, 1)).toEqual({ items: [] });
  });

  it('accepts export files written before the budget criterion', () => {
    const file = buildExport(EXAMPLE_ITEMS);
    const old = { ...file, version: 1, items: EXAMPLE_ITEMS.map(asVersion1) };
    const outcome = parseImport(JSON.stringify(old));
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.items[0]?.result.budget).toBeNull();
      expect(outcome.items[0]?.budget).toBeUndefined();
    }
  });
});

describe('settings store', () => {
  it('persists the monthly budget', () => {
    useSettingsStore.getState().setBudget({ amount: 300, currency: 'EUR' });
    expect(window.localStorage.getItem(SETTINGS_KEY)).toContain('300');
    useSettingsStore.getState().setBudget(null);
    expect(useSettingsStore.getState().budget).toBeNull();
  });

  it('persists the interface language, or the choice to follow the browser', () => {
    useSettingsStore.getState().setLanguage('en');
    expect(window.localStorage.getItem(SETTINGS_KEY)).toContain('"language":"en"');
    useSettingsStore.getState().setLanguage(null);
    expect(useSettingsStore.getState().language).toBeNull();
  });

  it('migrates settings stored before the language existed', () => {
    expect(migrateSettings({ budget: { amount: 300, currency: 'EUR' } }, 1)).toEqual({
      budget: { amount: 300, currency: 'EUR' },
      language: null,
    });
    expect(migrateSettings(undefined, 1)).toEqual({ budget: null, language: null });
    expect(migrateSettings({ budget: null, language: 'en' }, 2)).toEqual({
      budget: null,
      language: 'en',
    });
  });
});
