/**
 * Fetches a public web page the way a link preview does, with the guards
 * every edge function needs: redirects are followed by hand and only towards
 * hosts the caller allows, private and local addresses are never contacted,
 * the body is cut at a fixed size and every request has a timeout. Nothing
 * is stored.
 *
 * Runs on Deno (Netlify Edge Functions): web APIs only.
 */

export const MAX_REDIRECTS = 5;
export const TIMEOUT_MS = 8_000;
export const MAX_BODY_BYTES = 2 * 1024 * 1024;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function browserHeaders(acceptLanguage: string): Record<string, string> {
  return {
    'user-agent': USER_AGENT,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': acceptLanguage,
    'upgrade-insecure-requests': '1',
  };
}

const LOCAL_SUFFIXES = ['.localhost', '.local', '.internal', '.home', '.lan', '.arpa'];

/**
 * True for a URL a preview function may contact: http(s) on the default port,
 * a hostname with a dot (no bare names of the local network) and never an IP
 * literal, which is the usual way to reach loopback, link-local and private
 * ranges. Only the hostname is checked: DNS is out of reach at the edge.
 */
export function isPublicUrl(url: URL): boolean {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.port !== '') return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host.includes('.')) return false;
  if (host.startsWith('[') || /^[\d.]+$/.test(host)) return false;
  if (host === 'localhost') return false;
  return !LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export async function readBody(response: Response): Promise<string> {
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

/**
 * A redirect expressed inside a 200 page instead of a Location header, as
 * link shorteners and interstitial pages sometimes do: `<meta http-equiv="refresh">`
 * or a script that assigns `location`. Only the first is trusted.
 */
export function findClientRedirect(html: string): string | null {
  const head = html.slice(0, 64 * 1024);
  const refresh =
    /<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["']\s*\d+\s*;\s*url\s*=\s*['"]?([^'">\s]+)/i.exec(
      head,
    ) ??
    /<meta\b[^>]*content\s*=\s*["']\s*\d+\s*;\s*url\s*=\s*['"]?([^'">\s]+)[^>]*http-equiv\s*=\s*["']?refresh/i.exec(
      head,
    );
  if (refresh?.[1]) return refresh[1].replace(/&amp;/g, '&');
  const script =
    /(?:window\.|document\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']|location\.replace\(\s*["']([^"']+)["']\s*\)/i.exec(
      head,
    );
  const target = script?.[1] ?? script?.[2];
  return target?.replace(/&amp;/g, '&') ?? null;
}

/** The `Set-Cookie` headers of a response, where the runtime exposes them. */
export function setCookies(headers: Headers): string[] {
  const withGetter = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetter.getSetCookie === 'function') return withGetter.getSetCookie();
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

/** Turns `Set-Cookie` values into a `Cookie` header value, latest value of a name winning. */
export function cookieHeader(jar: Map<string, string>, setCookies: string[]): string {
  for (const raw of setCookies) {
    const pair = raw.split(';', 1)[0] ?? '';
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

export type FetchedPage =
  | {
      kind: 'page';
      url: string;
      status: number;
      contentType: string;
      html: string;
      /** The `Set-Cookie` values of the page response, for callers that keep a session across pages. */
      cookies: string[];
    }
  /** A redirect target that `stopAt` accepted: not fetched. */
  | { kind: 'resolved'; url: string }
  | { kind: 'unsupported' | 'unreachable' };

export interface FetchOptions {
  /** Whether a URL (the first one or a redirect target) may be fetched. */
  allow: (url: URL) => boolean;
  acceptLanguage: string;
  /** Follow redirects written inside a 200 page too; only from hosts that pass this test. */
  followClientRedirects?: (url: URL) => boolean;
  /** Stop before fetching a redirect target that passes this test and return it as `resolved`. */
  stopAt?: (url: URL) => boolean;
  /** Extra request headers, e.g. the cookies and referer of a page read just before. */
  headers?: Record<string, string>;
}

/** Fetches a page following at most MAX_REDIRECTS redirects, each one checked with `allow`. */
export async function fetchPage(startUrl: string, options: FetchOptions): Promise<FetchedPage> {
  let current: URL;
  try {
    current = new URL(startUrl);
  } catch {
    return { kind: 'unsupported' };
  }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isPublicUrl(current) || !options.allow(current)) return { kind: 'unsupported' };
    if (hop > 0 && options.stopAt?.(current)) return { kind: 'resolved', url: current.toString() };
    const response = await fetch(current, {
      headers: { ...browserHeaders(options.acceptLanguage), ...options.headers },
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) return { kind: 'unreachable' };
      current = new URL(location, current);
      continue;
    }
    const contentType = response.headers.get('content-type') ?? '';
    const html = await readBody(response);
    if (response.status === 200 && options.followClientRedirects?.(current)) {
      const next = findClientRedirect(html);
      if (next) {
        current = new URL(next, current);
        continue;
      }
    }
    return {
      kind: 'page',
      url: current.toString(),
      status: response.status,
      contentType,
      html,
      cookies: setCookies(response.headers),
    };
  }
  return { kind: 'unreachable' };
}
