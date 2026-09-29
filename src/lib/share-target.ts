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
  return { kind: 'manual', title: toTitle(text) || toTitle(title) };
}

/** Longest title the form accepts: its input's `maxLength`, in UTF-16 code units. */
export const MAX_TITLE_LENGTH = 300;

/**
 * Shared text can span several lines, which a single-line title cannot show:
 * whitespace collapses to single spaces. The cut never splits a character, so
 * an emoji that does not fit is dropped whole instead of cut in half.
 */
function toTitle(value: string): string {
  let title = '';
  for (const char of value.replace(/\s+/g, ' ').trim()) {
    if (title.length + char.length > MAX_TITLE_LENGTH) break;
    title += char;
  }
  return title.trimEnd();
}
