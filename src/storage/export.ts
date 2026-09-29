import { exportFileSchema, itemSchema, type ExportFile } from './schema';
import { STORAGE_VERSION } from './store';
import type { Item } from './types';

export function buildExport(items: Item[]): ExportFile {
  return {
    app: 'doineedit',
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    items,
  };
}

export function exportFileName(date = new Date()): string {
  return `doineedit-${date.toISOString().slice(0, 10)}.json`;
}

export type ImportOutcome =
  | { ok: true; items: Item[]; skipped: number }
  | { ok: false; reason: 'invalid-json' | 'invalid-format' };

/** Parses an export file leniently: valid items are kept, broken ones are counted as skipped. */
export function parseImport(text: string): ImportOutcome {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  const strict = exportFileSchema.safeParse(data);
  if (strict.success) return { ok: true, items: strict.data.items as Item[], skipped: 0 };

  if (typeof data !== 'object' || data === null) return { ok: false, reason: 'invalid-format' };
  const maybeItems = (data as { items?: unknown }).items;
  if (!Array.isArray(maybeItems)) return { ok: false, reason: 'invalid-format' };
  const items: Item[] = [];
  let skipped = 0;
  for (const candidate of maybeItems) {
    const parsed = itemSchema.safeParse(candidate);
    if (parsed.success) items.push(parsed.data as Item);
    else skipped++;
  }
  if (items.length === 0) return { ok: false, reason: 'invalid-format' };
  return { ok: true, items, skipped };
}
