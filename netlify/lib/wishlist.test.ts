import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../edge-functions/wishlist.ts';
import { WISHLIST_FRAGMENT, WISHLIST_PAGE } from './wishlist-parser.test';

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
      complete: true,
    });
    expect(body.list.items).toHaveLength(3);
    expect(body.list.items[0]).toMatchObject({ asin: 'B0H82G3QD4', price: { amount: 129.9 } });
    const [requestedUrl] = fetchMock.mock.calls[0] as unknown as [URL];
    expect(requestedUrl.toString()).toBe('https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345');
  });

  it('resolves a shared short link, but only if it leads to a list', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        htmlResponse('', 301, { location: 'https://www.amazon.de/hz/wishlist/ls/XYZ789?ref=x' }),
      )
      .mockResolvedValueOnce(htmlResponse(WISHLIST_PAGE));
    vi.stubGlobal('fetch', fetchMock);
    const { body } = await call('https://amzn.eu/d/list1');
    expect(body.list).toMatchObject({
      url: 'https://www.amazon.de/hz/wishlist/ls/XYZ789',
      marketplace: 'de',
    });
    expect(body.list.items[0].url).toBe('https://www.amazon.de/dp/B0H82G3QD4');
    const listUrl = String((fetchMock.mock.calls[1] as unknown as [URL])[0]);
    expect(listUrl).toBe('https://www.amazon.de/hz/wishlist/ls/XYZ789');

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

  describe('lists longer than one page', () => {
    const withMore = (html: string, token: string) =>
      html.replace(
        '</ul>',
        `<li><input type="hidden" name="showMoreUrl" value="/hz/wishlist/slv/items?filter=persistent_all&amp;paginationToken=${token}" id="showMoreUrl"/></li></ul>`,
      );

    it('follows the "show more" chain to the end and says the list is complete', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(htmlResponse(withMore(WISHLIST_PAGE, 'PAGE2')))
        .mockResolvedValueOnce(htmlResponse(WISHLIST_FRAGMENT))
        .mockResolvedValueOnce(htmlResponse('<ul id="g-items"></ul>'));
      vi.stubGlobal('fetch', fetchMock);
      const { body } = await call('https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345');
      expect(body.list.complete).toBe(true);
      expect(body.list.items.map((i: { asin: string }) => i.asin)).toEqual([
        'B0H82G3QD4',
        'B08N5WRWNW',
        'B0EXAMPLE9',
        'B01KXSELDK',
        'B0787KPCPX',
      ]);
      const urls = fetchMock.mock.calls.map((c) => String((c as unknown as [URL])[0]));
      expect(urls).toEqual([
        'https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345',
        'https://www.amazon.it/hz/wishlist/slv/items?filter=persistent_all&paginationToken=PAGE2',
        'https://www.amazon.it/hz/wishlist/slv/items?filter=persistent_all&paginationToken=PAGE3',
      ]);
      // Prices of the fragment follow the marketplace of the list, not the fixture's.
      expect(body.list.items[4].price).toEqual({ amount: 10.35, currency: 'EUR' });
    });

    it('stops when the end marker appears or a page brings nothing new', async () => {
      const lastPage = WISHLIST_FRAGMENT.replace(
        '<ul id="g-items"',
        '<div id="endOfListMarker"></div><ul id="g-items"',
      );
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(htmlResponse(withMore(WISHLIST_PAGE, 'PAGE2')))
          .mockResolvedValueOnce(htmlResponse(lastPage)),
      );
      let { body } = await call('https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345');
      expect(body.list).toMatchObject({ complete: true });
      expect(body.list.items).toHaveLength(5);

      const repeating = vi.fn(async () => htmlResponse(withMore(WISHLIST_PAGE, 'AGAIN')));
      vi.stubGlobal('fetch', repeating);
      ({ body } = await call('https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345'));
      expect(body.list.items).toHaveLength(3);
      expect(body.list.complete).toBe(true);
      expect(repeating).toHaveBeenCalledTimes(2);
    });

    it('returns what it read, marked incomplete, when Amazon blocks a later page', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(htmlResponse(withMore(WISHLIST_PAGE, 'PAGE2')))
          .mockResolvedValue(htmlResponse('<title>Robot Check</title>')),
      );
      const { status, body } = await call('https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345');
      expect(status).toBe(200);
      expect(body.list.items).toHaveLength(3);
      expect(body.list).toMatchObject({ complete: false, stoppedBy: 'blocked' });
    });

    it('sends the session cookies and the referer of the list page with every next page', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          htmlResponse(withMore(WISHLIST_PAGE, 'PAGE2'), 200, {
            'set-cookie': 'session-id=abc123; Path=/; Secure',
          }),
        )
        .mockResolvedValueOnce(htmlResponse(WISHLIST_FRAGMENT))
        .mockResolvedValueOnce(htmlResponse('<ul id="g-items"></ul>'));
      vi.stubGlobal('fetch', fetchMock);
      const { body } = await call('https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345');
      expect(body.list.complete).toBe(true);
      const [, init] = fetchMock.mock.calls[1] as unknown as [URL, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['cookie']).toBe('session-id=abc123');
      expect(headers['referer']).toBe('https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345');
      const [, firstInit] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
      expect((firstInit.headers as Record<string, string>)['cookie']).toBeUndefined();
    });
  });
});
