import { isAmazonHost, parseLink } from '../../src/lib/amazon-url.ts';
import { parseWishlistHtml, type WishlistItem } from '../lib/wishlist-parser.ts';
import { fetchPage, type FetchedPage } from '../lib/fetch-page.ts';
import { resolveShortLink } from './preview.ts';

/**
 * GET /api/wishlist?url=<public Amazon wish list link>
 *
 * Reads a public list and returns its products, so the person can pick which
 * ones to evaluate. Amazon renders ten items per page and serves the rest
 * through a "show more" url found in each page: the function follows that
 * chain until the list ends, within a time budget, and says whether it got
 * to the end. Best effort: Amazon blocks automated readers now and then,
 * private lists are not readable at all. Nothing is stored.
 *
 * Same constraints as the product preview: edge function (not serverless),
 * Amazon-only redirects, size and time limits.
 */

const CAPTCHA_ATTEMPTS = 3;
/** Pages of ten items each; with the time budget below this is the cap on a huge list. */
const MAX_PAGES = 50;
/** Wall-clock budget for the whole read: the client waits, and the edge has its own limit. */
const TIME_BUDGET_MS = 25_000;

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

export interface WishlistList {
  title: string | null;
  url: string;
  marketplace: string;
  items: WishlistItem[];
  /** False when the list goes on but reading stopped (blocked, time, size). */
  complete: boolean;
}

export type WishlistResponse =
  { ok: true; list: WishlistList } | { ok: false; reason: WishlistFailure };

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

type PageOutcome =
  { kind: 'page'; url: string; html: string } | { kind: Exclude<WishlistFailure, 'invalid-url'> };

/** Fetches one list page or "show more" fragment, staying on Amazon hosts. */
async function fetchListPage(url: string, marketplace: string): Promise<PageOutcome> {
  let page: FetchedPage;
  try {
    page = await fetchPage(url, {
      allow: (target) => isAmazonHost(target.hostname),
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
  return { kind: 'page', url: page.url, html: page.html };
}

type LoadOutcome =
  { kind: 'list'; list: WishlistList } | { kind: Exclude<WishlistFailure, 'invalid-url'> };

/** The first page, with the usual retries in front of a captcha. */
async function loadFirstPage(link: {
  canonicalUrl: string;
  marketplace: string;
}): Promise<
  | { kind: 'list'; title: string | null; items: WishlistItem[]; next: string | null; url: string }
  | { kind: Exclude<WishlistFailure, 'invalid-url'> }
> {
  let outcome: PageOutcome = { kind: 'blocked' };
  let parsed: ReturnType<typeof parseWishlistHtml> = { ok: false, reason: 'blocked' };
  for (let attempt = 0; attempt < CAPTCHA_ATTEMPTS; attempt++) {
    outcome = await fetchListPage(link.canonicalUrl, link.marketplace);
    if (outcome.kind !== 'page') {
      if (outcome.kind === 'blocked') continue;
      return { kind: outcome.kind };
    }
    if (parseLink(outcome.url).kind !== 'wishlist') return { kind: 'unsupported' };
    parsed = parseWishlistHtml(outcome.html, link.marketplace);
    if (parsed.ok || parsed.reason !== 'blocked') break;
  }
  if (outcome.kind !== 'page') return { kind: outcome.kind };
  if (!parsed.ok) return { kind: parsed.reason === 'empty' ? 'unparsable' : parsed.reason };
  return {
    kind: 'list',
    title: parsed.list.title,
    items: parsed.list.items,
    next: parsed.list.nextPageUrl,
    url: outcome.url,
  };
}

async function loadList(link: { canonicalUrl: string; marketplace: string }): Promise<LoadOutcome> {
  const started = Date.now();
  const first = await loadFirstPage(link);
  if (first.kind !== 'list') return { kind: first.kind };

  const seen = new Set(first.items.map((item) => item.asin));
  const items = [...first.items];
  let next = first.next;
  let complete = next === null;
  let pageUrl = first.url;
  for (let page = 1; next && page < MAX_PAGES; page++) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    let target: string;
    try {
      target = new URL(next, pageUrl).toString();
    } catch {
      break;
    }
    const outcome = await fetchListPage(target, link.marketplace);
    if (outcome.kind !== 'page') break;
    const parsed = parseWishlistHtml(outcome.html, link.marketplace);
    if (!parsed.ok) {
      // A readable page without products is the end of the list.
      complete = parsed.reason === 'empty';
      break;
    }
    const fresh = parsed.list.items.filter((item) => !seen.has(item.asin));
    for (const item of fresh) {
      seen.add(item.asin);
      items.push(item);
    }
    pageUrl = outcome.url;
    next = fresh.length > 0 ? parsed.list.nextPageUrl : null;
    complete = next === null;
  }

  return {
    kind: 'list',
    list: {
      title: first.title,
      url: link.canonicalUrl,
      marketplace: link.marketplace,
      items,
      complete,
    },
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

  const outcome = await loadList(link);
  if (outcome.kind !== 'list')
    return json({ ok: false, reason: outcome.kind }, STATUS[outcome.kind]);
  return json({ ok: true, list: outcome.list });
}

export const config = { path: '/api/wishlist' };
