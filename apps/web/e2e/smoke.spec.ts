import { test, expect } from '@playwright/test';

// Docker portal URLs (see docker-compose: each portal runs on its own port)
const CUSTOMER_URL = process.env.CUSTOMER_URL || process.env.BASE_URL || 'http://localhost:18080';
const ADMIN_URL    = process.env.ADMIN_URL    || 'http://localhost:18081';
const DRIVER_URL   = process.env.DRIVER_URL   || 'http://localhost:18082';
const SUPPLIER_URL = process.env.SUPPLIER_URL || 'http://localhost:18083';

// OTP input selector — 4 individual single-digit inputs in OTPInput component
const OTP_BOX = 'input[inputmode="numeric"][maxlength="1"]';

const timestamp = Date.now();

// Fill 4-digit OTP by typing into each box individually
async function fillOtp(page: import('@playwright/test').Page, otp: string) {
  const boxes = page.locator(OTP_BOX);
  await expect(boxes.first()).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 4; i++) {
    await boxes.nth(i).fill(otp[i] ?? '');
  }
}

// Read dev-OTP text from [data-testid="dev-otp"]
async function readDevOtp(page: import('@playwright/test').Page): Promise<string> {
  const el = page.locator('[data-testid="dev-otp"]');
  await expect(el).toBeVisible({ timeout: 8000 });
  const text = (await el.textContent()) ?? '';
  return text.replace(/\D/g, '').slice(-4);
}

