import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../edge-functions/preview.ts';
import { PRODUCT_PAGE } from './amazon-parser.test';

function htmlResponse(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, { status, headers: { 'content-type': 'text/html', ...headers } });
}

async function call(url: string) {
  const response = await handler(
    new Request(`http://localhost/api/preview?url=${encodeURIComponent(url)}`),
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

  it('rejects links that are not Amazon products', async () => {
    expect((await call('ciao')).status).toBe(400);
    expect((await call('https://www.mediaworld.it/p/1')).body).toEqual({
      ok: false,
      reason: 'unsupported',
    });
    expect((await call('https://www.amazon.it/hz/wishlist/ls/ABC123')).status).toBe(400);
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

    const evil = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse('', 302, { location: 'https://evil.example/' }));
    vi.stubGlobal('fetch', evil);
    expect((await call('https://amzn.to/xyz')).body).toEqual({ ok: false, reason: 'unsupported' });
    expect(evil).toHaveBeenCalledTimes(1);
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
});
