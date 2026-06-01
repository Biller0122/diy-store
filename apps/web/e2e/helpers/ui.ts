import { expect, type Locator, type Page } from '@playwright/test';
import { expectPageReady } from './auth';

export async function expectAnyVisible(page: Page, selectors: string[], timeout = 5000): Promise<Locator> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible({ timeout }).catch(() => false)) return locator;
  }
  throw new Error(`None of these selectors became visible: ${selectors.join(', ')}`);
}

export async function findAnyVisible(page: Page, selectors: string[], timeout = 1500): Promise<Locator | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible({ timeout }).catch(() => false)) return locator;
  }
  return null;
}

export async function auditInteractiveElements(page: Page) {
  await expectPageReady(page);
  const controls = page.locator('button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])');
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);

  let labelled = 0;
  let visibleButtonsAndLinks = 0;
  for (let i = 0; i < Math.min(count, 80); i++) {
    const control = controls.nth(i);
    if (!(await control.isVisible().catch(() => false))) continue;
    const tag = await control.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'button' || tag === 'a') {
      visibleButtonsAndLinks += 1;
      const label = ((await control.textContent()) ?? '').trim();
      const aria = await control.getAttribute('aria-label');
      const testId = await control.getAttribute('data-testid');
      if (label || aria || testId) labelled += 1;
    }
  }
  expect(labelled).toBeGreaterThan(0);
  expect(visibleButtonsAndLinks).toBeGreaterThan(0);
}

export async function gotoAndAudit(page: Page, url: string) {
  await page.goto(url);
  await auditInteractiveElements(page);
}
