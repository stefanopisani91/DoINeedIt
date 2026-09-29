import { expect, test, type Page } from '@playwright/test';

/**
 * The examples are dated around 20 September 2026 and the air fryer, a
 * "wait", asks to be reconsidered on 16 October: the clock is pinned so the
 * cooling-off reads the same whenever the suite runs.
 */
async function loadExamples(page: Page) {
  await page.clock.setFixedTime(new Date('2026-09-29T10:00:00Z'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Carica tre esempi' }).click();
  await expect(page.getByText('3 oggetti')).toBeVisible();
}

test.describe('item detail', () => {
  test('cooling-off, recorded outcome and deletion', async ({ page }) => {
    await loadExamples(page);
    await page.getByRole('link', { name: /Friggitrice/ }).click();
    await expect(page).toHaveURL(/\/items\/example-airfryer$/);
    await expect(page.getByText('Rimanda e riconsidera', { exact: true })).toBeVisible();
    await expect(page.getByText(/Ripensaci il/)).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Ancora in attesa' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    // Recording an outcome ends the wait; withdrawing it brings the wait back.
    await page.getByRole('radio', { name: 'Non comprato' }).click();
    await expect(page.getByText(/Deciso il/)).toBeVisible();
    await expect(page.getByText(/Ripensaci il/)).toHaveCount(0);
    await page.getByRole('radio', { name: 'Ancora in attesa' }).click();
    await expect(page.getByText(/Deciso il/)).toHaveCount(0);
    await expect(page.getByText(/Ripensaci il/)).toBeVisible();

    // The headphones were recorded as not bought: the result says so.
    await page.getByRole('link', { name: 'I miei oggetti' }).click();
    await page.getByRole('link', { name: /Cuffie/ }).click();
    await expect(page.getByText('Non ti serve', { exact: true })).toBeVisible();
    await expect(page.getByText('Poi deciso: non comprato')).toBeVisible();

    await page.getByRole('button', { name: 'Elimina', exact: true }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Sì, elimina' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('2 oggetti')).toBeVisible();
  });

  test('a shared link offers to evaluate the product yourself', async ({ page, context }) => {
    await loadExamples(page);
    await page.getByRole('link', { name: /Scarpe da corsa/ }).click();
    await expect(page.getByText('Ti serve davvero', { exact: true })).toBeVisible();

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copia link' }).click();
    await expect(page.getByRole('button', { name: 'Link copiato' })).toBeVisible();
    const shared = await page.evaluate(() => navigator.clipboard.readText());
    expect(shared).toContain('/i#');

    const fresh = await (await page.context().browser()!.newContext()).newPage();
    // The product page is not read during the test: the form opens on its own.
    await fresh.route(/\/api\/preview\?url=/, (route) =>
      route.fulfill({ status: 503, json: { ok: false, reason: 'blocked' } }),
    );
    await fresh.goto(shared);
    await expect(fresh.getByText('Valutazione condivisa')).toBeVisible();
    await expect(fresh.getByText(/Condivisa il/)).toBeVisible();
    await expect(fresh.getByText('Poi deciso: comprato')).toBeVisible();
    await expect(fresh.getByText('Le risposte date')).toBeVisible();
    await fresh.getByRole('link', { name: 'Valuta anche tu' }).click();
    await expect(fresh).toHaveURL(/\/new\?url=/);
    await fresh.context().close();
  });
});
