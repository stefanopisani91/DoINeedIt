import { expect, test } from '@playwright/test';

test.describe('the library: search, filters, sort and summary', () => {
  test('finds, filters and sorts the examples, keeping the filter in the URL', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Carica tre esempi' }).click();
    await expect(page.getByText('3 oggetti')).toBeVisible();
    const library = page.getByRole('region', { name: 'I miei oggetti' });
    const cards = library.getByRole('link');
    await expect(cards).toHaveCount(3);

    // Searching narrows the list at once and says how much of it is shown.
    await page.getByLabel('Cerca tra i tuoi oggetti').fill('cuffie');
    await expect(cards).toHaveCount(1);
    await expect(library.getByRole('heading', { name: /Cuffie Bluetooth/ })).toBeVisible();
    await expect(page.getByText('1 su 3 mostrati')).toBeVisible();
    await expect(page).toHaveURL(/\?q=cuffie$/);
    await page.getByRole('button', { name: 'Svuota la ricerca' }).click();
    await expect(cards).toHaveCount(3);
    await expect(page).not.toHaveURL(/q=/);

    // The verdict chips filter too, and the filter survives a reload.
    await page.getByRole('radio', { name: /Non serve/ }).check();
    await expect(cards).toHaveCount(1);
    await expect(library.getByRole('heading', { name: /Cuffie Bluetooth/ })).toBeVisible();
    await expect(page).toHaveURL(/\?v=skip$/);
    await page.reload();
    await expect(page).toHaveURL(/\?v=skip$/);
    await expect(page.getByRole('radio', { name: /Non serve/ })).toBeChecked();
    await expect(cards).toHaveCount(1);
    await page.getByRole('button', { name: 'Azzera i filtri' }).click();
    await expect(cards).toHaveCount(3);
    await expect(page).not.toHaveURL(/v=/);

    // Sorting by highest need puts the shoes first.
    await page.getByLabel('Ordina').selectOption('score-desc');
    await expect(cards.first()).toContainText('Scarpe da corsa');
    await expect(page).toHaveURL(/\?sort=score-desc$/);

    // The summary reads the whole library.
    await expect(page.getByText('impulso fermato', { exact: true })).toBeVisible();
    await expect(page.getByText('valutazioni', { exact: true })).toBeVisible();
  });

  test('shows the welcome panel on a fresh profile until it is dismissed', async ({ page }) => {
    await page.goto('/');
    const welcome = page.getByRole('heading', { name: 'Come funziona, in breve' });
    await expect(welcome).toBeVisible();
    await expect(page.getByText('Nessun oggetto valutato, per ora')).toBeVisible();
    await page.getByRole('button', { name: 'Ho capito' }).click();
    await expect(welcome).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('Nessun oggetto valutato, per ora')).toBeVisible();
    await expect(welcome).toHaveCount(0);
  });
});
