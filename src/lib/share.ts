import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { itemSchema } from '@/storage/schema';
import type { Item } from '@/storage/types';

/**
 * A shared item travels entirely inside the URL fragment, so it never reaches
 * any server: the page reads it back from `location.hash`.
 */
export function encodeShare(item: Item): string {
  return compressToEncodedURIComponent(JSON.stringify(item));
}

export function decodeShare(fragment: string): Item | null {
  const payload = fragment.replace(/^#/, '');
  if (!payload) return null;
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    const parsed = itemSchema.safeParse(JSON.parse(json));
    return parsed.success ? (parsed.data as Item) : null;
  } catch {
    return null;
  }
}

export function shareUrl(item: Item, origin = window.location.origin): string {
  return `${origin}/i#${encodeShare(item)}`;
}
