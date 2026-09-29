/** The look shared by every text control: same radius and focus ring as the buttons. */
export const controlClass =
  'min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-ink-faint focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 aria-[invalid=true]:border-skip-500 disabled:opacity-60';

/** Ids of the hint and error paragraphs a control should reference, when they exist. */
export function describedBy(
  id: string,
  hint?: string | undefined,
  error?: string | null | undefined,
): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}
