import { describe, expect, it } from 'vitest';
import { resolveShareTarget } from './share-target';

const params = (query: Record<string, string>) => new URLSearchParams(query);

describe('resolveShareTarget', () => {
  it('passes the url parameter through when nothing was shared', () => {
    expect(resolveShareTarget(params({}))).toEqual({ kind: 'url', url: '' });
    expect(resolveShareTarget(params({ url: 'https://www.amazon.it/dp/B0H82G3QD4' }))).toEqual({
      kind: 'url',
      url: 'https://www.amazon.it/dp/B0H82G3QD4',
    });
  });

  it('finds the link inside the text shared by the Amazon app', () => {
    expect(
      resolveShareTarget(
        params({
          title: 'Amazon.it',
          text: 'Guarda cosa ho trovato: https://amzn.eu/d/3fKx9Ab Ti piace?',
        }),
      ),
    ).toEqual({ kind: 'redirect', url: 'https://amzn.eu/d/3fKx9Ab' });
  });

  it('prefers the url parameter, then the text, then the title', () => {
    expect(
      resolveShareTarget(
        params({
          url: 'https://www.amazon.it/dp/B0H82G3QD4',
          text: 'https://www.amazon.it/dp/B000000000',
        }),
      ),
    ).toEqual({ kind: 'redirect', url: 'https://www.amazon.it/dp/B0H82G3QD4' });
    expect(
      resolveShareTarget(params({ title: 'www.amazon.it/dp/B0H82G3QD4', text: 'ciao' })),
    ).toEqual({ kind: 'redirect', url: 'https://www.amazon.it/dp/B0H82G3QD4' });
  });

  it('falls back to manual entry with the shared text as title', () => {
    expect(resolveShareTarget(params({ text: '  Cuffie bluetooth  ' }))).toEqual({
      kind: 'manual',
      title: 'Cuffie bluetooth',
    });
    expect(resolveShareTarget(params({ title: 'Cuffie', text: ' ' }))).toEqual({
      kind: 'manual',
      title: 'Cuffie',
    });
    expect(resolveShareTarget(params({ text: 'x'.repeat(400) })).kind).toBe('manual');
    expect(
      (resolveShareTarget(params({ text: 'x'.repeat(400) })) as { title: string }).title,
    ).toHaveLength(300);
  });
});
