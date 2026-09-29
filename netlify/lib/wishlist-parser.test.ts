import { describe, expect, it } from 'vitest';
import { findNextPageUrl, marketplaceCurrency, parseWishlistHtml } from './wishlist-parser';

export const WISHLIST_PAGE = `<!doctype html><html><head>
<title>Amazon.it: Regali di Natale</title></head><body>
<span id="profile-list-name" class="a-size-medium">Regali di Natale</span>
<ul id="g-items" class="a-unordered-list a-nostyle a-vertical a-spacing-none g-items-section ui-sortable">
<li data-id="2ABCDEF12345" data-itemId="I1AAAAAAAAAAAA" data-price="129.9" data-reposition-action-params="{}" class="a-spacing-none g-item-sortable">
  <div class="a-fixed-left-grid-col a-col-left" style="width:220px;">
    <a class="a-link-normal" id="itemImage_I1AAAAAAAAAAAA" href="/dp/B0H82G3QD4/?coliid=I1AAAAAAAAAAAA&amp;colid=2ABCDEF12345&amp;psc=1&amp;ref_=list_c_wl_lv_ov_lig_dp_it">
      <img alt="Cuffie Bluetooth Senza Fili" src="https://m.media-amazon.com/images/I/cuffie._SS135_.jpg"></a>
  </div>
  <h2 class="a-size-base"><a class="a-link-normal" id="itemName_I1AAAAAAAAAAAA" title="Cuffie Bluetooth Senza Fili con Cancellazione del Rumore" href="/dp/B0H82G3QD4/?coliid=I1AAAAAAAAAAAA&amp;colid=2ABCDEF12345&amp;psc=1&amp;ref_=list_c_wl_lv_ov_lig_dp_it">Cuffie Bluetooth Senza Fili con Cancellazione del Rumore</a></h2>
  <div class="a-row a-size-small itemAvailability"><span id="itemPrice_I1AAAAAAAAAAAA" class="a-price" data-a-size="m" data-a-color="base"><span class="a-offscreen">129,90&nbsp;€</span><span aria-hidden="true">129,90€</span></span></div>
</li>
<li data-id="2ABCDEF12345" data-itemId="I2BBBBBBBBBBBB" data-price="-Infinity" class="a-spacing-none g-item-sortable">
  <a class="a-link-normal" id="itemImage_I2BBBBBBBBBBBB" href="/dp/B08N5WRWNW/?coliid=I2BBBBBBBBBBBB&amp;colid=2ABCDEF12345"><img alt="Libro di prova" src="https://m.media-amazon.com/images/I/libro._SS135_.jpg"></a>
  <a class="a-link-normal" id="itemName_I2BBBBBBBBBBBB" title="Libro di prova &amp; altro" href="/dp/B08N5WRWNW/?coliid=I2BBBBBBBBBBBB&amp;colid=2ABCDEF12345">Libro di prova &amp; altro</a>
  <span class="a-size-small">Non disponibile</span>
</li>
<li data-id="2ABCDEF12345" data-itemId="I3CCCCCCCCCCCC" data-price="19.99" class="a-spacing-none g-item-sortable">
  <a class="a-link-normal" id="itemName_I3CCCCCCCCCCCC" href="/dp/B0EXAMPLE9/?coliid=I3CCCCCCCCCCCC&amp;colid=2ABCDEF12345">
     Tazza   termica
  </a>
</li>
<li data-id="2ABCDEF12345" data-itemId="I4DDDDDDDDDDDD" class="a-spacing-none g-item-sortable">
  <span>Articolo non più disponibile, senza link</span>
</li>
</ul></body></html>`;

