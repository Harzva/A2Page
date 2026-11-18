import { expect, test } from '@playwright/test';

async function createAndOpen(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Send request' }).click();
  await page.getByRole('button', { name: /Launch meeting follow-up Open page/ }).click();
  await expect(page.getByRole('heading', { name: 'Launch meeting follow-up' })).toBeFocused();
}

test('the A2UI page is interactive, updates in place, and survives reload', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await createAndOpen(page);
  await expect(page.getByText('Revision 1')).toBeVisible();
  const docs = page.getByRole('checkbox', { name: 'Lin · Review release notes' });
  await expect(docs).not.toBeChecked();
  await docs.check();
  await expect(docs).toBeChecked();
  await page.getByRole('button', { name: 'Close page' }).click();
  await expect(docs).toHaveCount(0);
  await page.getByRole('button', { name: 'Open latest version' }).click();
  await expect(docs).not.toBeChecked();
  await page.getByLabel('Try an example request').selectOption('risks');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText('Revision 2', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Launch risk:/)).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Updated · Open latest/ }).click();
  await expect(page.getByText('Revision 2', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Launch risk:/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('a stale tab cannot overwrite the latest revision', async ({ page, context }) => {
  await createAndOpen(page);
  const stale = await context.newPage();
  await stale.goto('/');
  await stale.getByRole('button', { name: 'Open latest version' }).click();
  await page.getByLabel('Try an example request').selectOption('risks');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText('Revision 2', { exact: true })).toBeVisible();
  await stale.getByLabel('Try an example request').selectOption('restore');
  await stale.getByRole('button', { name: 'Send request' }).click();
  await expect(stale.getByRole('status')).toContainText('The page has changed');
  await stale.getByRole('button', { name: /Launch meeting follow-up Open page/ }).click();
  await expect(stale.getByText('Revision 2', { exact: true })).toBeVisible();
  await expect(stale.getByText(/^Launch risk:/)).toBeVisible();
});

test('the workspace fits a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 760 });
  await createAndOpen(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expect(page.getByRole('checkbox', { name: 'Lin · Review release notes' })).toBeVisible();
});

test('markup in a saved page stays visible as text, not a DOM element', async ({ page }) => {
  await createAndOpen(page);
  const literal = '<strong>Launch note</strong>';
  await page.evaluate(async text => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('a2page-demo-v1', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('pages', 'readwrite');
      const records = transaction.objectStore('pages');
      const key = ['example', 'launch-meeting', 'launch-follow-up'];
      const request = records.get(key);
      request.onsuccess = () => {
        request.result.surface.createSurface.components.find(node => node.id === 'intro').text = text;
        records.put(request.result, key);
      };
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }, literal);
  await page.reload();
  await page.getByRole('button', { name: 'Open latest version' }).click();
  await expect(page.getByText(literal, { exact: true })).toBeVisible();
  await expect(page.locator('#surface strong')).toHaveCount(0);
});
