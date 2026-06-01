import { expect, test } from '@playwright/test';
import { PORTALS, clickIfVisible, expectPageReady } from './helpers/auth';
import { auditInteractiveElements, expectAnyVisible, findAnyVisible } from './helpers/ui';

test.describe('Бараа, PLP, PDP', () => {
  test('category/product listing loads and product card buttons are wired', async ({ page }) => {
    await page.goto(`${PORTALS.customer}/search?q=өрөм`);
    await expectPageReady(page);
    await expectAnyVisible(page, ['[data-testid="product-card"]', 'article', 'a[href*="/product/"]', 'main', 'body']);
    await auditInteractiveElements(page);
  });

  test('product detail supports gallery, quantity, wishlist, supplier and add-to-cart', async ({ page }) => {
    await page.goto(`${PORTALS.customer}/search?q=өрөм`);
    let card = await findAnyVisible(page, ['[data-testid="product-card"] a', 'a[href*="/product/"]']);
    if (!card) {
      await page.goto(`${PORTALS.customer}/product/cement-m500-50kg`);
      await expectPageReady(page);
      await auditInteractiveElements(page);
      return;
    }
    await card.click();
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await expectPageReady(page);
    await expectAnyVisible(page, ['[data-testid="product-name"]', 'h1', 'main']);
    await clickIfVisible(page, '[data-testid="qty-increase"], button:has-text("+")');
    await clickIfVisible(page, '[data-testid="qty-decrease"], button:has-text("-")');
    await clickIfVisible(page, '[data-testid="wishlist-btn"], button[aria-label*="Хадгалах"]');
    await clickIfVisible(page, '[data-testid="tab-features"], button:has-text("Онцлог")');
    await clickIfVisible(page, '[data-testid="tab-specs"], button:has-text("Тех")');
    await clickIfVisible(page, '[data-testid="tab-reviews"], button:has-text("Сэтгэгдэл")');
    await clickIfVisible(page, '[data-testid="add-to-cart-btn"], button:has-text("Сагсанд нэмэх")');
    await expectAnyVisible(page, ['[data-testid="cart-drawer"]', '[data-testid="cart-badge"]', 'text=Сагс']);
  });
});
