/**
 * Extracts title, image and price from any shop page through its Open Graph
 * meta tags (with the Twitter card and the page title as fallbacks), the way
 * a chat builds a link preview. Text patterns only, no DOM: it runs inside an
 * edge function with a tight CPU budget.
 */

import {
  decodeEntities,
  parsePriceText,
  type ParsedProduct,
  type ProductPrice,
} from './amazon-parser.ts';

export type OpenGraphOutcome =
  | { ok: true; product: ParsedProduct & { siteName: string | null } }
  | { ok: false; reason: 'unparsable' };

/** How much of the page is scanned: meta tags live in the head. */
const HEAD_BYTES = 512 * 1024;

/** Every <meta> tag as a map of its attributes, whatever their order. */
export function metaTags(html: string): Array<Record<string, string>> {
  const tags: Array<Record<string, string>> = [];
  const tagPattern = /<meta\b([^>]*)>/gi;
  const attributePattern = /([a-z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
  const head = html.slice(0, HEAD_BYTES);
  let tag: RegExpExecArray | null;
  while ((tag = tagPattern.exec(head)) !== null) {
    const attributes: Record<string, string> = {};
    let attribute: RegExpExecArray | null;
    attributePattern.lastIndex = 0;
    while ((attribute = attributePattern.exec(tag[1]!)) !== null) {
      const value = attribute[2] ?? attribute[3] ?? attribute[4] ?? '';
      attributes[attribute[1]!.toLowerCase()] = decodeEntities(value);
    }
    tags.push(attributes);
  }
  return tags;
}

function clean(value: string | undefined): string | null {
  if (!value) return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text || null;
}

function firstMeta(tags: Array<Record<string, string>>, keys: string[]): string | null {
  for (const key of keys) {
    const tag = tags.find(
      (t) => (t['property'] ?? t['name'] ?? t['itemprop'] ?? '').toLowerCase() === key,
    );
    const value = clean(tag?.['content']);
    if (value) return value;
  }
  return null;
}

/** Drops the shop name a page title often carries, e.g. "Cuffie XY | MediaWorld". */
function stripSiteName(title: string, siteName: string | null): string {
  if (!siteName) return title;
  const escaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    title
      .replace(new RegExp(`\\s*[|\\-–—:·]\\s*${escaped}\\s*$`, 'i'), '')
      .replace(new RegExp(`^\\s*${escaped}\\s*[|\\-–—:·]\\s*`, 'i'), '')
      .trim() || title
  );
}

function absolute(candidate: string | null, pageUrl: string | undefined): string | null {
  if (!candidate) return null;
  try {
    const url = pageUrl ? new URL(candidate, pageUrl) : new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function findPrice(tags: Array<Record<string, string>>, html: string): ProductPrice | null {
  const pairs: Array<[string, string]> = [
    ['product:price:amount', 'product:price:currency'],
    ['og:price:amount', 'og:price:currency'],
    ['product:sale_price:amount', 'product:sale_price:currency'],
    ['price', 'pricecurrency'],
  ];
  for (const [amountKey, currencyKey] of pairs) {
    const amount = firstMeta(tags, [amountKey]);
    if (!amount) continue;
    const currency = firstMeta(tags, [currencyKey]);
    const price = parsePriceText(`${amount} ${currency ?? ''}`);
    if (price) return currency ? { ...price, currency: currency.toUpperCase() } : price;
  }
  // JSON-LD offers, the other common way shops expose a price.
  const ld =
    /"price"\s*:\s*"?([\d.,]+)"?[\s\S]{0,200}?"priceCurrency"\s*:\s*"([A-Z]{3})"/i.exec(html) ??
    /"priceCurrency"\s*:\s*"([A-Z]{3})"[\s\S]{0,200}?"price"\s*:\s*"?([\d.,]+)"?/i.exec(html);
  if (ld) {
    const [amount, currency] = /^"price"/i.test(ld[0]) ? [ld[1]!, ld[2]!] : [ld[2]!, ld[1]!];
    const price = parsePriceText(`${amount} ${currency}`);
    if (price) return { ...price, currency: currency.toUpperCase() };
  }
  return null;
}

export function parseOpenGraphHtml(html: string, pageUrl?: string): OpenGraphOutcome {
  const tags = metaTags(html);
  const siteName = firstMeta(tags, ['og:site_name']);
  const rawTitle =
    firstMeta(tags, ['og:title', 'twitter:title']) ??
    clean(decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ''));
  if (!rawTitle) return { ok: false, reason: 'unparsable' };
  const title = stripSiteName(rawTitle, siteName);
  const imageUrl = absolute(
    firstMeta(tags, ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image']),
    pageUrl,
  );
  return {
    ok: true,
    product: { title, imageUrl, price: findPrice(tags, html.slice(0, HEAD_BYTES)), siteName },
  };
}
