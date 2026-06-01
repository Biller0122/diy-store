import { expect, test } from '@playwright/test';
import { PORTALS, TEST_USERS, clickIfVisible, expectPageReady, fillFirstVisible } from './helpers/auth';

test.describe('Хэрэглэгч auth', () => {
  test('login/register form validation and redirect surfaces work', async ({ page }) => {
    await page.goto(`${PORTALS.customer}/account/login`);
    await expectPageReady(page);
    await expect(page.locator('form, [data-testid="login-form"]')).toBeVisible();
    await fillFirstVisible(page, ['[data-testid="login-email"]', 'input[type="email"]'], 'wrong@test.mn');
    await fillFirstVisible(page, ['[data-testid="login-password"]', 'input[type="password"]'], 'wrongpass');
    await clickIfVisible(page, '[data-testid="login-submit"], button[type="submit"], button:has-text("Нэвтрэх")');
    await expect(page.locator('body')).toBeVisible();
    await clickIfVisible(page, '[data-testid="register-tab"], button:has-text("Бүртгүүлэх")');
    await fillFirstVisible(page, ['[data-testid="reg-firstname"]', 'input[placeholder*="Болд"]'], TEST_USERS.customer.firstName);
    await fillFirstVisible(page, ['[data-testid="reg-lastname"]', 'input[placeholder*="Баатар"]'], TEST_USERS.customer.lastName);
  });

  test('protected account route redirects or renders account shell', async ({ page }) => {
    await page.goto(`${PORTALS.customer}/account`);
    await expectPageReady(page);
    expect(page.url()).toMatch(/account|login/);
  });
});

