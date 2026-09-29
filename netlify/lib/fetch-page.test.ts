import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPage, findClientRedirect, isPublicUrl } from './fetch-page';

describe('isPublicUrl', () => {
  it('accepts public http(s) hosts on the default port', () => {
    expect(isPublicUrl(new URL('https://www.mediaworld.it/p/1'))).toBe(true);
    expect(isPublicUrl(new URL('http://shop.example.co.uk/'))).toBe(true);
  });

  it('refuses private, local and unusual targets', () => {
    for (const url of [
      'https://localhost/',
      'https://intranet/',
      'https://printer.local/',
      'https://db.internal/',
      'https://127.0.0.1/',
      'https://10.0.0.5/x',
      'https://192.168.1.1/',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]/',
      'https://[fd00::1]/',
      'https://shop.example:8443/',
      'https://user:pw@shop.example/',
      'ftp://shop.example/',
    ]) {
      expect(isPublicUrl(new URL(url)), url).toBe(false);
    }
  });
});

describe('findClientRedirect', () => {
  it('reads meta refresh and script redirects', () => {
    expect(
      findClientRedirect(
        '<meta http-equiv="refresh" content="0; url=https://a.example/x?a=1&amp;b=2">',
      ),
    ).toBe('https://a.example/x?a=1&b=2');
    expect(findClientRedirect(`<meta content="0;URL='/dp/B0H82G3QD4'" http-equiv="Refresh">`)).toBe(
      '/dp/B0H82G3QD4',
    );
    expect(
      findClientRedirect('<script>window.location.href = "https://b.example/";</script>'),
    ).toBe('https://b.example/');
    expect(findClientRedirect('<script>location.replace("https://c.example/")</script>')).toBe(
      'https://c.example/',
    );
    expect(findClientRedirect('<p>ciao</p>')).toBeNull();
  });
});

describe('fetchPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  const html = (body: string, status = 200, headers: Record<string, string> = {}) =>
    new Response(body, { status, headers: { 'content-type': 'text/html', ...headers } });

  it('follows header redirects only where allowed and never towards private hosts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(html('', 302, { location: '/next' }))
      .mockResolvedValueOnce(html('<title>ok</title>'));
    vi.stubGlobal('fetch', fetchMock);
    const page = await fetchPage('https://shop.example/start', {
      allow: () => true,
      acceptLanguage: 'it',
    });
    expect(page).toMatchObject({ kind: 'page', url: 'https://shop.example/next', status: 200 });

    const toPrivate = vi
      .fn()
      .mockResolvedValueOnce(html('', 302, { location: 'http://10.0.0.1/' }));
    vi.stubGlobal('fetch', toPrivate);
    expect(
      await fetchPage('https://shop.example/', { allow: () => true, acceptLanguage: 'it' }),
    ).toEqual({
      kind: 'unsupported',
    });
    expect(toPrivate).toHaveBeenCalledTimes(1);

    const denied = vi.fn();
    vi.stubGlobal('fetch', denied);
    expect(
      await fetchPage('https://shop.example/', { allow: () => false, acceptLanguage: 'it' }),
    ).toEqual({
      kind: 'unsupported',
    });
    expect(denied).not.toHaveBeenCalled();
  });

  it('follows a redirect written inside the page only from the hosts that opt in', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        html('<meta http-equiv="refresh" content="0;url=https://shop.example/p">'),
      )
      .mockResolvedValueOnce(html('<title>ok</title>'));
    vi.stubGlobal('fetch', fetchMock);
    const page = await fetchPage('https://short.example/abc', {
      allow: () => true,
      acceptLanguage: 'it',
      followClientRedirects: (url) => url.hostname === 'short.example',
    });
    expect(page).toMatchObject({
      kind: 'page',
      url: 'https://shop.example/p',
      html: '<title>ok</title>',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after too many redirects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => html('', 301, { location: 'https://shop.example/loop' })),
    );
    expect(
      await fetchPage('https://shop.example/', { allow: () => true, acceptLanguage: 'it' }),
    ).toEqual({
      kind: 'unreachable',
    });
  });
});