/** What Amazon serves for the "show more" url: a fragment with the next ten entries. */
export const WISHLIST_FRAGMENT = `<ul id="g-items" class="a-unordered-list g-items-section"><li class="a-spacing-none"><span class="a-list-item"><input type="hidden" name="" value="10" id="viewItemCount"/></span></li>
<li data-id="3GAI165J8DP6Y" data-itemId="I1AVW0H3HUK7XB" data-price="25.6" class="a-spacing-none g-item-sortable">
  <a class="a-link-normal" id="itemImage_I1AVW0H3HUK7XB" href="/dp/B01KXSELDK/?coliid=I1AVW0H3HUK7XB&amp;colid=3GAI165J8DP6Y&amp;psc=1"><img alt="Dog treats" src="https://m.media-amazon.com/images/I/treats._SS135_.jpg"></a>
  <a class="a-link-normal" id="itemName_I1AVW0H3HUK7XB" title="Dog treats" href="/dp/B01KXSELDK/?coliid=I1AVW0H3HUK7XB&amp;colid=3GAI165J8DP6Y&amp;psc=1">Dog treats</a>
  <span id="itemPrice_I1AVW0H3HUK7XB" class="a-price"><span class="a-offscreen">$25.60</span></span>
</li>
<li data-id="3GAI165J8DP6Y" data-itemId="I25KTK21DHXD35" data-price="10.35" class="a-spacing-none g-item-sortable">
  <a class="a-link-normal" id="itemName_I25KTK21DHXD35" title="Chew toy" href="/dp/B0787KPCPX/?coliid=I25KTK21DHXD35&amp;colid=3GAI165J8DP6Y">Chew toy</a>
</li>
<li class="a-spacing-none"><span class="a-list-item">
  <input type="hidden" name="showMoreUrl" value="/hz/wishlist/slv/items?filter=persistent_all&amp;paginationToken=PAGE3" class="showMoreUrl" id="showMoreUrl"/>
  <input type="hidden" name="lastEvaluatedKey" value="PAGE3" id="lastEvaluatedKey"/>
</span></li></ul>`;

