/**
 * Extracts title, image and price from the HTML of an Amazon product page.
 *
 * It works on the raw text with targeted patterns instead of building a DOM:
 * product pages weigh close to a megabyte and this parser runs inside an edge
 * function with a tight CPU budget.
 */

export interface ProductPrice {
  amount: number;
  currency: string;
}

export interface ParsedProduct {
  title: string | null;
  imageUrl: string | null;
  price: ProductPrice | null;
}

export type ParseOutcome =
  | { ok: true; product: ParsedProduct }
  | { ok: false; reason: 'blocked' | 'not-found' | 'unparsable' };

const CURRENCIES: Array<[RegExp, string]> = [
  [/€|EUR/, 'EUR'],
  [/£|GBP/, 'GBP'],
  [/R\$|BRL/, 'BRL'],
  [/\$|USD|US\$|MX\$|CA\$/, 'USD'],
  [/¥|JPY/, 'JPY'],
  [/zł|PLN/, 'PLN'],
  [/kr|SEK/, 'SEK'],
  [/CHF/, 'CHF'],
  [/₹|INR/, 'INR'],
  [/AED/, 'AED'],
  [/SAR/, 'SAR'],
  [/TL|₺|TRY/, 'TRY'],
];

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1]?.toLowerCase() === 'x'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function clean(text: string | undefined | null): string | null {
  if (!text) return null;
  const value = decodeEntities(text)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return value || null;
}

/** Parses a price as printed by Amazon, e.g. "12,48 €", "€12.48", "1.299,00 €", "$1,299.00". */
export function parsePriceText(text: string): ProductPrice | null {
  const compact = decodeEntities(text).replace(/\s+/g, ' ').trim();
  if (!compact) return null;
  const currency = CURRENCIES.find(([pattern]) => pattern.test(compact))?.[1] ?? 'EUR';
  const digits = compact.replace(/[^\d.,]/g, '');
  if (!digits) return null;
  const lastComma = digits.lastIndexOf(',');
  const lastDot = digits.lastIndexOf('.');
  const normalized =
    lastComma > lastDot ? digits.replace(/\./g, '').replace(',', '.') : digits.replace(/,/g, '');
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount: Math.round(amount * 100) / 100, currency };
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);
  const value = match?.[1] ?? match?.[2];
  return value ? decodeEntities(value) : null;
}

function tagWithId(html: string, tagName: string, id: string): string | null {
  const match = new RegExp(`<${tagName}\\b[^>]*\\bid\\s*=\\s*["']${id}["'][^>]*>`, 'i').exec(html);
  return match?.[0] ?? null;
}

function metaContent(html: string, attr: 'name' | 'property', value: string): string | null {
  const match = new RegExp(`<meta\\b[^>]*\\b${attr}\\s*=\\s*["']${value}["'][^>]*>`, 'i').exec(
    html,
  );
  return match ? attribute(match[0], 'content') : null;
}

function cleanTitle(raw: string | null): string | null {
  if (!raw) return null;
  return (
    raw
      .replace(/^Amazon\.[a-z.]+\s*:\s*/i, '')
      .replace(/\s*[:|]\s*Amazon\.[a-z.]+.*$/i, '')
      .trim() || null
  );
}

function findTitle(html: string): string | null {
  const span = /<span\b[^>]*\bid\s*=\s*["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i.exec(html);
  return (
    clean(span?.[1]) ??
    cleanTitle(clean(metaContent(html, 'name', 'title'))) ??
    cleanTitle(clean(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]))
  );
}

function largestDynamicImage(json: string | null): string | null {
  if (!json) return null;
  try {
    const map = JSON.parse(json) as Record<string, [number, number]>;
    const entries = Object.entries(map).filter(([url]) => /^https?:\/\//.test(url));
    if (entries.length === 0) return null;
    entries.sort((a, b) => (b[1]?.[0] ?? 0) - (a[1]?.[0] ?? 0));
    return entries[0]![0];
  } catch {
    return null;
  }
}

function findImage(html: string): string | null {
  for (const id of ['landingImage', 'imgBlkFront', 'main-image']) {
    const tag = tagWithId(html, 'img', id);
    if (!tag) continue;
    const hires = attribute(tag, 'data-old-hires');
    if (hires && /^https?:\/\//.test(hires)) return hires;
    const dynamic = largestDynamicImage(attribute(tag, 'data-a-dynamic-image'));
    if (dynamic) return dynamic;
    const src = attribute(tag, 'src');
    if (src && /^https?:\/\//.test(src)) return src;
  }
  const og = metaContent(html, 'property', 'og:image');
  return og && /^https?:\/\//.test(og) ? og : null;
}

const OFFSCREEN = /class\s*=\s*["']a-offscreen["'][^>]*>([^<]+)</i;

/** First screen-reader price that appears within a block identified by its id. */
function priceInBlock(html: string, id: string): ProductPrice | null {
  const start = html.search(new RegExp(`\\bid\\s*=\\s*["']${id}["']`, 'i'));
  if (start < 0) return null;
  const window = html.slice(start, start + 8000);
  const match = OFFSCREEN.exec(window);
  return match ? parsePriceText(match[1]!) : null;
}

function findPrice(html: string): ProductPrice | null {
  for (const id of [
    'corePriceDisplay_desktop_feature_div',
    'corePrice_feature_div',
    'apex_desktop',
    'tp_price_block_total_price_ww',
  ]) {
    const price = priceInBlock(html, id);
    if (price) return price;
  }
  for (const id of ['priceblock_ourprice', 'priceblock_dealprice', 'price_inside_buybox']) {
    const match = new RegExp(`\\bid\\s*=\\s*["']${id}["'][^>]*>([^<]+)<`, 'i').exec(html);
    const price = match ? parsePriceText(match[1]!) : null;
    if (price) return price;
  }
  const any = OFFSCREEN.exec(html);
  return any ? parsePriceText(any[1]!) : null;
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

export function parseAmazonHtml(html: string): ParseOutcome {
  if (BLOCKED_MARKERS.some((marker) => marker.test(html))) return { ok: false, reason: 'blocked' };
  if (NOT_FOUND_MARKERS.some((marker) => marker.test(html)))
    return { ok: false, reason: 'not-found' };

  const title = findTitle(html);
  if (!title) return { ok: false, reason: 'unparsable' };

  return { ok: true, product: { title, imageUrl: findImage(html), price: findPrice(html) } };
}
