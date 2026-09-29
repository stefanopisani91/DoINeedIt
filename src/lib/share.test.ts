import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare, shareUrl } from './share';
import { EXAMPLE_ITEMS } from '@/data/examples';

describe('share links', () => {
  it('round-trips an item through the URL fragment', () => {
    const item = EXAMPLE_ITEMS[0]!;
    const encoded = encodeShare(item);
    expect(encoded).not.toContain('#');
    expect(decodeShare(`#${encoded}`)).toEqual(item);
    expect(shareUrl(item, 'https://example.test')).toBe(`https://example.test/i#${encoded}`);
  });

  it('rejects tampered or empty payloads', () => {
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('#not-a-payload')).toBeNull();
  });
});
