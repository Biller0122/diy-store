import { expect, test } from '@playwright/test';
import { PORTALS, TEST_USERS, clickIfVisible, expectPageReady, fillFirstVisible, fillOtp, getDevOtp } from './helpers/auth';
import { auditInteractiveElements } from './helpers/ui';

test.describe('Нийлүүлэгч', () => {
  test('supplier registration, OTP and login-only supplier surfaces work', async ({ page }) => {
    await page.goto(`${PORTALS.supplier}/supplier/register`);
    await expectPageReady(page);
    await fillFirstVisible(page, ['[data-testid="input-owner-name"]', 'input[placeholder*="Батболд"]'], TEST_USERS.supplier.ownerName);
    await fillFirstVisible(page, ['[data-testid="input-business-name"]', 'input[placeholder*="Маркет"]'], TEST_USERS.supplier.businessName);
    await fillFirstVisible(page, ['[data-testid="input-email"]', 'input[type="email"]'], TEST_USERS.supplier.email);
    await fillFirstVisible(page, ['[data-testid="input-phone"]', 'input[placeholder*="9911"]'], TEST_USERS.supplier.phone);
    await clickIfVisible(page, '[data-testid="supplier-reg-submit"], button:has-text("Үргэлжлүүлэх"), button[type="submit"]');
    if (await page.locator('[data-testid="dev-otp"]').isVisible({ timeout: 5000 }).catch(() => false)) {
      await fillOtp(page, await getDevOtp(page));
    }
    await auditInteractiveElements(page);

    await page.goto(`${PORTALS.supplier}/supplier/login`);
    await expectPageReady(page);
    await expect(page.locator('body')).not.toContainText('Жолоочийн бүртгэл');
  });

  test('supplier dashboard pages render and expose action buttons', async ({ page }) => {
    for (const path of ['/supplier/dashboard', '/supplier/orders', '/supplier/products', '/supplier/products/new', '/supplier/settings']) {
      await page.goto(`${PORTALS.supplier}${path}`);
      await expectPageReady(page);
      await auditInteractiveElements(page);
    }
  });
});
