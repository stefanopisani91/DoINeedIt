import {
  isAmazonHost,
  isShortLinkHost,
  parseLink,
  type ParsedLink,
} from '../../src/lib/amazon-url.ts';
import { parseAmazonHtml, type ParsedProduct } from '../lib/amazon-parser.ts';
import { parseOpenGraphHtml } from '../lib/og-parser.ts';
import { fetchPage, isPublicUrl, type FetchedPage } from '../lib/fetch-page.ts';

/**
 * GET /api/preview?url=<product link>
 *
 * Reads the public product page once, the way any link preview does, and
 * returns title, image and price. Nothing is stored.
 *
 * Amazon pages go through the dedicated parser; any other shop through its
 * Open Graph meta tags. This runs as an edge function on purpose: Amazon
 * answers requests coming from the usual serverless (AWS) address ranges
 * with a captcha page, while the edge network gets the real page. If a
 * captcha still shows up, the client falls back to manual entry.
 */

/** Amazon serves a captcha page now and then even to the edge; a fresh attempt usually gets through. */
const CAPTCHA_ATTEMPTS = 3;

const ACCEPT_LANGUAGE: Record<string, string> = {
  it: 'it-IT,it;q=0.9,en;q=0.5',
  de: 'de-DE,de;q=0.9,en;q=0.5',
  fr: 'fr-FR,fr;q=0.9,en;q=0.5',
  es: 'es-ES,es;q=0.9,en;q=0.5',
  'co.uk': 'en-GB,en;q=0.9',
  com: 'en-US,en;q=0.9',
};

export interface PreviewProduct extends ParsedProduct {
  /** Canonical product page, or the page that was read. */
  url: string;
  asin: string | null;
  marketplace: string | null;
  /** The shop the page belongs to, e.g. "amazon.it" or "mediaworld.it". */
  site: string;
}

export type PreviewFailure =
  'invalid-url' | 'unsupported' | 'blocked' | 'not-found' | 'unparsable' | 'unreachable';

export type PreviewResponse =
  | { ok: true; product: PreviewProduct }
  | { ok: false; reason: PreviewFailure }
  /** The link is (or leads to) an Amazon wish list, which has its own import. */
  | { ok: false; reason: 'wishlist'; url: string };

const STATUS: Record<PreviewFailure | 'wishlist', number> = {
  'invalid-url': 400,
  unsupported: 400,
  wishlist: 400,
  'not-found': 404,
  blocked: 503,
  unparsable: 502,
  unreachable: 502,
};

function json(body: PreviewResponse, status = 200, cacheable = false): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheable ? 'public, max-age=3600' : 'no-store',
    },
  });
}

export function siteOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

type LoadOutcome =
  | { kind: 'product'; url: string; product: ParsedProduct }
  | { kind: 'wishlist'; url: string }
  | { kind: 'unsupported' | 'unreachable' | 'not-found' | 'blocked' | 'unparsable' };

function statusOutcome(page: FetchedPage): LoadOutcome | null {
  if (page.kind === 'resolved') return { kind: 'unreachable' };
  if (page.kind !== 'page') return { kind: page.kind };
  if (page.status === 404 || page.status === 410) return { kind: 'not-found' };
  if (page.status === 503) return { kind: 'blocked' };
  if (page.status >= 400) return { kind: 'unreachable' };
  return null;
}

/**
 * Turns a short link ("amzn.eu/d/…") into the Amazon link it points to,
 * without reading any page: the shorteners answer with a redirect, sometimes
 * written inside a page. The page is then read the way a pasted product
 * link is (canonical URL, marketplace language), not through the tracking
 * URL the apps share, which Amazon treats differently.
 */
export async function resolveShortLink(
  url: string,
): Promise<{ kind: 'link'; link: ParsedLink } | { kind: 'unsupported' | 'unreachable' }> {
  let page: FetchedPage;
  try {
    page = await fetchPage(url, {
      allow: (target) => isAmazonHost(target.hostname) || isShortLinkHost(target.hostname),
      acceptLanguage: 'en-US,en;q=0.9',
      followClientRedirects: (target) => isShortLinkHost(target.hostname),
      stopAt: (target) => isAmazonHost(target.hostname),
    });
  } catch {
    return { kind: 'unreachable' };
  }
  if (page.kind === 'resolved') return { kind: 'link', link: parseLink(page.url) };
  if (page.kind === 'page') return { kind: page.status === 404 ? 'unsupported' : 'unreachable' };
  return { kind: page.kind };
}

