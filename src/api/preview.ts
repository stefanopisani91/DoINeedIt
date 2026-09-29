import type { PreviewResponse } from '../../netlify/edge-functions/preview.ts';

export type PreviewOutcome = PreviewResponse | { ok: false; reason: 'network' };

const CLIENT_TIMEOUT_MS = 30_000;

/**
 * Asks the preview function for title, image and price; never throws. A shop
 * that does not answer in time reads as `unreachable`; a failed request (no
 * network, aborted by the caller) as `network`.
 */
export async function fetchPreview(url: string, signal?: AbortSignal): Promise<PreviewOutcome> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CLIENT_TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    const response = await fetch(`/api/preview?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    const body = (await response.json()) as PreviewResponse;
    return body;
  } catch {
    return { ok: false, reason: timedOut ? 'unreachable' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}
