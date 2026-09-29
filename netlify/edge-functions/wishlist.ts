import { isAmazonHost, parseLink } from '../../src/lib/amazon-url.ts';
import { parseWishlistHtml, type WishlistItem } from '../lib/wishlist-parser.ts';
import { fetchPage, type FetchedPage } from '../lib/fetch-page.ts';
import { resolveShortLink } from './preview.ts';

/**
 * GET /api/wishlist?url=<public Amazon wish list link>
 *
 * Reads the public list page once and returns the products it shows, so the
 * person can pick which ones to evaluate. Best effort: Amazon renders only
 * the first page of a list on the server, blocks automated readers now and
 * then, and private lists are not readable at all. Nothing is stored.
 *
 * Same constraints as the product preview: edge function (not serverless),
 * Amazon-only redirects, size and time limits.
 */

const CAPTCHA_ATTEMPTS = 3;

const ACCEPT_LANGUAGE: Record<string, string> = {
  it: 'it-IT,it;q=0.9,en;q=0.5',
  de: 'de-DE,de;q=0.9,en;q=0.5',
  fr: 'fr-FR,fr;q=0.9,en;q=0.5',
  es: 'es-ES,es;q=0.9,en;q=0.5',
  'co.uk': 'en-GB,en;q=0.9',
  com: 'en-US,en;q=0.9',
};

export type WishlistFailure =
  | 'invalid-url'
  | 'unsupported'
  | 'blocked'
  | 'private'
  | 'not-found'
  | 'unparsable'
  | 'unreachable';

export type WishlistResponse =
  | {
      ok: true;
      list: { title: string | null; url: string; marketplace: string; items: WishlistItem[] };
    }
  | { ok: false; reason: WishlistFailure };

const STATUS: Record<WishlistFailure, number> = {
  'invalid-url': 400,
  unsupported: 400,
  'not-found': 404,
  private: 403,
  blocked: 503,
  unparsable: 502,
  unreachable: 502,
};

function json(body: WishlistResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

type LoadOutcome =
  | { kind: 'list'; url: string; marketplace: string; title: string | null; items: WishlistItem[] }
  | { kind: Exclude<WishlistFailure, 'invalid-url'> };

async function loadList(startUrl: string, marketplace: string): Promise<LoadOutcome> {
  let page: FetchedPage;
  try {
    page = await fetchPage(startUrl, {
      allow: (url) => isAmazonHost(url.hostname),
      acceptLanguage: ACCEPT_LANGUAGE[marketplace] ?? 'en-US,en;q=0.9',
    });
  } catch {
    return { kind: 'unreachable' };
  }
  if (page.kind === 'resolved') return { kind: 'unreachable' };
  if (page.kind !== 'page') return { kind: page.kind };
  if (page.status === 404 || page.status === 410) return { kind: 'not-found' };
  if (page.status === 503) return { kind: 'blocked' };
  if (page.status >= 400) return { kind: 'unreachable' };

  const final = parseLink(page.url);
  if (final.kind !== 'wishlist') return { kind: 'unsupported' };
  const parsed = parseWishlistHtml(page.html, final.marketplace);
  if (!parsed.ok) return { kind: parsed.reason };
  return {
    kind: 'list',
    url: final.canonicalUrl,
    marketplace: final.marketplace,
    title: parsed.list.title,
    items: parsed.list.items,
  };
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return json({ ok: false, reason: 'invalid-url' }, 405);
  const target = new URL(request.url).searchParams.get('url') ?? '';
  let link = parseLink(target);
  if (link.kind === 'invalid') return json({ ok: false, reason: 'invalid-url' }, 400);
  if (link.kind === 'short') {
    const resolved = await resolveShortLink(link.url);
    if (resolved.kind !== 'link')
      return json({ ok: false, reason: resolved.kind }, STATUS[resolved.kind]);
    link = resolved.link;
  }
  if (link.kind !== 'wishlist') return json({ ok: false, reason: 'unsupported' }, 400);

  let outcome: LoadOutcome = { kind: 'blocked' };
  for (let attempt = 0; attempt < CAPTCHA_ATTEMPTS && outcome.kind === 'blocked'; attempt++) {
    outcome = await loadList(link.canonicalUrl, link.marketplace);
  }
  if (outcome.kind !== 'list')
    return json({ ok: false, reason: outcome.kind }, STATUS[outcome.kind]);
  const { title, url, marketplace: resolved, items } = outcome;
  return json({ ok: true, list: { title, url, marketplace: resolved, items } });
}

export const config = { path: '/api/wishlist' };
