import { expect, type Page } from '@playwright/test';

const TS = Date.now();

export const PORTALS = {
  customer: process.env.CUSTOMER_URL || process.env.BASE_URL || 'http://localhost:18080',
  admin: process.env.ADMIN_URL || 'http://localhost:18081',
  driver: process.env.DRIVER_URL || 'http://localhost:18082',
  supplier: process.env.SUPPLIER_URL || process.env.MERCHANT_URL || 'http://localhost:18083',
};

export const TEST_USERS = {
  customer: {
    email: `e2e.customer.${TS}@test.mn`,
    password: 'Test1234!',
    firstName: 'Тест',
    lastName: 'Хэрэглэгч',
  },
  supplier: {
    email: `e2e.supplier.${TS}@test.mn`,
    phone: `9${Math.floor(1000000 + Math.random() * 8999999)}`,
    ownerName: 'Тест Нийлүүлэгч',
    businessName: 'Тест Дэлгүүр ХХК',
  },
  driver: {
    phone: `8${Math.floor(1000000 + Math.random() * 8999999)}`,
    name: 'Тест Жолооч',
  },
  admin: {
    username: process.env.E2E_ADMIN_USER || 'superadmin',
    password: process.env.E2E_ADMIN_PASSWORD || 'superadmin',
  },
};

export async function expectPageReady(page: Page) {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Internal Server Error/i);
}

export async function clickIfVisible(page: Page, selector: string, timeout = 1500) {
  const locator = page.locator(selector).first();
  if (await locator.isVisible({ timeout }).catch(() => false)) {
    await locator.click({ timeout: 3000 }).catch(() => undefined);
    return true;
  }
  return false;
}

export async function fillFirstVisible(page: Page, selectors: string[], value: string) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
      await locator.fill(value);
      return true;
    }
  }
  return false;
}

export async function getDevOtp(page: Page): Promise<string> {
  const devOtp = page.locator('[data-testid="dev-otp"]');
  if (await devOtp.isVisible({ timeout: 5000 }).catch(() => false)) {
    const text = await devOtp.textContent();
    const otp = text?.replace(/\D/g, '').slice(-4);
    if (otp?.length === 4) return otp;
  }
  return '1234';
}

export async function fillOtp(page: Page, otp: string) {
  const testIdInputs = page.locator('[data-otp-index]');
  if (await testIdInputs.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    for (let i = 0; i < 4; i++) await testIdInputs.nth(i).fill(otp[i] ?? '');
    return;
  }

  const numericInputs = page.locator('input[inputmode="numeric"], input[maxlength="1"]');
  const count = await numericInputs.count();
  if (count >= 4) {
    for (let i = 0; i < 4; i++) await numericInputs.nth(i).fill(otp[i] ?? '');
  }
}

export async function loginAdmin(page: Page) {
  await page.goto(`${PORTALS.admin}/admin/login`);
  await fillFirstVisible(page, ['[data-testid="admin-username"]', 'input[name="username"]', 'input[placeholder*="superadmin"]'], TEST_USERS.admin.username);
  await fillFirstVisible(page, ['[data-testid="admin-password"]', 'input[name="password"]', 'input[type="password"]'], TEST_USERS.admin.password);
  await clickIfVisible(page, '[data-testid="admin-login-submit"], button[type="submit"], button:has-text("Нэвтрэх")');
  await page.waitForLoadState('networkidle').catch(() => undefined);
}
