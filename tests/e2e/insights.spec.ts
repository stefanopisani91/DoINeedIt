import { expect, test } from '@playwright/test';

test.describe('insights', () => {
  test('sums up the example items and opens the data table', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Carica tre esempi' }).click();
    await expect(page.getByRole('link', { name: /Scarpe da corsa/ })).toBeVisible();

    await page.goto('/insights');
    await expect(page.getByRole('heading', { name: 'I tuoi numeri' })).toBeVisible();
    await expect(page.getByText('Soldi non spesi')).toBeVisible();
    // The headphones were not bought: 249 € stayed in the pocket.
    await expect(page.getByText('249,00')).toBeVisible();
    await expect(page.getByText('Impulsi fermati')).toBeVisible();

    await page.getByText('Mostra i dati in tabella').first().click();
    await expect(page.getByRole('rowheader', { name: 'Rimanda e riconsidera' })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Da ripensare' })).toBeVisible();
  });

  test('asks for a first evaluation on an empty profile', async ({ page }) => {
    await page.goto('/insights');
    await expect(
      page.getByText('Valuta almeno un prodotto per vedere qualcosa qui.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nuova valutazione' }).first()).toBeVisible();
  });
});
