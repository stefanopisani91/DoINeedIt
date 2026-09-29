import { describe, expect, it } from 'vitest';
import { extractUrl, parseLink } from './amazon-url';

describe('extractUrl', () => {
  it('finds the link inside text shared by the Amazon app', () => {
    const shared =
      'Dai un’occhiata a questo prodotto su Amazon: https://www.amazon.it/dp/B0H82G3QD4?ref=cm_sw_r_apan_dp_XYZ.';
    expect(extractUrl(shared)).toBe('https://www.amazon.it/dp/B0H82G3QD4?ref=cm_sw_r_apan_dp_XYZ');
  });

  it('finds the short link shared by the iPhone app, with or without a sentence', () => {
    expect(extractUrl('https://amzn.eu/d/0hXk9Zq')).toBe('https://amzn.eu/d/0hXk9Zq');
    expect(extractUrl('Guarda cosa ho trovato su Amazon https://amzn.eu/d/gK8xYz2')).toBe(
      'https://amzn.eu/d/gK8xYz2',
    );
    expect(extractUrl('Cuffie Bluetooth\nhttps://a.co/d/3fKx9Zq\n')).toBe('https://a.co/d/3fKx9Zq');
  });

  it('drops the punctuation and quotes that stick to a pasted link', () => {
    expect(extractUrl('“https://amzn.eu/d/abc123”')).toBe('https://amzn.eu/d/abc123');
    expect(extractUrl('(https://www.amazon.it/dp/B0H82G3QD4).')).toBe(
      'https://www.amazon.it/dp/B0H82G3QD4',
    );
    expect(extractUrl("'https://amzn.eu/d/abc123'")).toBe('https://amzn.eu/d/abc123');
  });

  it('accepts links without a scheme', () => {
    expect(extractUrl('amazon.it/dp/B0H82G3QD4')).toBe('https://amazon.it/dp/B0H82G3QD4');
    expect(extractUrl('www.amzn.eu/d/abc')).toBe('https://www.amzn.eu/d/abc');
    expect(extractUrl('Guarda: a.co/d/abc123')).toBe('https://a.co/d/abc123');
  });

  it('returns null for plain text', () => {
    expect(extractUrl('cuffie bluetooth')).toBeNull();
    expect(extractUrl('')).toBeNull();
  });
});

describe('parseLink', () => {
  it('recognises product pages in every marketplace and url shape', () => {
    const cases: Array<[string, string, string]> = [
      ['https://www.amazon.it/dp/B0H82G3QD4', 'B0H82G3QD4', 'it'],
      [
        'https://www.amazon.it/Cuffie-Bluetooth-Auricolari/dp/B0H82G3QD4/ref=sr_1_1?keywords=x',
        'B0H82G3QD4',
        'it',
      ],
      [
        'https://www.amazon.it/dp/B0H82G3QD4?ref=cm_sw_r_apin_dp_ABC&ref_=cm_sw_r_apin_dp_ABC&social_share=cm_sw_r_apin_dp_ABC&titleSource=true&previewDoh=1',
        'B0H82G3QD4',
        'it',
      ],
      ['https://amazon.de/gp/product/B08N5WRWNW?th=1', 'B08N5WRWNW', 'de'],
      ['https://www.amazon.co.uk/gp/aw/d/B08N5WRWNW', 'B08N5WRWNW', 'co.uk'],
      ['https://www.amazon.com.br/product/b08n5wrwnw', 'B08N5WRWNW', 'com.br'],
      ['https://smile.amazon.com/dp/1234567890', '1234567890', 'com'],
      ['https://www.amazon.it/-/en/dp/B0H82G3QD4', 'B0H82G3QD4', 'it'],
      ['https://www.amazon.fr/gp/offer-listing/B0H82G3QD4/ref=x', 'B0H82G3QD4', 'fr'],
      ['https://www.amazon.com/exec/obidos/ASIN/B0H82G3QD4/', 'B0H82G3QD4', 'com'],
    ];
    for (const [input, asin, marketplace] of cases) {
      const parsed = parseLink(input);
      expect(parsed.kind, input).toBe('product');
      if (parsed.kind === 'product') {
        expect(parsed.asin).toBe(asin);
        expect(parsed.marketplace).toBe(marketplace);
        expect(parsed.canonicalUrl).toBe(`https://www.amazon.${marketplace}/dp/${asin}`);
      }
    }
  });

  it('recognises short links, wishlists and other Amazon pages', () => {
    expect(parseLink('https://amzn.eu/d/8Xy2abc').kind).toBe('short');
    expect(parseLink('https://amzn.to/3xyz').kind).toBe('short');
    expect(parseLink('https://a.co/d/3xyz').kind).toBe('short');
    const wishlist = parseLink('https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345?ref_=wl_share');
    expect(wishlist).toMatchObject({
      kind: 'wishlist',
      marketplace: 'it',
      listId: '2ABCDEF12345',
      canonicalUrl: 'https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345',
    });
    expect(parseLink('https://www.amazon.de/gp/registry/wishlist/ABC123/ref=x')).toMatchObject({
      kind: 'wishlist',
      marketplace: 'de',
      listId: 'ABC123',
    });
    expect(
      parseLink('https://www.amazon.it/hz/wishlist/dl/invite/abc12XY?ref_=wl_share'),
    ).toMatchObject({ kind: 'wishlist', listId: 'ABC12XY' });
    expect(parseLink('https://www.amazon.it/s?k=cuffie').kind).toBe('amazon-other');
  });

  it('classifies non-Amazon links and garbage', () => {
    expect(parseLink('https://www.mediaworld.it/product/123').kind).toBe('other');
    expect(parseLink('https://notamazon.it/dp/B0H82G3QD4').kind).toBe('other');
    expect(parseLink('ftp://amazon.it/dp/B0H82G3QD4').kind).toBe('invalid');
    expect(parseLink('ciao').kind).toBe('invalid');
  });
});
