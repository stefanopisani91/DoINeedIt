import { extractUrl } from './amazon-url';

/**
 * What the /new page should do with the query string it was opened with.
 * Android's share sheet opens the app through the manifest's `share_target`
 * with the shared content in `url`, `text` or `title`: the Amazon app, for one,
 * shares a sentence followed by the link in `text`. The page's own canonical
 * form is `/new?url=<link>`, which the home page and the share flow both use.
 */
export type ShareTargetIntent =
  /** Nothing was shared: use the `url` parameter as it is, possibly empty. */
  | { kind: 'url'; url: string }
  /** Something was shared and it contains a link: redirect to the canonical form. */
  | { kind: 'redirect'; url: string }
  /** Something was shared but without any link: manual entry, with the text as a title. */
  | { kind: 'manual'; title: string };

export function resolveShareTarget(params: URLSearchParams): ShareTargetIntent {
  const url = params.get('url') ?? '';
  const text = params.get('text') ?? '';
  const title = params.get('title') ?? '';
  const shared = text.trim() !== '' || title.trim() !== '';
  if (!shared) return { kind: 'url', url };

  for (const candidate of [url, text, title]) {
    const link = extractUrl(candidate);
    if (link) return { kind: 'redirect', url: link };
  }
  return { kind: 'manual', title: (text.trim() || title.trim()).slice(0, 300) };
}
