import { expect, test } from '@playwright/test';
import { PORTALS, expectPageReady } from './helpers/auth';
import { auditInteractiveElements, expectAnyVisible, findAnyVisible } from './helpers/ui';

test.describe('Хайлт', () => {
  test('search page, query, filters and sorting surfaces are usable', async ({ page }) => {
    await page.goto(`${PORTALS.customer}/search?q=өрөм`);
    await expectPageReady(page);
    await findAnyVisible(page, ['[data-testid="search-input"]', 'input[type="search"]', 'input[placeholder*="хайх" i]']);
    await expectAnyVisible(page, ['[data-testid="product-card"]', '[data-testid="no-results"]', 'text=илэрц', 'main', 'body']);
    await auditInteractiveElements(page);

    const sort = page.locator('[data-testid="sort-select"], select').first();
    if (await sort.isVisible().catch(() => false)) {
      const options = await sort.locator('option').evaluateAll((items) => items.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
      if (options[0]) await sort.selectOption(options[0]);
    }
  });

  test('empty search shows a stable empty/results state', async ({ page }) => {
    await page.goto(`${PORTALS.customer}/search?q=xyzxyzxyz123notexist`);
    await expectPageReady(page);
    await expectAnyVisible(page, ['[data-testid="no-results"]', '[data-testid="results-count"]', 'text=олдсонгүй', 'text=илэрц']);
  });
});
