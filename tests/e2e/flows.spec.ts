import { expect, test, type Page } from '@playwright/test';

const PRODUCT_URL = 'https://www.amazon.it/dp/B0H82G3QD4';

async function answerUntilResult(page: Page, pick: (text: string) => 'Sì' | 'No' | 'Forse') {
  for (let i = 0; i < 25; i++) {
    if (page.url().includes('/items/')) return;
    const heading = page.getByRole('heading', { level: 2 });
    await expect(heading).toBeVisible();
    const text = (await heading.textContent()) ?? '';
    await page.getByRole('button', { name: pick(text), exact: true }).click();
  }
  throw new Error('the questionnaire did not finish');
}

test.describe('evaluating a product', () => {
  test('manual entry, clearly unnecessary purchase, stops after the core questions', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Inserisci il prodotto a mano/ }).click();
    await expect(page).toHaveURL(/\/new$/);
    await page.getByLabel('Nome del prodotto').fill('Terzo paio di cuffie');
    await page.getByLabel('Prezzo (facoltativo)').fill('89,90');
    await page.getByText('Tecnologia', { exact: true }).click();
    await page.getByRole('button', { name: 'Inizia le domande' }).click();

    await expect(page).toHaveURL(/\/evaluate$/);
    await expect(page.getByText('Domanda 1 · al massimo')).toBeVisible();
    // Everything points to "skip": already owns a working one, no need, impulse buy.
    const answers: Record<string, 'Sì' | 'No'> = {
      'Hai già qualcosa che svolge la stessa funzione?': 'Sì',
      'Quello che hai già funziona ancora bene?': 'Sì',
      'Il nuovo prodotto fa qualcosa di davvero diverso che ti serve?': 'No',
      'Risponde a un’esigenza concreta che hai già adesso?': 'No',
      'Lo useresti almeno una volta a settimana nei prossimi tre mesi?': 'No',
      'Se non lo comprassi, avresti un problema concreto entro un mese?': 'No',
      'Hai deciso di comprarlo oggi, sull’onda di un’offerta, di un video o di un consiglio?': 'Sì',
      'Per pagarlo dovresti intaccare i risparmi, pagare a rate o rinunciare a qualcosa che avevi già programmato?':
        'Sì',
    };
    await answerUntilResult(page, (text) => answers[text] ?? 'Forse');

    await expect(page).toHaveURL(/\/items\//);
    await expect(page.getByText('Non ti serve', { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: /0% necessità/ })).toBeVisible();
    await expect(page.getByText('8 risposte')).toBeVisible();
    await expect(page.getByText('89,90')).toBeVisible();
    // Without a monthly budget the price could not weigh in, and the page says so.
    await expect(page.getByText(/Con un budget mensile il prezzo pesa/)).toBeVisible();

    await page.getByRole('link', { name: 'I miei oggetti' }).click();
    await expect(page.getByRole('heading', { name: 'Terzo paio di cuffie' })).toBeVisible();
    await expect(page.getByText('1 oggetto')).toBeVisible();
  });

  test('link with automatic preview, uncertain answers go through the deepening questions', async ({
    page,
  }) => {
    await page.route(/\/api\/preview\?url=/, (route) =>
      route.fulfill({
        json: {
          ok: true,
          product: {
            title: 'Friggitrice ad aria di prova',
            imageUrl: 'https://m.media-amazon.com/images/I/test.jpg',
            price: { amount: 79.9, currency: 'EUR' },
            url: PRODUCT_URL,
            asin: 'B0H82G3QD4',
            marketplace: 'it',
          },
        },
      }),
    );
    await page.goto('/');
    await page
      .getByPlaceholder('https://www.amazon.it/dp/…')
      .fill(`Guarda: ${PRODUCT_URL}?ref=share`);
    await page.getByRole('button', { name: 'Valuta' }).click();
    await expect(page).toHaveURL(/\/new\?url=/);
    await expect(page.getByLabel('Nome del prodotto')).toHaveValue('Friggitrice ad aria di prova');
    await expect(page.getByLabel('Prezzo (facoltativo)')).toHaveValue('79,9');
    await page.getByText('Cucina', { exact: true }).click();
    await page.getByRole('button', { name: 'Inizia le domande' }).click();

    await answerUntilResult(page, () => 'Forse');
    await expect(page.getByText('Rimanda e riconsidera', { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: /50% necessità/ })).toBeVisible();
    await expect(page.getByText(/risposte, di cui \d+ “forse”/)).toBeVisible();
    await page.getByText('Le tue risposte').click();
    await expect(
      page.getByText('Prepari quel tipo di piatto almeno ogni due settimane?'),
    ).toBeVisible();
  });

  test('with a monthly budget the price weighs in the score', async ({ page }) => {
    await page.goto('/settings');
    await page.getByLabel('Budget mensile in euro').fill('400');
    await page.getByRole('button', { name: 'Salva il budget' }).click();
    await expect(page.getByText(/Budget mensile salvato: 400,00/)).toBeVisible();

    await page.goto('/new');
    await page.getByLabel('Nome del prodotto').fill('Bici da città');
    await page.getByLabel('Prezzo (facoltativo)').fill('300');
    await page.getByText('Sport e hobby', { exact: true }).click();
    await page.getByRole('button', { name: 'Inizia le domande' }).click();

    // Every answer says "need", the price (75% of the budget) says "skip".
    const skipQuestions = [
      'Hai già qualcosa che svolge la stessa funzione?',
      'Hai deciso di comprarlo oggi, sull’onda di un’offerta, di un video o di un consiglio?',
      'Per pagarlo dovresti intaccare i risparmi, pagare a rate o rinunciare a qualcosa che avevi già programmato?',
    ];
    await answerUntilResult(page, (text) => (skipQuestions.includes(text) ? 'No' : 'Sì'));

    await expect(page.getByText('Ti serve davvero', { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: /83% necessità/ })).toBeVisible();
    await expect(page.getByText(/Costa il 75% del tuo budget mensile di 400,00/)).toBeVisible();
    await expect(page.getByRole('meter', { name: 'Budget' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
  });

  test('shows the manual form when Amazon blocks the preview', async ({ page }) => {
    await page.route(/\/api\/preview\?url=/, (route) =>
      route.fulfill({ status: 503, json: { ok: false, reason: 'blocked' } }),
    );
    await page.goto(`/new?url=${encodeURIComponent(PRODUCT_URL)}`);
    await expect(page.getByText(/Amazon non ha permesso di leggere la pagina/)).toBeVisible();
    await page.getByRole('button', { name: 'Inizia le domande' }).click();
    await expect(page.getByText('Scrivi almeno il nome del prodotto.')).toBeVisible();
  });
});

test.describe('examples, sharing and settings', () => {
  test('loads the examples, shares one and imports it on a fresh profile', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Carica tre esempi' }).click();
    await expect(page.getByText('3 oggetti')).toBeVisible();
    await page.getByRole('link', { name: /Scarpe da corsa/ }).click();
    await expect(page.getByText('Ti serve davvero', { exact: true })).toBeVisible();

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copia link' }).click();
    await expect(page.getByRole('button', { name: 'Link copiato' })).toBeVisible();
    const shared = await page.evaluate(() => navigator.clipboard.readText());
    expect(shared).toContain('/i#');

    const fresh = await (await page.context().browser()!.newContext()).newPage();
    await fresh.goto(shared);
    await expect(fresh.getByText('Valutazione condivisa')).toBeVisible();
    await expect(fresh.getByRole('heading', { name: /Scarpe da corsa/ })).toBeVisible();
    await fresh.getByRole('button', { name: 'Salva nei miei oggetti' }).click();
    await expect(fresh).toHaveURL(/\/items\/example-shoes$/);
    await fresh.getByRole('link', { name: 'I miei oggetti' }).click();
    await expect(fresh.getByText('1 oggetto')).toBeVisible();
    await fresh.context().close();
  });

  test('clears everything from the settings', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Carica gli esempi' }).click();
    await expect(page.getByText('Caricati 3 esempi.')).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancella tutto' }).click();
    await expect(page.getByText('Tutto cancellato.')).toBeVisible();
    await page.goto('/');
    await expect(page.getByText('Nessun oggetto valutato, per ora')).toBeVisible();
  });
});
