import { expect, test } from '@playwright/test';
import { PORTALS, expectPageReady } from './helpers/auth';

test.describe('Portal links', () => {
  test('global DIYStore logo points to the customer home on every portal', async ({ page }) => {
    const cases = [
      { url: PORTALS.customer, expected: `${PORTALS.customer}/` },
      { url: `${PORTALS.admin}/admin/login`, expected: `${PORTALS.customer}/` },
      { url: `${PORTALS.driver}/driver/login`, expected: `${PORTALS.customer}/` },
      { url: `${PORTALS.supplier}/supplier/login`, expected: `${PORTALS.customer}/` },
    ];

    for (const item of cases) {
      await page.goto(item.url);
      await expectPageReady(page);
      await expect(page.locator('[data-testid="logo"]').first()).toHaveAttribute('href', item.expected);
    }
  });

  test('customer driver button opens the driver login portal', async ({ page }) => {
    await page.goto(PORTALS.customer);
    await expectPageReady(page);

    const driverLink = page.locator('a:has-text("Жолооч")').first();
    await expect(driverLink).toHaveAttribute('href', `${PORTALS.driver}/driver/login`);

    await driverLink.click();
    await expect(page).toHaveURL(new RegExp(`^${PORTALS.driver.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/driver/login`));
    await expect(page.locator('body')).toContainText('Жолоочийн нэвтрэлт');
  });

  test('driver portal root lands on the driver login when logged out', async ({ page }) => {
    await page.goto(PORTALS.driver);
    await expectPageReady(page);

    await expect(page).toHaveURL(new RegExp(`^${PORTALS.driver.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/driver/login`));
    await expect(page.locator('body')).toContainText('Жолоочийн нэвтрэлт');
  });
});
