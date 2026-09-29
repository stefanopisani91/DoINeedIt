import { expect, test, type Page } from '@playwright/test';

const LIST_URL = 'https://www.amazon.it/hz/wishlist/ls/2ABCDEF12345';

const LIST = {
  ok: true,
  list: {
    title: 'Regali di Natale',
    url: LIST_URL,
    marketplace: 'it',
    items: [
      {
        asin: 'B0H82G3QD4',
        title: 'Cuffie Bluetooth Senza Fili',
        imageUrl: 'https://m.media-amazon.com/images/I/cuffie.jpg',
        price: { amount: 129.9, currency: 'EUR' },
        url: 'https://www.amazon.it/dp/B0H82G3QD4',
      },
      {
        asin: 'B08N5WRWNW',
        title: 'Libro di prova',
        imageUrl: null,
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
  },
};

async function mockList(page: Page) {
  await page.route(/\/api\/wishlist\?url=/, (route) => {
    const url = new URL(route.request().url()).searchParams.get('url');
    expect(url).toBe(LIST_URL);
    return route.fulfill({ json: LIST });
  });
}

test.describe('wish list import', () => {
  test('a list link pasted on the home page opens the import and the chosen products wait for their evaluation', async ({
    page,
  }) => {
    await mockList(page);
    await page.goto('/');
    await page.getByPlaceholder('https://www.amazon.it/dp/…').fill(`${LIST_URL}?ref_=wl_share`);
    await page.getByRole('button', { name: 'Valuta' }).click();
    await expect(page).toHaveURL(/\/wishlist\?url=/);
    await expect(page.getByText(/3 prodotti nella lista «Regali di Natale»/)).toBeVisible();

    // Nothing is added without an explicit choice.
    await page.getByRole('button', { name: /Aggiungi 0 prodotti/ }).click();
    await expect(page.getByText('Seleziona almeno un prodotto.')).toBeVisible();

    await page.getByRole('checkbox', { name: /Cuffie Bluetooth Senza Fili/ }).check();
    await page.getByRole('checkbox', { name: /Tazza termica/ }).check();
    await page.getByRole('button', { name: 'Aggiungi 2 prodotti da valutare' }).click();

    await expect(page).toHaveURL(/\/$/);
    const queue = page.getByRole('region', { name: 'Da valutare' });
    await expect(queue.getByText('2 oggetti')).toBeVisible();
    await expect(queue.getByRole('heading', { name: 'Cuffie Bluetooth Senza Fili' })).toBeVisible();
    await expect(queue.getByText(/Dalla lista «Regali di Natale»/).first()).toBeVisible();
    await expect(page.getByText('Nessun oggetto valutato, per ora')).toBeVisible();

    // The product goes through the questions like any other: no automatic verdict.
    await queue.getByRole('link', { name: /Valuta: Cuffie Bluetooth/ }).click();
    await expect(page).toHaveURL(/\/new\?queue=/);
    await expect(page.getByText(/Preso dalla tua lista dei desideri/)).toBeVisible();
    await expect(page.getByLabel('Nome del prodotto')).toHaveValue('Cuffie Bluetooth Senza Fili');
    await expect(page.getByLabel('Prezzo (facoltativo)')).toHaveValue('129,9');
    await page.getByText('Tecnologia', { exact: true }).click();
    await page.getByRole('button', { name: 'Inizia le domande' }).click();
    await expect(page).toHaveURL(/\/evaluate$/);
    await expect(page.getByText('Domanda 1 · al massimo')).toBeVisible();

    // Taken for evaluation: it left the queue.
    await page.getByRole('button', { name: 'Interrompi' }).click();
    await expect(
      page.getByRole('region', { name: 'Da valutare' }).getByText('1 oggetto'),
    ).toBeVisible();
    await page.getByRole('button', { name: /Scarta: Tazza termica/ }).click();
    await expect(page.getByRole('region', { name: 'Da valutare' })).toHaveCount(0);
  });

  test('a product link that turns out to be a list offers the import', async ({ page }) => {
    await page.route(/\/api\/preview\?url=/, (route) =>
      route.fulfill({ status: 400, json: { ok: false, reason: 'wishlist', url: LIST_URL } }),
    );
    await mockList(page);
    await page.goto(`/new?url=${encodeURIComponent('https://amzn.eu/d/list123')}`);
    await expect(page.getByText(/Questo link è una lista dei desideri Amazon/)).toBeVisible();
    await page.getByRole('link', { name: 'Importa la lista' }).click();
    await expect(page).toHaveURL(/\/wishlist\?url=/);
    await expect(page.getByText(/3 prodotti nella lista/)).toBeVisible();
  });

  test('says clearly when the list is private or Amazon blocks the reading', async ({ page }) => {
    await page.route(/\/api\/wishlist\?url=/, (route) =>
      route.fulfill({ status: 403, json: { ok: false, reason: 'private' } }),
    );
    await page.goto('/wishlist');
    await page
      .getByLabel('Importa una lista dei desideri')
      .fill('https://www.amazon.it/dp/B0H82G3QD4');
    await page.getByRole('button', { name: 'Leggi la lista' }).click();
    await expect(
      page.getByText(/Incolla l’indirizzo di una lista dei desideri Amazon/),
    ).toBeVisible();

    await page.getByLabel('Importa una lista dei desideri').fill(`${LIST_URL}?ref=share`);
    await page.getByRole('button', { name: 'Leggi la lista' }).click();
    await expect(page.getByText(/La lista è privata o non è più disponibile/)).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);

    await page.route(/\/api\/wishlist\?url=/, (route) =>
      route.fulfill({ status: 503, json: { ok: false, reason: 'blocked' } }),
    );
    await page.getByRole('button', { name: 'Riprova' }).click();
    await expect(page.getByText(/Amazon non ha permesso di leggere la lista/)).toBeVisible();
  });
});