describe('parseWishlistHtml', () => {
  it('reads title, image, price and link of every visible product', () => {
    const outcome = parseWishlistHtml(WISHLIST_PAGE, 'it');
    expect(outcome).toEqual({
      ok: true,
      list: {
        title: 'Regali di Natale',
        items: [
          {
            asin: 'B0H82G3QD4',
            title: 'Cuffie Bluetooth Senza Fili con Cancellazione del Rumore',
            imageUrl: 'https://m.media-amazon.com/images/I/cuffie._SS135_.jpg',
            price: { amount: 129.9, currency: 'EUR' },
            url: 'https://www.amazon.it/dp/B0H82G3QD4',
          },
          {
            asin: 'B08N5WRWNW',
            title: 'Libro di prova & altro',
            imageUrl: 'https://m.media-amazon.com/images/I/libro._SS135_.jpg',
            price: null,
            url: 'https://www.amazon.it/dp/B08N5WRWNW',
          },
          {
            asin: 'B0EXAMPLE9',
            title: 'Tazza termica',
            imageUrl: null,
            price: { amount: 19.99, currency: 'EUR' },
            url: 'https://www.amazon.it/dp/B0EXAMPLE9',
          },
        ],
        nextPageUrl: null,
      },
    });
  });

  it('finds the "show more" url of a page and of a fragment, in every form Amazon writes it', () => {
    expect(
      findNextPageUrl(
        `<input type="hidden" name="showMoreUrl" value="/hz/wishlist/slv/items?filter=persistent_all&amp;paginationToken=ABC" id="showMoreUrl"/>`,
      ),
    ).toBe('/hz/wishlist/slv/items?filter=persistent_all&paginationToken=ABC');
    expect(findNextPageUrl(`<input value="/hz/wishlist/slv/items?lek=X" name="showMoreUrl">`)).toBe(
      '/hz/wishlist/slv/items?lek=X',
    );
    expect(
      findNextPageUrl(`<script>{"showMoreUrl":"\\/hz\\/wishlist\\/slv\\/items?lek=Y"}</script>`),
    ).toBe('/hz/wishlist/slv/items?lek=Y');
    expect(
      findNextPageUrl(
        `<div id="endOfListMarker"></div><input name="showMoreUrl" value="/hz/wishlist/slv/items?lek=Z">`,
      ),
    ).toBeNull();
    expect(findNextPageUrl(`<input name="showMoreUrl" value="javascript:void(0)">`)).toBeNull();
    expect(findNextPageUrl('<ul id="g-items"></ul>')).toBeNull();
  });

  it('reads a "show more" fragment like a page and tells an empty fragment from garbage', () => {
    expect(parseWishlistHtml(WISHLIST_FRAGMENT, 'com')).toEqual({
      ok: true,
      list: {
        title: null,
        items: [
          {
            asin: 'B01KXSELDK',
            title: 'Dog treats',
            imageUrl: 'https://m.media-amazon.com/images/I/treats._SS135_.jpg',
            price: { amount: 25.6, currency: 'USD' },
            url: 'https://www.amazon.com/dp/B01KXSELDK',
          },
          {
            asin: 'B0787KPCPX',
            title: 'Chew toy',
            imageUrl: null,
            price: { amount: 10.35, currency: 'USD' },
            url: 'https://www.amazon.com/dp/B0787KPCPX',
          },
        ],
        nextPageUrl: '/hz/wishlist/slv/items?filter=persistent_all&paginationToken=PAGE3',
      },
    });
    // An "idea" without a product is an entry without a link: readable, but nothing to import.
    const ideaOnly = `<ul id="g-items"><li data-itemid="I1"><span>Added as an idea</span></li></ul>`;
    expect(parseWishlistHtml(ideaOnly, 'com')).toEqual({ ok: false, reason: 'empty' });
    expect(parseWishlistHtml('<ul id="g-items"></ul>', 'com')).toEqual({
      ok: false,
      reason: 'empty',
    });
  });

  it('uses the marketplace currency when only data-price is available', () => {
    expect(marketplaceCurrency('com')).toBe('USD');
    expect(marketplaceCurrency('co.uk')).toBe('GBP');
    expect(marketplaceCurrency('it')).toBe('EUR');
    expect(marketplaceCurrency('de')).toBe('EUR');
  });

  it('skips duplicates and falls back to the page title for the list name', () => {
    const html = `<html><head><title>Amazon.de: Wunschliste</title></head><body>
<li data-itemid="A"><a id="itemName_A" title="Uno" href="/dp/B0H82G3QD4/?x=1">Uno</a></li>
<li data-itemid="B"><a id="itemName_B" title="Uno bis" href="/dp/B0H82G3QD4/?x=2">Uno bis</a></li>
</body></html>`;
    expect(parseWishlistHtml(html, 'de')).toMatchObject({
      ok: true,
      list: { title: 'Wunschliste', items: [{ asin: 'B0H82G3QD4', title: 'Uno' }] },
    });
  });

  it('tells a private list, a missing page, a captcha and an unreadable page apart', () => {
    const privateList = `<html><body><div id="wishlistNotFound">Spiacenti, questa lista non è disponibile.</div></body></html>`;
    expect(parseWishlistHtml(privateList, 'it')).toEqual({ ok: false, reason: 'private' });
    const login = `<html><body><a href="/ap/signin?openid.return_to=https%3A%2F%2Fwww.amazon.it%2Fhz%2Fwishlist%2Fls%2FABC">Accedi</a></body></html>`;
    expect(parseWishlistHtml(login, 'it')).toEqual({ ok: false, reason: 'private' });
    expect(parseWishlistHtml('<title>Robot Check</title>', 'it')).toEqual({
      ok: false,
      reason: 'blocked',
    });
    expect(parseWishlistHtml('<title>Impossibile trovare la pagina</title>', 'it')).toEqual({
      ok: false,
      reason: 'not-found',
    });
    expect(parseWishlistHtml('<html><body><p>Nulla</p></body></html>', 'it')).toEqual({
      ok: false,
      reason: 'unparsable',
    });
  });
});
