import { fetchPreview } from './preview';

describe('fetchPreview', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns the function response as is', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: false, reason: 'blocked' })))),
    );
    await expect(fetchPreview('https://www.amazon.it/dp/B0H82G3QD4')).resolves.toEqual({
      ok: false,
      reason: 'blocked',
    });
  });

  it('reads a failed request as a network problem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expect(fetchPreview('https://shop.example/p/1')).resolves.toEqual({
      ok: false,
      reason: 'network',
    });
  });

  it('reads a shop that never answers as unreachable, not as being offline', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          }),
      ),
    );
    const pending = fetchPreview('https://slow.example/p/1');
    await vi.advanceTimersByTimeAsync(30_000);
    await expect(pending).resolves.toEqual({ ok: false, reason: 'unreachable' });
  });
});
