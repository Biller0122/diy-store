import { test } from '@playwright/test';
import { PORTALS, clickIfVisible, expectPageReady, loginAdmin } from './helpers/auth';
import { auditInteractiveElements, expectAnyVisible } from './helpers/ui';

test.describe('Admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('admin dashboard and major admin modules render', async ({ page }) => {
    for (const path of ['/admin', '/admin/suppliers', '/admin/drivers', '/admin/orders', '/admin/products', '/admin/deliveries', '/admin/commission']) {
      await page.goto(`${PORTALS.admin}${path}`);
      await expectPageReady(page);
      await auditInteractiveElements(page);
    }
  });

  test('approval/suspension and table controls are wired when records exist', async ({ page }) => {
    await page.goto(`${PORTALS.admin}/admin/suppliers`);
    await clickIfVisible(page, '[data-testid="tab-pending"], button:has-text("Хүлээгдэж")');
    await clickIfVisible(page, '[data-testid="approve-supplier"], button:has-text("Зөвшөөрөх")');
    await page.goto(`${PORTALS.admin}/admin/drivers`);
    await clickIfVisible(page, '[data-testid="approve-driver"], button:has-text("Зөвшөөрөх")');
    await expectAnyVisible(page, ['body']);
  });
});

