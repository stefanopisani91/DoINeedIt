import { expect, test } from '@playwright/test';

test.describe('English interface', () => {
  test.use({ locale: 'en-US' });

  test('follows the browser language and can be switched in the settings', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('DoINeedIt · Do you really need it?');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/manifest.en.webmanifest',
    );
    await expect(page.getByRole('heading', { name: 'Paste a product link' })).toBeVisible();

    const manifest = await request.get('/manifest.en.webmanifest');
    expect(manifest.ok()).toBe(true);
    expect(await manifest.json()).toMatchObject({
      lang: 'en',
      share_target: { action: '/new', method: 'GET' },
    });

    // The examples, questions and result read in English.
    await page.getByRole('button', { name: 'Load three examples' }).click();
    await expect(page.getByText('3 items')).toBeVisible();
    await page.getByRole('link', { name: /Cushioned running shoes/ }).click();
    await expect(page.getByText('You really need it', { exact: true })).toBeVisible();
    await expect(page.getByText(/It costs 30% of your monthly budget of €400.00/)).toBeVisible();
    await page.getByText('Your answers').click();
    await expect(
      page.getByText('Do you already own something that does the same job?').first(),
    ).toBeVisible();

    // The choice is a browser setting, kept across reloads.
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByLabel('Interface language').selectOption('it');
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible();
    // Every page has its own title; the home keeps the full one.
    await expect(page).toHaveTitle('Impostazioni · DoINeedIt');
    await page.getByRole('link', { name: 'I miei oggetti' }).click();
    await expect(page).toHaveTitle('DoINeedIt · Ti serve davvero?');

    // Items evaluated in one language read in the other.
    await page.getByRole('link', { name: 'I miei oggetti' }).click();
    await page.getByRole('link', { name: /Cushioned running shoes/ }).click();
    await expect(page.getByText('Ti serve davvero', { exact: true })).toBeVisible();
    await page.getByText('Le tue risposte').click();
    await expect(
      page.getByText('Hai già qualcosa che svolge la stessa funzione?').first(),
    ).toBeVisible();
  });

  test('answers the questionnaire in English', async ({ page }) => {
    await page.goto('/new');
    await expect(page.getByText('Describe the product: a few words are enough.')).toBeVisible();
    await page.getByLabel('Product name').fill('Third pair of headphones');
    await page.getByText('Technology', { exact: true }).click();
    await page.getByRole('button', { name: 'Start the questions' }).click();
    await expect(page.getByText('Question 1 · at most')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Do you already own something that does the same job?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Does what you already have still work well?' }),
    ).toBeVisible();
  });
});
