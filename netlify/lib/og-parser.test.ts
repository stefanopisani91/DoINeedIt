import { describe, expect, it } from 'vitest';
import { metaTags, parseOpenGraphHtml } from './og-parser';

export const SHOP_PAGE = `<!doctype html><html><head>
<title>Cuffie Bluetooth XY - Negozio di Prova</title>
<meta property="og:site_name" content="Negozio di Prova">
<meta content="Cuffie Bluetooth XY, nere &amp; oro" property="og:title" />
<meta property="og:image" content="https://cdn.negozio.example/img/cuffie.jpg">
<meta property="product:price:amount" content="129.90">
<meta property="product:price:currency" content="EUR">
</head><body><h1>Cuffie</h1></body></html>`;

describe('metaTags', () => {
  it('reads attributes in any order and quoting', () => {
    const tags = metaTags(
      `<meta name=description content='Ciao "mondo"'><META property="og:x" content="1"/>`,
    );
    expect(tags).toEqual([
      { name: 'description', content: 'Ciao "mondo"' },
      { property: 'og:x', content: '1' },
    ]);
  });
});

describe('parseOpenGraphHtml', () => {
  it('reads title, image and price from Open Graph tags', () => {
    expect(parseOpenGraphHtml(SHOP_PAGE, 'https://www.negozio.example/p/1')).toEqual({
      ok: true,
      product: {
        title: 'Cuffie Bluetooth XY, nere & oro',
        imageUrl: 'https://cdn.negozio.example/img/cuffie.jpg',
        price: { amount: 129.9, currency: 'EUR' },
        siteName: 'Negozio di Prova',
      },
    });
  });

  it('falls back to the twitter card, the page title, relative images and og:price', () => {
    const html = `<html><head><title>Scarpe da corsa | Sport Shop</title>
<meta name="twitter:image" content="/media/scarpe.png">
<meta property="og:site_name" content="Sport Shop">
<meta property="og:price:amount" content="89,99"><meta property="og:price:currency" content="eur">
</head></html>`;
    expect(parseOpenGraphHtml(html, 'https://sport.example/scarpe')).toEqual({
      ok: true,
      product: {
        title: 'Scarpe da corsa',
        imageUrl: 'https://sport.example/media/scarpe.png',
        price: { amount: 89.99, currency: 'EUR' },
        siteName: 'Sport Shop',
      },
    });
  });

  it('reads the price from JSON-LD offers and from itemprop tags', () => {
    const ld = `<html><head><meta property="og:title" content="Libro"></head><body>
<script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer","priceCurrency":"GBP","price":"12.50"}}</script></body></html>`;
    expect(parseOpenGraphHtml(ld)).toMatchObject({
      ok: true,
      product: { title: 'Libro', price: { amount: 12.5, currency: 'GBP' } },
    });
    const itemprop = `<html><head><meta property="og:title" content="Tazza">
<meta itemprop="price" content="7.00"><meta itemprop="priceCurrency" content="USD"></head></html>`;
    expect(parseOpenGraphHtml(itemprop)).toMatchObject({
      ok: true,
      product: { title: 'Tazza', price: { amount: 7, currency: 'USD' } },
    });
  });

  it('ignores images that are not http(s) and pages without a title', () => {
    const html = `<html><head><meta property="og:title" content="X"><meta property="og:image" content="data:image/png;base64,AAA"></head></html>`;
    expect(parseOpenGraphHtml(html)).toMatchObject({
      ok: true,
      product: { title: 'X', imageUrl: null, price: null },
    });
    expect(parseOpenGraphHtml('<html><body>niente</body></html>')).toEqual({
      ok: false,
      reason: 'unparsable',
    });
  });
});
