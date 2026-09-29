import { isAmazonHost, isShortLinkHost, parseLink } from '../../src/lib/amazon-url.ts';
import { parseAmazonHtml, type ParsedProduct } from '../lib/amazon-parser.ts';

/**
 * GET /api/preview?url=<amazon link>
 *
 * Reads the public product page once, the way any link preview does, and
 * returns title, image and price. Nothing is stored.
 *
 * This runs as an edge function on purpose: Amazon answers requests coming
 * from the usual serverless (AWS) address ranges with a captcha page, while
 * the edge network gets the real page. If a captcha still shows up, the
 * client falls back to manual entry.
 */

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
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

export type PreviewResponse =
  | {
      ok: true;
      product: ParsedProduct & { url: string; asin: string | null; marketplace: string | null };
    }
  | {
      ok: false;
      reason:
        'invalid-url' | 'unsupported' | 'blocked' | 'not-found' | 'unparsable' | 'unreachable';
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

function browserHeaders(marketplace: string | null): HeadersInit {
  return {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': ACCEPT_LANGUAGE[marketplace ?? ''] ?? 'en-US,en;q=0.9',
    'upgrade-insecure-requests': '1',
  };
}

async function readBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return await response.text();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.byteLength;
    if (total >= MAX_BODY_BYTES) {
      await reader.cancel();
      break;
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8').decode(merged);
}

/** Follows redirects manually so the function never fetches a host outside Amazon. */
async function fetchAmazonPage(startUrl: string, marketplace: string | null) {
  let current = new URL(startUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAmazonHost(current.hostname) && !isShortLinkHost(current.hostname)) {
      return { kind: 'unsupported' as const };
    }
    const response = await fetch(current, {
      headers: browserHeaders(marketplace),
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) return { kind: 'unreachable' as const };
      current = new URL(location, current);
      continue;
    }
    return { kind: 'page' as const, url: current.toString(), status: response.status, response };
  }
  return { kind: 'unreachable' as const };
}

type LoadOutcome =
  | { kind: 'product'; page: { url: string }; parsed: { product: ParsedProduct } }
  | { kind: 'unsupported' | 'unreachable' | 'not-found' | 'blocked' | 'unparsable' };

/** One attempt: fetch the page (following Amazon-only redirects) and parse it. */
async function loadProduct(startUrl: string, marketplace: string | null): Promise<LoadOutcome> {
  let page: Awaited<ReturnType<typeof fetchAmazonPage>>;
  try {
    page = await fetchAmazonPage(startUrl, marketplace);
  } catch {
    return { kind: 'unreachable' };
  }
  if (page.kind !== 'page') return { kind: page.kind };
  if (page.status === 404) return { kind: 'not-found' };
  if (page.status === 503) return { kind: 'blocked' };
  if (page.status >= 400) return { kind: 'unreachable' };

  const parsed = parseAmazonHtml(await readBody(page.response));
  if (!parsed.ok) return { kind: parsed.reason };
  return { kind: 'product', page: { url: page.url }, parsed };
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return json({ ok: false, reason: 'invalid-url' }, 405);
  const target = new URL(request.url).searchParams.get('url') ?? '';
  const link = parseLink(target);
  if (link.kind === 'invalid' || link.kind === 'other') {
    return json(
      { ok: false, reason: link.kind === 'invalid' ? 'invalid-url' : 'unsupported' },
      400,
    );
  }
  if (link.kind === 'wishlist') return json({ ok: false, reason: 'unsupported' }, 400);

  const marketplace =
    link.kind === 'product' || link.kind === 'amazon-other' ? link.marketplace : null;
  const startUrl = link.kind === 'product' ? link.canonicalUrl : link.url;

  let outcome: Awaited<ReturnType<typeof loadProduct>> = { kind: 'blocked' };
  for (let attempt = 0; attempt < CAPTCHA_ATTEMPTS && outcome.kind === 'blocked'; attempt++) {
    outcome = await loadProduct(startUrl, marketplace);
  }
  if (outcome.kind !== 'product') {
    const status =
      outcome.kind === 'unsupported'
        ? 400
        : outcome.kind === 'not-found'
          ? 404
          : outcome.kind === 'blocked'
            ? 503
            : 502;
    return json({ ok: false, reason: outcome.kind }, status);
  }
  const { page, parsed } = outcome;

  // The final URL may reveal the ASIN of a short link.
  const finalLink = parseLink(page.url);
  const resolved = finalLink.kind === 'product' ? finalLink : link.kind === 'product' ? link : null;
  return json(
    {
      ok: true,
      product: {
        ...parsed.product,
        url: resolved?.canonicalUrl ?? page.url,
        asin: resolved?.asin ?? null,
        marketplace: resolved?.marketplace ?? marketplace,
      },
    },
    200,
    true,
  );
}

export const config = { path: '/api/preview' };
