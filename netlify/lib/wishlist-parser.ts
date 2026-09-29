/**
 * Extracts the products visible in the HTML of a public Amazon wish list:
 * title, image, price and product link. Best effort by design: Amazon
 * renders only the first page of a list on the server and loads the rest
 * with scripts, and the markup changes without notice. Text patterns only,
 * no DOM, like the product parser.
 */

import { decodeEntities, parsePriceText, type ProductPrice } from './amazon-parser.ts';

export interface WishlistItem {
  asin: string;
  title: string;
  imageUrl: string | null;
  price: ProductPrice | null;
  /** Canonical product page in the list's marketplace. */
  url: string;
}

export interface ParsedWishlist {
  title: string | null;
  items: WishlistItem[];
  /**
   * Where the next batch of items is: Amazon renders ten per page and loads
   * the rest through this url ("show more"). Relative to the list page; null
   * on the last page.
   */
  nextPageUrl: string | null;
}

export type WishlistOutcome =
  | { ok: true; list: ParsedWishlist }
  | { ok: false; reason: 'blocked' | 'not-found' | 'private' | 'unparsable' | 'empty' };

/** The currency a marketplace prints its prices in, for the `data-price` fallback. */
const MARKETPLACE_CURRENCY: Record<string, string> = {
  com: 'USD',
  ca: 'CAD',
  'com.mx': 'MXN',
  'com.br': 'BRL',
  'co.uk': 'GBP',
  'co.jp': 'JPY',
  in: 'INR',
  'com.au': 'AUD',
  sg: 'SGD',
  ae: 'AED',
  sa: 'SAR',
  se: 'SEK',
  pl: 'PLN',
  'com.tr': 'TRY',
  eg: 'EGP',
};

export function marketplaceCurrency(marketplace: string): string {
  return MARKETPLACE_CURRENCY[marketplace.toLowerCase()] ?? 'EUR';
}

const BLOCKED_MARKERS = [
  /id="captchacharacters"/i,
  /\/errors\/validateCaptcha/i,
  /\/errors_page\/validateCaptcha/i,
  /<title>[^<]*Robot Check/i,
  /<title>[^<]*Bot Check/i,
  /api-services-support@amazon\.com/i,
];

const NOT_FOUND_MARKERS = [
  /<title>[^<]*(Page Not Found|Impossibile trovare la pagina|Seite nicht gefunden|Page introuvable|Página no encontrada)/i,
  /\/images\/G\/\d+\/error\/(dog|cat)/i,
];

