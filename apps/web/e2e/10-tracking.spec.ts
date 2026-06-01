import { expect, test } from '@playwright/test';
import { PORTALS, expectPageReady } from './helpers/auth';
import { auditInteractiveElements, expectAnyVisible } from './helpers/ui';

test.describe('Захиалга хянах', () => {
  test('tracking route renders map/timeline/driver state or a clear empty state', async ({ page }) => {
    await page.goto(`${PORTALS.customer}/track/mock-order-1`);
    await expectPageReady(page);
    await expectAnyVisible(page, ['[data-testid="tracking-map"]', '[data-testid="status-timeline"]', 'text=Захиалга', 'text=олдсонгүй']);
    await auditInteractiveElements(page);
  });

  test('order detail route stays stable for mock order id', async ({ page }) => {
    await page.goto(`${PORTALS.customer}/account/orders/mock-order-1`);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error/i);
  });
});
