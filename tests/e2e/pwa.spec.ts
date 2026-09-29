import { expect, test } from '@playwright/test';

const PRODUCT_URL = 'https://www.amazon.it/dp/B0H82G3QD4';

test.describe('installable app', () => {
  test('the manifest declares the icons and the share target', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.ok()).toBe(true);
    const manifest = (await response.json()) as {
      display: string;
      start_url: string;
      icons: { src: string; sizes: string; purpose?: string }[];
      share_target: { action: string; method: string; params: Record<string, string> };
    };
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.share_target).toEqual({
      action: '/new',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    });

    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) {
      const image = await request.get(icon.src);
      expect(image.ok(), icon.src).toBe(true);
      expect(image.headers()['content-type']).toContain('image/png');
    }
  });

  test('a link shared from Android lands on the new item page and starts the preview', async ({
    page,
  }) => {
    await page.route(/\/api\/preview\?url=/, (route) =>
      route.fulfill({
        json: {
          ok: true,
          product: {
            title: 'Friggitrice ad aria condivisa',
            imageUrl: 'https://m.media-amazon.com/images/I/test.jpg',
            price: { amount: 79.9, currency: 'EUR' },
            url: PRODUCT_URL,
            asin: 'B0H82G3QD4',
            marketplace: 'it',
          },
        },
      }),
    );
    // What the Amazon app shares: a sentence with the link inside, in `text`.
    const shared = new URLSearchParams({
      title: 'Amazon.it',
      text: `Guarda cosa ho trovato su Amazon: ${PRODUCT_URL}?ref=share`,
    });
    await page.goto(`/new?${shared}`);

    await expect(page).toHaveURL(/\/new\?url=https%3A%2F%2Fwww\.amazon\.it/);
    await expect(page.getByLabel('Nome del prodotto')).toHaveValue('Friggitrice ad aria condivisa');
    await expect(page.getByLabel('Prezzo (facoltativo)')).toHaveValue('79,9');

    // "Back" skips the share URL and leaves the app.
    await page.goBack();
    await expect(page).not.toHaveURL(/\/new/);

    await page.goForward();
    await page.getByRole('button', { name: 'Inizia le domande' }).click();
    await expect(page).toHaveURL(/\/evaluate$/);
    await expect(page.getByText('Domanda 1 · al massimo')).toBeVisible();
  });

  test('shared text without a link falls back to manual entry', async ({ page }) => {
    await page.goto(`/new?${new URLSearchParams({ text: 'Cuffie bluetooth' })}`);
    await expect(page).toHaveURL(/\/new\?text=/);
    await expect(page.getByLabel('Nome del prodotto')).toHaveValue('Cuffie bluetooth');
    await expect(page.getByText('Descrivi il prodotto: bastano poche parole.')).toBeVisible();
  });
});
