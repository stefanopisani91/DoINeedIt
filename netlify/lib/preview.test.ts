import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../edge-functions/preview.ts';
import { PRODUCT_PAGE } from './amazon-parser.test';
import { SHOP_PAGE } from './og-parser.test';

function htmlResponse(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, { status, headers: { 'content-type': 'text/html', ...headers } });
}

async function call(url: string, headers: Record<string, string> = {}) {
  const response = await handler(
    new Request(`http://localhost/api/preview?url=${encodeURIComponent(url)}`, { headers }),
  );
  return {
    status: response.status,
    body: await response.json(),
    cache: response.headers.get('cache-control'),
  };
}

describe('preview function', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects garbage and points wish lists to their own import', async () => {
    expect((await call('ciao')).status).toBe(400);
    expect(await call('https://www.amazon.it/hz/wishlist/ls/ABC123?ref_=wl_share')).toMatchObject({
      status: 400,
      body: { ok: false, reason: 'wishlist', url: 'https://www.amazon.it/hz/wishlist/ls/ABC123' },
    });
  });

  it('returns the parsed product for a product page and marks it cacheable', async () => {
    const fetchMock = vi.fn(async () => htmlResponse(PRODUCT_PAGE));
    vi.stubGlobal('fetch', fetchMock);
    const { status, body, cache } = await call(
      'https://www.amazon.it/Cuffie/dp/B0H82G3QD4/ref=x?k=1',
    );
    expect(status).toBe(200);
    expect(cache).toContain('max-age=3600');
    expect(body).toMatchObject({
      ok: true,
      product: {
        title: 'Cuffie Bluetooth Senza Fili con Cancellazione del Rumore, 60 Ore',
        price: { amount: 1249, currency: 'EUR' },
        asin: 'B0H82G3QD4',
        marketplace: 'it',
        url: 'https://www.amazon.it/dp/B0H82G3QD4',
        site: 'amazon.it',
      },
    });
    const [requestedUrl, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(requestedUrl.toString()).toBe('https://www.amazon.it/dp/B0H82G3QD4');
    expect((init.headers as Record<string, string>)['accept-language']).toContain('it-IT');
  });

  it('follows short links only towards Amazon hosts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        htmlResponse('', 301, { location: 'https://www.amazon.it/dp/B0H82G3QD4' }),
      )
      .mockResolvedValueOnce(htmlResponse(PRODUCT_PAGE));
    vi.stubGlobal('fetch', fetchMock);
    const { status, body } = await call('https://amzn.eu/d/abc123');
    expect(status).toBe(200);
    expect(body.product.asin).toBe('B0H82G3QD4');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const evil = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse('', 302, { location: 'https://evil.example/' }));
    vi.stubGlobal('fetch', evil);
    expect((await call('https://amzn.to/xyz')).body).toEqual({ ok: false, reason: 'unsupported' });
    expect(evil).toHaveBeenCalledTimes(1);
  });

  it('reads the share links of the Amazon apps through the canonical product page', async () => {
    // What amzn.eu answers for a link shared from the app: a redirect to the
    // product page with social-share tracking parameters. The page is then
    // read at its canonical URL, in the marketplace language, like a pasted link.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        htmlResponse('', 301, {
          location:
            'https://www.amazon.it/dp/B0GKMBVVPQ?ref=cm_sw_r_cso_cp_apin_dp_HWD6X8VDZX6EA30WMQGX&ref_=cm_sw_r_cso_cp_apin_dp_HWD6X8VDZX6EA30WMQGX&social_share=cm_sw_r_cso_cp_apin_dp_HWD6X8VDZX6EA30WMQGX',
        }),
      )
      .mockResolvedValueOnce(htmlResponse(PRODUCT_PAGE));
    vi.stubGlobal('fetch', fetchMock);
    const { status, body } = await call(
      'Guarda cosa ho trovato su Amazon https://amzn.eu/d/0gVHHvNf',
    );
    expect(status).toBe(200);
    expect(body.product).toMatchObject({
      asin: 'B0GKMBVVPQ',
      marketplace: 'it',
      url: 'https://www.amazon.it/dp/B0GKMBVVPQ',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [productUrl, init] = fetchMock.mock.calls[1] as unknown as [URL, RequestInit];
    expect(productUrl.toString()).toBe('https://www.amazon.it/dp/B0GKMBVVPQ');
    expect((init.headers as Record<string, string>)['accept-language']).toContain('it-IT');
  });

  it('resolves a shortener that redirects from inside its page, through several hops', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        htmlResponse(
          '<html><head><meta http-equiv="refresh" content="0;url=https://amzn.to/second"></head></html>',
        ),
      )
      .mockResolvedValueOnce(
        htmlResponse('', 302, {
          location:
            'https://www.amazon.it/Cuffie-Bluetooth/dp/B0H82G3QD4/ref=cm_sw_r_apin_dp_ABC?th=1',
        }),
      )
      .mockResolvedValueOnce(htmlResponse(PRODUCT_PAGE));
    vi.stubGlobal('fetch', fetchMock);
    const { status, body } = await call('https://amzn.eu/d/0hXk9Zq');
    expect(status).toBe(200);
    expect(body.product).toMatchObject({ asin: 'B0H82G3QD4', marketplace: 'it' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries only the product page when a short link meets a captcha', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        htmlResponse('', 301, { location: 'https://www.amazon.it/dp/B0H82G3QD4?ref=x' }),
      )
      .mockResolvedValueOnce(htmlResponse('<title>Robot Check</title>'))
      .mockResolvedValueOnce(htmlResponse(PRODUCT_PAGE));
    vi.stubGlobal('fetch', fetchMock);
    const { body } = await call('https://amzn.eu/d/abc123');
    expect(body.product.asin).toBe('B0H82G3QD4');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const urls = fetchMock.mock.calls.map((c) => String((c as unknown as [URL])[0]));
    expect(urls.slice(1)).toEqual([
      'https://www.amazon.it/dp/B0H82G3QD4',
      'https://www.amazon.it/dp/B0H82G3QD4',
    ]);
  });

  it('answers unsupported when a short link does not exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } }),
      ),
    );
    expect(await call('https://amzn.eu/d/nope')).toMatchObject({
      status: 400,
      body: { ok: false, reason: 'unsupported' },
    });
  });

  it('recognises a short link that leads to a wish list', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          htmlResponse('', 301, {
            location: 'https://www.amazon.it/hz/wishlist/ls/1ABC2DEF?ref=x',
          }),
        )
        .mockResolvedValueOnce(htmlResponse('<title>Lista</title>')),
    );
    expect(await call('https://amzn.eu/d/list123')).toMatchObject({
      status: 400,
      body: { ok: false, reason: 'wishlist', url: 'https://www.amazon.it/hz/wishlist/ls/1ABC2DEF' },
    });
  });

  it('retries a captcha page and succeeds when a later attempt gets the real page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse('<title>Robot Check</title>', 200))
      .mockResolvedValueOnce(htmlResponse(PRODUCT_PAGE));
    vi.stubGlobal('fetch', fetchMock);
    const { status, body } = await call('https://www.amazon.it/dp/B0H82G3QD4');
    expect(status).toBe(200);
    expect(body.product.asin).toBe('B0H82G3QD4');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports persistent captcha pages as blocked without caching, after three attempts', async () => {
    const fetchMock = vi.fn(async () => htmlResponse('<title>Robot Check</title>', 200));
    vi.stubGlobal('fetch', fetchMock);
    const { status, body, cache } = await call('https://www.amazon.it/dp/B0H82G3QD4');
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false, reason: 'blocked' });
    expect(cache).toBe('no-store');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('maps missing pages and network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => htmlResponse('', 404)),
    );
    expect((await call('https://www.amazon.it/dp/B0H82G3QD4')).body).toEqual({
      ok: false,
      reason: 'not-found',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('timeout');
      }),
    );
    expect((await call('https://www.amazon.it/dp/B0H82G3QD4')).body).toEqual({
      ok: false,
      reason: 'unreachable',
    });
  });

  describe('other shops', () => {
    it('reads the Open Graph tags of any public shop page', async () => {
      const fetchMock = vi.fn(async () => htmlResponse(SHOP_PAGE));
      vi.stubGlobal('fetch', fetchMock);
      const { status, body, cache } = await call('https://www.negozio.example/p/cuffie-xy', {
        'accept-language': 'it-IT,it;q=0.9',
      });
      expect(status).toBe(200);
      expect(cache).toContain('max-age=3600');
      expect(body).toEqual({
        ok: true,
        product: {
          title: 'Cuffie Bluetooth XY, nere & oro',
          imageUrl: 'https://cdn.negozio.example/img/cuffie.jpg',
          price: { amount: 129.9, currency: 'EUR' },
          url: 'https://www.negozio.example/p/cuffie-xy',
          asin: null,
          marketplace: null,
          site: 'negozio.example',
        },
      });
      const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['user-agent']).toContain('Mozilla');
      // The shop is asked in the person's language, not in a fixed one.
      expect(headers['accept-language']).toBe('it-IT,it;q=0.9');
    });

    it('never contacts private or local addresses, not even through a redirect', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      for (const url of ['http://localhost:5173/x', 'http://192.168.1.10/', 'https://nas.local/']) {
        expect((await call(url)).body, url).toEqual({ ok: false, reason: 'unsupported' });
      }
      expect(fetchMock).not.toHaveBeenCalled();

      fetchMock.mockResolvedValueOnce(
        htmlResponse('', 302, { location: 'http://127.0.0.1/admin' }),
      );
      expect((await call('https://shop.example/p')).body).toEqual({
        ok: false,
        reason: 'unsupported',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not run a page redirect for shops and refuses non-HTML answers', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          htmlResponse('<meta http-equiv="refresh" content="0;url=https://other.example/">'),
        ),
      );
      expect((await call('https://shop.example/p')).body).toEqual({
        ok: false,
        reason: 'unparsable',
      });

      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response('{"title":"x"}', { headers: { 'content-type': 'application/json' } }),
        ),
      );
      expect((await call('https://shop.example/api')).body).toEqual({
        ok: false,
        reason: 'unparsable',
      });
    });

    it('treats a shop link that lands on Amazon as an Amazon product', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(
            htmlResponse('', 302, { location: 'https://www.amazon.it/dp/B0H82G3QD4' }),
          )
          .mockResolvedValueOnce(htmlResponse(PRODUCT_PAGE)),
      );
      const { body } = await call('https://deals.example/go/123');
      expect(body).toMatchObject({ ok: true, product: { asin: 'B0H82G3QD4', site: 'amazon.it' } });
    });

    it('answers unparsable when the page has no usable meta tags', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => htmlResponse('<html><body><p>Solo testo</p></body></html>')),
      );
      expect(await call('https://shop.example/p')).toMatchObject({
        status: 502,
        body: { ok: false, reason: 'unparsable' },
      });
    });
  });
});

describe('Amazon product pages', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is not fooled by the scripts of a product page that assign location', async () => {
    const page = PRODUCT_PAGE.replace(
      '<body>',
      '<body><script>if (x) { window.location.href = "https://www.amazon.it/ap/signin"; }</script>',
    );
    const fetchMock = vi.fn(async () => htmlResponse(page));
    vi.stubGlobal('fetch', fetchMock);
    const { status, body } = await call('https://www.amazon.it/dp/B0H82G3QD4');
    expect(status).toBe(200);
    expect(body.product.asin).toBe('B0H82G3QD4');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
