import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../edge-functions/wishlist.ts';
import { WISHLIST_PAGE } from './wishlist-parser.test';

function htmlResponse(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, { status, headers: { 'content-type': 'text/html', ...headers } });
}

async function call(url: string) {
  const response = await handler(
    new Request(`http://localhost/api/wishlist?url=${encodeURIComponent(url)}`),
  );
  return {
    status: response.status,
    body: await response.json(),
    cache: response.headers.get('cache-control'),
  };
}

describe('wishlist function', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts only wish list links and short links', async () => {
    expect((await call('ciao')).status).toBe(400);
    expect((await call('https://www.amazon.it/dp/B0H82G3QD4')).body).toEqual({
      ok: false,
      reason: 'unsupported',
    });
    expect((await call('https://shop.example/list')).body).toEqual({
      ok: false,
      reason: 'unsupported',
    });
  });

  it('returns the visible products of a public list, never cached', async () => {
    const fetchMock = vi.fn(async () => htmlResponse(WISHLIST_PAGE));
    vi.stubGlobal('fetch', fetchMock);
    const { status, body, cache } = await call(
      'https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345?ref_=wl_share',
    );
    expect(status).toBe(200);
    expect(cache).toBe('no-store');
    expect(body.list).toMatchObject({
      title: 'Regali di Natale',
      url: 'https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345',
      marketplace: 'it',
    });
    expect(body.list.items).toHaveLength(3);
    expect(body.list.items[0]).toMatchObject({ asin: 'B0H82G3QD4', price: { amount: 129.9 } });
    const [requestedUrl] = fetchMock.mock.calls[0] as unknown as [URL];
    expect(requestedUrl.toString()).toBe(
      'https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345?ref_=wl_share',
    );
  });

  it('resolves a shared short link, but only if it leads to a list', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          htmlResponse('', 301, { location: 'https://www.amazon.de/hz/wishlist/ls/XYZ789?ref=x' }),
        )
        .mockResolvedValueOnce(htmlResponse(WISHLIST_PAGE)),
    );
    const { body } = await call('https://amzn.eu/d/list1');
    expect(body.list).toMatchObject({
      url: 'https://www.amazon.de/hz/wishlist/ls/XYZ789',
      marketplace: 'de',
    });
    expect(body.list.items[0].url).toBe('https://www.amazon.de/dp/B0H82G3QD4');

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          htmlResponse('', 301, { location: 'https://www.amazon.it/dp/B0H82G3QD4' }),
        )
        .mockResolvedValueOnce(htmlResponse('<title>Prodotto</title>')),
    );
    expect((await call('https://amzn.eu/d/prod1')).body).toEqual({
      ok: false,
      reason: 'unsupported',
    });
  });

  it('says clearly when the list is private, blocked or missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => htmlResponse('<div id="wishlistNotFound">Lista non disponibile</div>')),
    );
    expect(await call('https://www.amazon.it/hz/wishlist/ls/PRIVATE1')).toMatchObject({
      status: 403,
      body: { ok: false, reason: 'private' },
    });

    const captcha = vi.fn(async () => htmlResponse('<title>Robot Check</title>'));
    vi.stubGlobal('fetch', captcha);
    expect(await call('https://www.amazon.it/hz/wishlist/ls/BLOCKED1')).toMatchObject({
      status: 503,
      body: { ok: false, reason: 'blocked' },
    });
    expect(captcha).toHaveBeenCalledTimes(3);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => htmlResponse('', 404)),
    );
    expect((await call('https://www.amazon.it/hz/wishlist/ls/GONE1')).body).toEqual({
      ok: false,
      reason: 'not-found',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('timeout');
      }),
    );
    expect((await call('https://www.amazon.it/hz/wishlist/ls/SLOW1')).body).toEqual({
      ok: false,
      reason: 'unreachable',
    });
  });
});
