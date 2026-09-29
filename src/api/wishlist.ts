import type { WishlistResponse } from '../../netlify/edge-functions/wishlist.ts';

export type WishlistOutcome = WishlistResponse | { ok: false; reason: 'network' };

const CLIENT_TIMEOUT_MS = 30_000;

/** Asks the wish list function for the products of a public list; never throws. */
export async function fetchWishlist(url: string, signal?: AbortSignal): Promise<WishlistOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    const response = await fetch(`/api/wishlist?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    return (await response.json()) as WishlistResponse;
  } catch {
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
