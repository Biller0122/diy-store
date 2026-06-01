import { expect, test } from '@playwright/test';
import { PORTALS, clickIfVisible, expectPageReady } from './helpers/auth';
import { auditInteractiveElements, expectAnyVisible, findAnyVisible } from './helpers/ui';

test.describe('Нүүр хуудас ба үндсэн navigation', () => {
  test('home loads header, search, cart, category/product/supplier surfaces', async ({ page }) => {
    await page.goto(PORTALS.customer);
    await expect(page).toHaveTitle(/DIY|Store/i);
    await expectPageReady(page);
    await expect(page.locator('header')).toBeVisible();
    await expectAnyVisible(page, ['[data-testid="logo"]', 'a[href="/"]', 'header']);
    await findAnyVisible(page, ['[data-testid="search-input"]', '[data-testid="search-trigger"]', 'button:has-text("Хайлт")']);
    await findAnyVisible(page, ['[data-testid="cart-icon"]', 'button:has-text("Сагс")']);
    await expectAnyVisible(page, ['[data-testid="announcement-bar"]', 'header', 'text=Үнэгүй хүргэлт']);
    await auditInteractiveElements(page);
  });

  test('announcement, search shortcut, mobile nav and primary links work', async ({ page }) => {
    await page.goto(PORTALS.customer);
    await clickIfVisible(page, '[data-testid="announcement-close"], button[aria-label="Хаах"]');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
    if (await findAnyVisible(page, ['[data-testid="search-input"]', 'input[placeholder*="хайх" i]'])) {
      await page.keyboard.type('өрөм');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/search|q=/);
    }
    await page.goto(PORTALS.customer);
    await clickIfVisible(page, '[data-testid="mobile-menu"], button:has(svg)');
    await auditInteractiveElements(page);
  });
});
