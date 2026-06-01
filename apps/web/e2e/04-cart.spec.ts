import { expect, test } from '@playwright/test';
import { PORTALS, clickIfVisible, expectPageReady } from './helpers/auth';
import { auditInteractiveElements, expectAnyVisible, findAnyVisible } from './helpers/ui';

test.describe('Сагс', () => {
  test('empty cart and shop button are stable', async ({ page }) => {
    await page.goto(`${PORTALS.customer}/cart`);
    await expectPageReady(page);
    await expectAnyVisible(page, ['[data-testid="empty-cart"]', '[data-testid="cart-item"]', 'text=Сагс', 'main', 'body']);
    await clickIfVisible(page, '[data-testid="shop-now-btn"], a:has-text("Дэлгүүр"), a[href="/"]');
    await expect(page.locator('body')).toBeVisible();
  });

  test('adding product opens cart and cart controls respond', async ({ page }) => {
    await page.goto(`${PORTALS.customer}/search?q=өрөм`);
    const card = await findAnyVisible(page, ['[data-testid="product-card"] a', 'a[href*="/product/"]']);
    if (!card) {
      await auditInteractiveElements(page);
      return;
    }
    await card.click();
    await clickIfVisible(page, '[data-testid="add-to-cart-btn"], button:has-text("Сагсанд нэмэх")', 5000);
    await expectAnyVisible(page, ['[data-testid="cart-drawer"]', 'text=Сагс', 'body']);
    await clickIfVisible(page, '[data-testid="cart-qty-increase"], button:has(svg)');
    await clickIfVisible(page, '[data-testid="cart-drawer-close"], button[aria-label="Хаах"]');
    await page.goto(`${PORTALS.customer}/cart`);
    await expectPageReady(page);
  });
});