/** What Amazon shows for a private list, a deleted one or one that needs a login. */
const PRIVATE_MARKERS = [
  /lista (?:dei desideri )?(?:non è|non e') (?:più )?disponibile/i,
  /questa lista (?:è|e') privata/i,
  /list is (?:no longer )?(?:available|accessible)/i,
  /this list is private/i,
  /Liste ist (?:nicht|privat)/i,
  /liste (?:n'est|est) (?:pas disponible|privée)/i,
  /lista (?:no está disponible|es privada)/i,
  /id="wishlistNotFound"/i,
  /id="no-wishlists-visible"/i,
  /\/ap\/signin\?[^"']*openid\.return_to=[^"']*wishlist/i,
];

function clean(text: string | undefined | null): string | null {
  if (!text) return null;
  const value = decodeEntities(text)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return value || null;
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);
  const value = match?.[1] ?? match?.[2];
  return value ? decodeEntities(value) : null;
}

function findListTitle(html: string): string | null {
  return (
    clean(
      /<span\b[^>]*\bid\s*=\s*["']profile-list-name["'][^>]*>([\s\S]*?)<\/span>/i.exec(html)?.[1],
    ) ??
    clean(
      /<h3\b[^>]*\bid\s*=\s*["']profile-list-name["'][^>]*>([\s\S]*?)<\/h3>/i.exec(html)?.[1],
    ) ??
    clean(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1])
      ?.replace(/^Amazon\.[a-z.]+\s*:?\s*/i, '')
      .replace(/\s*[:|-]\s*Amazon\.[a-z.]+.*$/i, '')
      .trim() ??
    null
  );
}

/** Splits the page into one chunk per list entry (`<li data-itemid="…">`). */
function itemBlocks(html: string): string[] {
  const starts: number[] = [];
  const pattern = /<li\b[^>]*\bdata-itemid\s*=\s*["'][^"']+["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) starts.push(match.index);
  return starts.map((start, index) => html.slice(start, starts[index + 1] ?? html.length));
}

function parseItem(block: string, marketplace: string): WishlistItem | null {
  const href =
    /\bid\s*=\s*["']itemName_[^"']+["'][^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(block)?.[1] ??
    /\bhref\s*=\s*["']([^"']+)["'][^>]*\bid\s*=\s*["']itemName_[^"']+["']/i.exec(block)?.[1] ??
    /\bhref\s*=\s*["']([^"']*\/dp\/[A-Z0-9]{10}[^"']*)["']/i.exec(block)?.[1] ??
    '';
  const asin = /\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i.exec(decodeEntities(href))?.[1]?.toUpperCase();
  if (!asin) return null;

  const nameTag = /<a\b[^>]*\bid\s*=\s*["']itemName_[^"']+["'][^>]*>([\s\S]*?)<\/a>/i.exec(block);
  const title =
    (nameTag ? attribute(nameTag[0], 'title') : null)?.replace(/\s+/g, ' ').trim() ||
    clean(nameTag?.[1]) ||
    clean(/<img\b[^>]*\balt\s*=\s*["']([^"']+)["']/i.exec(block)?.[1]);
  if (!title) return null;

  const imageTag = /<img\b[^>]*>/i.exec(block)?.[0] ?? '';
  const src = attribute(imageTag, 'src');
  const imageUrl = src && /^https?:\/\//.test(src) ? src : null;

  const priceBlock = /\bid\s*=\s*["']itemPrice_[^"']+["'][\s\S]{0,1500}/i.exec(block)?.[0] ?? '';
  const offscreen = /class\s*=\s*["']a-offscreen["'][^>]*>([^<]+)</i.exec(priceBlock);
  let price = offscreen ? parsePriceText(offscreen[1]!) : null;
  if (!price) {
    const attributePrice = /\bdata-price\s*=\s*["']([\d.,]+)["']/i.exec(block)?.[1];
    if (attributePrice && Number(attributePrice) > 0) {
      price = {
        amount: Math.round(Number(attributePrice) * 100) / 100,
        currency: marketplaceCurrency(marketplace),
      };
    }
  }

  return { asin, title, imageUrl, price, url: `https://www.amazon.${marketplace}/dp/${asin}` };
}

/** The "show more" url of a list page or fragment, when it has one and is not the last. */
export function findNextPageUrl(html: string): string | null {
  if (/\bid\s*=\s*["']endOfListMarker["']/i.test(html)) return null;
  const input =
    /<input\b[^>]*\b(?:id|name)\s*=\s*["']showMoreUrl["'][^>]*\bvalue\s*=\s*["']([^"']+)["']/i.exec(
      html,
    ) ??
    /<input\b[^>]*\bvalue\s*=\s*["']([^"']+)["'][^>]*\b(?:id|name)\s*=\s*["']showMoreUrl["']/i.exec(
      html,
    ) ??
    /"showMoreUrl"\s*:\s*"([^"]+)"/.exec(html);
  const url = input?.[1] ? decodeEntities(input[1]).replace(/\\\//g, '/').trim() : null;
  return url && /^(https?:\/\/|\/)/.test(url) ? url : null;
}

/**
 * Parses a list page, or one of the fragments Amazon serves for "show more".
 * `empty` is a readable page without products, which on a later page just
 * means the list has ended.
 */
export function parseWishlistHtml(html: string, marketplace: string): WishlistOutcome {
  if (BLOCKED_MARKERS.some((marker) => marker.test(html))) return { ok: false, reason: 'blocked' };
  if (NOT_FOUND_MARKERS.some((marker) => marker.test(html)))
    return { ok: false, reason: 'not-found' };

  const seen = new Set<string>();
  const items: WishlistItem[] = [];
  const blocks = itemBlocks(html);
  for (const block of blocks) {
    const item = parseItem(block, marketplace);
    if (item && !seen.has(item.asin)) {
      seen.add(item.asin);
      items.push(item);
    }
  }
  if (items.length === 0) {
    if (PRIVATE_MARKERS.some((marker) => marker.test(html)))
      return { ok: false, reason: 'private' };
    // Entries without a product (an "idea") or a list container without entries.
    if (blocks.length > 0 || /\bid\s*=\s*["']g-items["']/i.test(html)) {
      return { ok: false, reason: 'empty' };
    }
    return { ok: false, reason: 'unparsable' };
  }
  return {
    ok: true,
    list: { title: findListTitle(html), items, nextPageUrl: findNextPageUrl(html) },
  };
}
