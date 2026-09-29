/**
 * Recognises Amazon links in any marketplace: product pages in every url
 * shape, the short links produced by the Amazon apps ("amzn.eu/d/…",
 * "a.co/d/…", "amzn.to/…") and public wish lists. It also pulls the link out
 * of the text the apps share, which is a sentence followed by the link.
 *
 * This module is the only source of truth for what an Amazon link is: the
 * edge functions import it too.
 */

export type ParsedLink =
  | { kind: 'product'; url: string; asin: string; marketplace: string; canonicalUrl: string }
  | { kind: 'short'; url: string }
  | { kind: 'wishlist'; url: string; marketplace: string; listId: string; canonicalUrl: string }
  | { kind: 'amazon-other'; url: string; marketplace: string }
  | { kind: 'other'; url: string }
  | { kind: 'invalid' };

const AMAZON_HOST = /(^|\.)amazon\.([a-z]{2,3}(\.[a-z]{2})?)$/i;
const SHORT_HOSTS = new Set(['amzn.eu', 'amzn.to', 'amzn.com', 'amzn.asia', 'amzn.in', 'a.co']);
const ASIN_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/gp\/offer-listing\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/product\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/d\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  /[?&]asin=([A-Z0-9]{10})(?:&|$)/i,
];
const WISHLIST_PATTERNS = [
  /\/hz\/wishlist\/ls\/([A-Z0-9]+)/i,
  /\/hz\/wishlist\/dl\/invite\/([A-Z0-9]+)/i,
  /\/(?:gp\/)?registry\/wishlist\/([A-Z0-9]+)/i,
];

/** Characters that end a sentence and stick to a link pasted from a chat or a share sheet. */
const TRAILING_PUNCTUATION = /[),.;:!?»”’'"]+$/;

/** Pulls the first http(s) URL out of free text, e.g. the text shared by the Amazon app. */
export function extractUrl(text: string): string | null {
  const match = /https?:\/\/[^\s<>"'«»“”‘’]+/i.exec(text.trim());
  if (match) return match[0].replace(TRAILING_PUNCTUATION, '');
  const bare =
    /(?:^|[\s«“‘"'(])((?:www\.)?(?:amazon\.[a-z.]+|amzn\.[a-z]+|a\.co)\/[^\s<>"'«»“”‘’]*)/i.exec(
      text,
    );
  return bare?.[1] ? `https://${bare[1].replace(TRAILING_PUNCTUATION, '')}` : null;
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

  for (const pattern of WISHLIST_PATTERNS) {
    const match = pattern.exec(url.pathname);
    if (match?.[1]) {
      const listId = match[1].toUpperCase();
      return {
        kind: 'wishlist',
        url: url.toString(),
        marketplace,
        listId,
        canonicalUrl: `https://www.amazon.${marketplace}/hz/wishlist/ls/${listId}`,
      };
    }
  }

  return { kind: 'amazon-other', url: url.toString(), marketplace };
}
