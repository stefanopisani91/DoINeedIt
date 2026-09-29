import { expect, test } from '@playwright/test';

const SHOP_URL = 'https://www.negozio.example/p/cuffie-xy';

test.describe('links of other shops', () => {
  test('reads the Open Graph preview of a non-Amazon link and evaluates it', async ({ page }) => {
    await page.route(/\/api\/preview\?url=/, (route) => {
      const url = new URL(route.request().url()).searchParams.get('url');
      expect(url).toBe(SHOP_URL);
      return route.fulfill({
        json: {
          ok: true,
          product: {
            title: 'Cuffie Bluetooth XY',
            imageUrl: 'https://cdn.negozio.example/img/cuffie.jpg',
            price: { amount: 129.9, currency: 'EUR' },
            url: SHOP_URL,
            asin: null,
            marketplace: null,
            site: 'negozio.example',
          },
        },
      });
    });
    await page.goto('/');
    await page.getByPlaceholder('https://www.amazon.it/dp/…').fill(SHOP_URL);
    await page.getByRole('button', { name: 'Valuta' }).click();
    await expect(page).toHaveURL(/\/new\?url=https%3A%2F%2Fwww\.negozio\.example/);
    await expect(
      page.getByText('Ho letto titolo, foto e prezzo da negozio.example.'),
    ).toBeVisible();
    await expect(page.getByLabel('Nome del prodotto')).toHaveValue('Cuffie Bluetooth XY');
    await expect(page.getByLabel('Prezzo (facoltativo)')).toHaveValue('129,9');
    await page.getByText('Tecnologia', { exact: true }).click();
    await page.getByRole('button', { name: 'Inizia le domande' }).click();
    await expect(page).toHaveURL(/\/evaluate$/);
    await expect(page.getByText('Cuffie Bluetooth XY')).toBeVisible();
  });

  test('falls back to manual entry when the page has no usable meta tags', async ({ page }) => {
    await page.route(/\/api\/preview\?url=/, (route) =>
      route.fulfill({ status: 502, json: { ok: false, reason: 'unparsable' } }),
    );
    await page.goto(`/new?url=${encodeURIComponent('https://shop.example/p/1')}`);
    await expect(page.getByText(/Non ho trovato titolo e foto nella pagina/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Riprova la lettura automatica' })).toBeVisible();
    await page.getByLabel('Nome del prodotto').fill('Tazza termica');
    await page.getByRole('button', { name: 'Inizia le domande' }).click();
    await expect(page).toHaveURL(/\/evaluate$/);
  });
});
