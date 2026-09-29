import { describe, expect, it } from 'vitest';
import { decodeEntities, parseAmazonHtml, parsePriceText } from './amazon-parser';

export const PRODUCT_PAGE = `<!doctype html><html><head>
<title>Cuffie Bluetooth Senza Fili con Cancellazione del Rumore : Amazon.it: Elettronica</title>
<meta name="title" content="Cuffie Bluetooth Senza Fili con Cancellazione del Rumore : Amazon.it: Elettronica">
</head><body>
<span id="productTitle" class="a-size-large">   Cuffie Bluetooth Senza Fili con
  Cancellazione del Rumore, 60 Ore   </span>
<div id="imgTagWrapperId"><img id="landingImage" src="https://m.media-amazon.com/images/I/small._AC_SX300_.jpg"
  data-old-hires="https://m.media-amazon.com/images/I/big._AC_SL1500_.jpg"
  data-a-dynamic-image='{"https://m.media-amazon.com/images/I/mid._AC_SX679_.jpg":[679,679]}'></div>
<div id="corePriceDisplay_desktop_feature_div"><span class="a-price"><span class="a-offscreen">1.249,00&nbsp;€</span></span></div>
<div class="a-price"><span class="a-offscreen">2.399,00 €</span></div>
</body></html>`;

describe('decodeEntities', () => {
  it('decodes named, decimal and hex entities', () => {
    expect(decodeEntities('Tom &amp; Jerry &#39;24 &#x20AC; 5&nbsp;€ &unknown;')).toBe(
      "Tom & Jerry '24 € 5\u00a0€ &unknown;",
    );
  });
});

describe('parsePriceText', () => {
  it('reads European and US formats with their currency', () => {
    expect(parsePriceText('12,48 €')).toEqual({ amount: 12.48, currency: 'EUR' });
    expect(parsePriceText('€12.48')).toEqual({ amount: 12.48, currency: 'EUR' });
    expect(parsePriceText('1.299,00 €')).toEqual({ amount: 1299, currency: 'EUR' });
    expect(parsePriceText('$1,299.00')).toEqual({ amount: 1299, currency: 'USD' });
    expect(parsePriceText('£9.99')).toEqual({ amount: 9.99, currency: 'GBP' });
    expect(parsePriceText('')).toBeNull();
    expect(parsePriceText('Non disponibile')).toBeNull();
  });
});

describe('parseAmazonHtml', () => {
  it('extracts title, best image and the main price', () => {
    const outcome = parseAmazonHtml(PRODUCT_PAGE);
    expect(outcome).toEqual({
      ok: true,
      product: {
        title: 'Cuffie Bluetooth Senza Fili con Cancellazione del Rumore, 60 Ore',
        imageUrl: 'https://m.media-amazon.com/images/I/big._AC_SL1500_.jpg',
        price: { amount: 1249, currency: 'EUR' },
      },
    });
  });

  it('falls back to meta title, dynamic image and any price on the page', () => {
    const html = `<html><head><meta name="title" content="Amazon.it: Libro di prova : Rossi, Mario: Libri"></head>
<body><img id="imgBlkFront" data-a-dynamic-image='{"https://m.media-amazon.com/images/I/a._SX300_.jpg":[300,400],"https://m.media-amazon.com/images/I/b._SX500_.jpg":[500,600]}'>
<span class="a-price"><span class="a-offscreen">14,25 €</span></span></body></html>`;
    expect(parseAmazonHtml(html)).toEqual({
      ok: true,
      product: {
        title: 'Libro di prova : Rossi, Mario: Libri',
        imageUrl: 'https://m.media-amazon.com/images/I/b._SX500_.jpg',
        price: { amount: 14.25, currency: 'EUR' },
      },
    });
  });

  it('returns null price and image when they are missing', () => {
    const html = `<html><head><title>Prodotto senza prezzo : Amazon.it: Casa</title></head><body></body></html>`;
    expect(parseAmazonHtml(html)).toEqual({
      ok: true,
      product: { title: 'Prodotto senza prezzo', imageUrl: null, price: null },
    });
  });

  it('detects captcha and not-found pages', () => {
    const captcha = `<html><head><title>Amazon.it</title></head><body><form action="/errors/validateCaptcha"><input id="captchacharacters"></form></body></html>`;
    expect(parseAmazonHtml(captcha)).toEqual({ ok: false, reason: 'blocked' });
    const robot = `<html><head><title>Robot Check</title></head><body></body></html>`;
    expect(parseAmazonHtml(robot)).toEqual({ ok: false, reason: 'blocked' });
    const missing = `<html><head><title>Impossibile trovare la pagina</title></head><body></body></html>`;
    expect(parseAmazonHtml(missing)).toEqual({ ok: false, reason: 'not-found' });
    expect(parseAmazonHtml('<html><body><p>nulla</p></body></html>')).toEqual({
      ok: false,
      reason: 'unparsable',
    });
  });
});
