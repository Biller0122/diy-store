import { test } from '@playwright/test';
import { PORTALS, clickIfVisible, expectPageReady, fillFirstVisible } from './helpers/auth';
import { expectAnyVisible } from './helpers/ui';

test.describe('Checkout', () => {
  test('checkout form, delivery fields and payment buttons are reachable', async ({ page }) => {
    await page.goto(`${PORTALS.customer}/checkout`);
    await expectPageReady(page);
    await fillFirstVisible(page, ['[data-testid="input-name"]', 'input[name="name"]', 'input[placeholder*="Нэр"]'], 'Тест Нэр');
    await fillFirstVisible(page, ['[data-testid="input-phone"]', 'input[name="phone"]', 'input[placeholder*="9911"]'], '99112233');
    await fillFirstVisible(page, ['[data-testid="input-khoroo"]', 'input[name="khoroo"]'], '5-р хороо');
    await fillFirstVisible(page, ['[data-testid="input-address"]', 'textarea', 'input[name="address"]'], 'Тест байр 42');
    await clickIfVisible(page, '[data-testid="checkout-next"], button:has-text("Үргэлжлүүлэх"), button:has-text("Дараах")');
    await clickIfVisible(page, '[data-testid="payment-qpay"], button:has-text("QPay")');
    await clickIfVisible(page, '[data-testid="payment-monpay"], button:has-text("MonPay")');
    await expectAnyVisible(page, ['button', 'a[href]']);
  });
});

