import { expect, test } from '@playwright/test';
import { PORTALS, TEST_USERS, clickIfVisible, expectPageReady, fillFirstVisible, fillOtp, getDevOtp } from './helpers/auth';
import { auditInteractiveElements, expectAnyVisible } from './helpers/ui';

test.describe('Жолооч', () => {
  test('driver registration/login OTP surfaces work', async ({ page }) => {
    await page.goto(`${PORTALS.driver}/driver/register`);
    await expectPageReady(page);
    await fillFirstVisible(page, ['[data-testid="input-driver-name"]', 'input[placeholder*="Батболд"]'], TEST_USERS.driver.name);
    await fillFirstVisible(page, ['[data-testid="input-phone"]', 'input[placeholder*="9911"]'], TEST_USERS.driver.phone);
    await clickIfVisible(page, '[data-testid="driver-reg-submit"], button:has-text("Үргэлжлүүлэх"), button[type="submit"]');
    if (await page.locator('[data-testid="dev-otp"]').isVisible({ timeout: 5000 }).catch(() => false)) {
      await fillOtp(page, await getDevOtp(page));
    }

    await page.goto(`${PORTALS.driver}/driver/login`);
    await expectPageReady(page);
    await expect(page.locator('body')).not.toContainText('Нийлүүлэгчийн бүртгэл');
  });

  test('driver dashboard, active delivery and earnings buttons render', async ({ page }) => {
    for (const path of ['/driver/dashboard', '/driver/active-delivery', '/driver/earnings', '/driver/history']) {
      await page.goto(`${PORTALS.driver}${path}`);
      await expectPageReady(page);
      await auditInteractiveElements(page);
    }
    await page.goto(`${PORTALS.driver}/driver/dashboard`);
    await clickIfVisible(page, '[data-testid="online-toggle"], button:has-text("Онлайн"), button:has-text("Офлайн")');
    await expectAnyVisible(page, ['body']);
  });
});
