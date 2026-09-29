/**
 * Recognises Amazon product links in any marketplace, including the short
 * links produced by the Amazon app ("amzn.eu/d/…", "amzn.to/…") and the text
 * shared by the app, which contains a sentence followed by the link.
 */

export type ParsedLink =
  | { kind: 'product'; url: string; asin: string; marketplace: string; canonicalUrl: string }
  | { kind: 'short'; url: string }
  | { kind: 'wishlist'; url: string; marketplace: string; listId: string }
  | { kind: 'amazon-other'; url: string; marketplace: string }
  | { kind: 'other'; url: string }
  | { kind: 'invalid' };

const AMAZON_HOST = /(^|\.)amazon\.([a-z]{2,3}(\.[a-z]{2})?)$/i;
const SHORT_HOSTS = new Set(['amzn.eu', 'amzn.to', 'amzn.com', 'amzn.asia', 'a.co']);
const ASIN_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/product\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/d\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /[?&]asin=([A-Z0-9]{10})(?:&|$)/i,
];
const WISHLIST_PATTERN = /\/hz\/wishlist\/ls\/([A-Z0-9]+)/i;

/** Pulls the first http(s) URL out of free text, e.g. the text shared by the Amazon app. */
export function extractUrl(text: string): string | null {
  const match = /https?:\/\/[^\s<>"']+/i.exec(text.trim());
  if (match) return match[0].replace(/[),.;!?]+$/, '');
  const bare = /(?:^|\s)((?:www\.)?(?:amazon\.[a-z.]+|amzn\.[a-z]+)\/[^\s<>"']*)/i.exec(text);
  return bare?.[1] ? `https://${bare[1]}` : null;
}

export function marketplaceOf(hostname: string): string | null {
  const match = AMAZON_HOST.exec(hostname.toLowerCase());
  return match ? match[2]!.toLowerCase() : null;
}

export function isAmazonHost(hostname: string): boolean {
  return marketplaceOf(hostname) !== null;
}

export function isShortLinkHost(hostname: string): boolean {
  return SHORT_HOSTS.has(hostname.toLowerCase().replace(/^www\./, ''));
}

export function parseLink(input: string): ParsedLink {
  const raw = extractUrl(input);
  if (!raw) return { kind: 'invalid' };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { kind: 'invalid' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { kind: 'invalid' };

  if (isShortLinkHost(url.hostname)) return { kind: 'short', url: url.toString() };

  const marketplace = marketplaceOf(url.hostname);
  if (!marketplace) return { kind: 'other', url: url.toString() };

  for (const pattern of ASIN_PATTERNS) {
    const match = pattern.exec(url.pathname + url.search);
    if (match?.[1]) {
      const asin = match[1].toUpperCase();
      return {
        kind: 'product',
        url: url.toString(),
        asin,
        marketplace,
        canonicalUrl: `https://www.amazon.${marketplace}/dp/${asin}`,
      };
    }
  }

  const wishlist = WISHLIST_PATTERN.exec(url.pathname);
  if (wishlist?.[1]) {
    return { kind: 'wishlist', url: url.toString(), marketplace, listId: wishlist[1] };
  }

  return { kind: 'amazon-other', url: url.toString(), marketplace };
}