/** One attempt at an Amazon page: follow Amazon-only redirects, then parse. */
async function loadAmazon(startUrl: string, marketplace: string | null): Promise<LoadOutcome> {
  let page: FetchedPage;
  try {
    page = await fetchPage(startUrl, {
      allow: (url) => isAmazonHost(url.hostname),
      acceptLanguage: ACCEPT_LANGUAGE[marketplace ?? ''] ?? 'en-US,en;q=0.9',
    });
  } catch {
    return { kind: 'unreachable' };
  }
  const early = statusOutcome(page);
  if (early || page.kind !== 'page') return early ?? { kind: 'unreachable' };
  if (parseLink(page.url).kind === 'wishlist') return { kind: 'wishlist', url: page.url };

  const parsed = parseAmazonHtml(page.html);
  if (!parsed.ok) return { kind: parsed.reason };
  return { kind: 'product', url: page.url, product: parsed.product };
}

/** Any other shop: public hosts only, HTML only, Open Graph tags, in the person's language. */
async function loadStore(startUrl: string, acceptLanguage: string): Promise<LoadOutcome> {
  let page: FetchedPage;
  try {
    page = await fetchPage(startUrl, { allow: isPublicUrl, acceptLanguage });
  } catch {
    return { kind: 'unreachable' };
  }
  const early = statusOutcome(page);
  if (early || page.kind !== 'page') return early ?? { kind: 'unreachable' };
  if (!/text\/html|application\/xhtml\+xml/i.test(page.contentType)) return { kind: 'unparsable' };
  // A shop link that lands on Amazon is an Amazon product after all.
  if (isAmazonHost(new URL(page.url).hostname)) {
    if (parseLink(page.url).kind === 'wishlist') return { kind: 'wishlist', url: page.url };
    const amazon = parseAmazonHtml(page.html);
    if (amazon.ok) return { kind: 'product', url: page.url, product: amazon.product };
  }
  const parsed = parseOpenGraphHtml(page.html, page.url);
  if (!parsed.ok) return { kind: parsed.reason };
  const { title, imageUrl, price } = parsed.product;
  return { kind: 'product', url: page.url, product: { title, imageUrl, price } };
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
    if (link.kind === 'invalid' || link.kind === 'short' || link.kind === 'other') {
      return json({ ok: false, reason: 'unsupported' }, STATUS.unsupported);
    }
  }
  if (link.kind === 'wishlist') {
    return json({ ok: false, reason: 'wishlist', url: link.canonicalUrl }, STATUS.wishlist);
  }

  let outcome: LoadOutcome;
  if (link.kind === 'other') {
    const acceptLanguage = request.headers.get('accept-language') || 'en-US,en;q=0.9';
    outcome = await loadStore(link.url, acceptLanguage);
  } else {
    const marketplace =
      link.kind === 'product' || link.kind === 'amazon-other' ? link.marketplace : null;
    const startUrl = link.kind === 'product' ? link.canonicalUrl : link.url;
    outcome = { kind: 'blocked' };
    for (let attempt = 0; attempt < CAPTCHA_ATTEMPTS && outcome.kind === 'blocked'; attempt++) {
      outcome = await loadAmazon(startUrl, marketplace);
    }
  }

  if (outcome.kind === 'wishlist') {
    const list = parseLink(outcome.url);
    const url = list.kind === 'wishlist' ? list.canonicalUrl : outcome.url;
    return json({ ok: false, reason: 'wishlist', url }, STATUS.wishlist);
  }
  if (outcome.kind !== 'product') {
    return json({ ok: false, reason: outcome.kind }, STATUS[outcome.kind]);
  }

  // The final URL may reveal the ASIN of a short link.
  const finalLink = parseLink(outcome.url);
  const resolved = finalLink.kind === 'product' ? finalLink : link.kind === 'product' ? link : null;
  const marketplace =
    resolved?.marketplace ??
    (finalLink.kind === 'amazon-other'
      ? finalLink.marketplace
      : link.kind === 'amazon-other'
        ? link.marketplace
        : null);
  return json(
    {
      ok: true,
      product: {
        ...outcome.product,
        url: resolved?.canonicalUrl ?? outcome.url,
        asin: resolved?.asin ?? null,
        marketplace,
        site: siteOf(resolved?.canonicalUrl ?? outcome.url),
      },
    },
    200,
    true,
  );
}

export const config = { path: '/api/preview' };