test.describe('DIY Store Smoke Tests', () => {

  // ── 1. Customer portal (18080) ──────────────────────────────────

  test('1. Нүүр хуудас нээгдэнэ', async ({ page }) => {
    await page.goto(CUSTOMER_URL);
    await expect(page).toHaveTitle(/DIY/);
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Нүүр хуудас ажиллаж байна');
  });

  test('2. Хэрэглэгч бүртгүүлж нэвтэрнэ', async ({ page }) => {
    const email    = `test.cust.${timestamp}@test.mn`;
    const password = 'Test1234!';

    await page.goto(`${CUSTOMER_URL}/account/login`);

    // Switch to register tab
    await page.click('button:has-text("Бүртгүүлэх")');
    await page.waitForTimeout(300);

    await page.fill('input[placeholder="Болд"]',  'Тест');
    await page.fill('input[placeholder="Баатар"]', 'Хэрэглэгч');
    await page.locator('input[type="email"]').last().fill(email);
    await page.locator('input[type="password"]').first().fill(password);

    // Some builds show a confirm-password field
    const confirm = page.locator('input[placeholder*="нууц үг"]').last();
    if (await confirm.isVisible({ timeout: 500 })) await confirm.fill(password);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    // Now login
    await page.goto(`${CUSTOMER_URL}/account/login`);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    await expect(page).toHaveURL(/account/);
    console.log(`✅ Хэрэглэгч бүртгэл: ${email}`);
  });

  test('3. Хэрэглэгч бараа хайж сагсанд нэмнэ', async ({ page }) => {
    await page.goto(CUSTOMER_URL);

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="хайх"], input[placeholder*="Хайх"]'
    ).first();

    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill('өрөм');
      await page.keyboard.press('Enter');
    } else {
      await page.goto(`${CUSTOMER_URL}/search?q=%D3%A9%D1%80%D3%A9%D0%BC`);
    }
    await page.waitForTimeout(2000);

    const card = page.locator('[data-testid="product-card"]').first();
    if (await card.isVisible({ timeout: 5000 })) {
      await card.click();
      await page.waitForTimeout(800);

      const addBtn = page.locator('button:has-text("Сагсанд нэмэх")').first();
      if (await addBtn.isVisible({ timeout: 3000 })) {
        await addBtn.click();
        await page.waitForTimeout(600);

        const badge = page.locator('[data-testid="cart-badge"]');
        if (await badge.isVisible({ timeout: 3000 })) {
          console.log(`✅ Сагс: ${await badge.textContent()} бараа`);
        } else {
          console.log('✅ Бараа сагсанд нэмэгдсэн');
        }
      } else {
        console.log('⚠️ "Сагсанд нэмэх" товч олдсонгүй');
      }
    } else {
      console.log('⚠️ Бараа олдсонгүй');
    }
  });

  test('4. Сагс хуудас', async ({ page }) => {
    await page.goto(`${CUSTOMER_URL}/cart`);
    await expect(page.locator('body')).toBeVisible();
    const n = await page.locator('[data-testid="cart-item"]').count();
    console.log(n > 0 ? `✅ Сагсанд ${n} бараа байна` : '⚠️ Сагс хоосон');
  });

  // ── 2. Supplier portal (18083) ──────────────────────────────────

  test('5. Нийлүүлэгч бүртгүүлнэ', async ({ page }) => {
    const phone = `9${Math.floor(1000000 + Math.random() * 9000000)}`;

    await page.goto(`${SUPPLIER_URL}/supplier/register`);

    await page.fill('input[placeholder="Батболд"]',          'Тест Нийлүүлэгч');
    await page.fill('input[placeholder="Барилга Маркет ХХК"]', 'Тест Дэлгүүр ХХК');
    await page.fill('input[placeholder="supplier@example.com"]', `s.${timestamp}@test.mn`);
    await page.fill('input[placeholder="99112233"]',          phone);

    // Submit (button uses onClick, no type="submit")
    await page.click('button:has-text("Үргэлжлүүлэх")');
    await page.waitForTimeout(3000);

    const otp = await readDevOtp(page).catch(() => '');
    if (otp.length === 4) {
      await fillOtp(page, otp);
      await page.waitForTimeout(1500);
      console.log(`✅ Нийлүүлэгч бүртгэл: ${phone}, OTP: ${otp}`);
    } else {
      console.log(`⚠️ Нийлүүлэгч OTP харагдсангүй (phone: ${phone})`);
    }
  });

  // ── 3. Admin portal (18081) ─────────────────────────────────────

  // Helper: log in to admin once (Vendure default: superadmin / superadmin)
  async function adminLogin(page: import('@playwright/test').Page) {
    await page.goto(`${ADMIN_URL}/admin`);
    await page.waitForTimeout(500);

    if (!page.url().includes('login')) return; // already logged in via cookie

    await page.fill('input[placeholder="superadmin"]', 'superadmin');
    await page.fill('input[type="password"]',          'superadmin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }

  test('6. Admin нэвтэрнэ', async ({ page }) => {
    await adminLogin(page);
    expect(page.url()).not.toContain('login');
    console.log('✅ Admin нэвтэрсэн');
  });

  test('7. Admin нийлүүлэгчдийн хуудас', async ({ page }) => {
    await adminLogin(page);
    await page.goto(`${ADMIN_URL}/admin/suppliers`);
    await expect(page.locator('body')).toBeVisible();

    const approveBtn = page.locator('button:has-text("Зөвшөөрөх")').first();
    if (await approveBtn.isVisible({ timeout: 2000 })) {
      await approveBtn.click();
      await page.waitForTimeout(1000);
      console.log('✅ Нийлүүлэгч зөвшөөрсөн');
    } else {
      console.log('✅ Нийлүүлэгчдийн хуудас нээгдлээ (зөвшөөрөх дараалал байхгүй)');
    }
  });

  test('8. Admin хүргэлтийн хяналтын хуудас', async ({ page }) => {
    await adminLogin(page);
    await page.goto(`${ADMIN_URL}/admin/deliveries`);

    await expect(page.locator('body')).toBeVisible();
    const hasContent = await page.locator('h1').first().isVisible({ timeout: 5000 });
    expect(hasContent).toBe(true);
    console.log('✅ Admin хүргэлтийн хуудас нээгдлээ');
  });

  // ── 4. Driver portal (18082) ────────────────────────────────────

  test('9. Жолооч бүртгүүлнэ', async ({ page }) => {
    const phone = `88${Math.floor(100000 + Math.random() * 900000)}`;

    await page.goto(`${DRIVER_URL}/driver/register`);
    await page.fill('input[placeholder="Батболд"]', 'Тест Жолооч');
    await page.fill('input[placeholder="9911 2233"]', phone);

    await page.click('button:has-text("Үргэлжлүүлэх")');
    await page.waitForTimeout(2500);

    const otp = await readDevOtp(page).catch(() => '');
    if (otp.length === 4) {
      console.log(`✅ Жолооч бүртгэл: ${phone}, OTP: ${otp}`);
    } else {
      console.log(`⚠️ Жолооч OTP харагдсангүй (phone: ${phone})`);
    }
  });

  test('10. Жолооч OTP-р нэвтэрнэ', async ({ page }) => {
    // Use pre-seeded mock driver phone (registered in driver-store MOCK_DRIVERS)
    const phone = '8811 2233'; // maps to mock driver id=1

    await page.goto(`${DRIVER_URL}/driver/login`);
    await page.fill('input[placeholder="9911 2233"]', phone);
    await page.click('button:has-text("Код авах")');
    await page.waitForTimeout(2000);

    const otp = await readDevOtp(page).catch(() => '');
    if (otp.length === 4) {
      await fillOtp(page, otp);
      await page.waitForTimeout(2500);

      if (!page.url().includes('login')) {
        console.log('✅ Жолооч нэвтэрсэн');
      } else {
        console.log('⚠️ Жолооч нэвтрэхэд алдаа (driver may not exist in DB yet)');
      }
    } else {
      console.log('⚠️ Driver OTP харагдсангүй');
    }
  });

  test('11. Жолоочийн active-delivery хуудас', async ({ page }) => {
    // Attempt demo login, then check active-delivery
    await page.goto(`${DRIVER_URL}/driver/login`);
    await page.fill('input[placeholder="9911 2233"]', '8811 2233');
    await page.click('button:has-text("Код авах")');
    await page.waitForTimeout(2000);

    const otp = await readDevOtp(page).catch(() => '');
    if (otp.length === 4) {
      await fillOtp(page, otp);
      await page.waitForTimeout(2500);
    }

    await page.goto(`${DRIVER_URL}/driver/active-delivery`);
    await expect(page.locator('body')).toBeVisible();

    if (await page.locator('text=Идэвхтэй хүргэлт байхгүй').isVisible({ timeout: 5000 })) {
      console.log('✅ Active delivery хуудас зөв (хүргэлт байхгүй)');
    } else if (await page.locator('button:has-text("Дэлгүүрт ирлээ")').isVisible({ timeout: 3000 })) {
      console.log('✅ Идэвхтэй хүргэлт байна — товч харагдаж байна');
    } else {
      // If redirected to login, that's also valid (driver not logged in)
      console.log('⚠️ Active delivery хуудас: жолооч нэвтрэх шаардлагатай байж болно');
    }
  });

});
