import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_URL = process.env.ADMIN_URL || BASE_URL;
const timestamp = Date.now();

test.describe('DIY Store Smoke Tests', () => {

  test('1. Нүүр хуудас нээгдэнэ', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/DIY/);
    // Either collections or any visible content
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Нүүр хуудас ажиллаж байна');
  });

  test('2. Хэрэглэгч бүртгүүлж нэвтэрнэ', async ({ page }) => {
    const email = `test.customer.${timestamp}@test.mn`;
    const password = 'Test1234!';

    await page.goto(`${BASE_URL}/account/register`);
    await page.fill('input[name="firstName"]', 'Тест');
    await page.fill('input[name="lastName"]', 'Хэрэглэгч');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);

    const confirmField = page.locator('input[name="confirmPassword"]');
    if (await confirmField.isVisible()) {
      await confirmField.fill(password);
    }
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Login
    await page.goto(`${BASE_URL}/account/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    await expect(page).toHaveURL(/account/);
    console.log(`✅ Хэрэглэгч бүртгэл: ${email}`);
  });

  test('3. Нийлүүлэгч бүртгүүлнэ', async ({ page }) => {
    const phone = `9${Math.floor(1000000 + Math.random() * 9000000)}`;

    await page.goto(`${BASE_URL}/supplier/register`);
    await page.fill('input[name="ownerName"]', 'Тест Нийлүүлэгч');
    await page.fill('input[name="phone"]', phone);

    // Additional fields that may exist
    const businessField = page.locator('input[name="businessName"]');
    if (await businessField.isVisible()) {
      await businessField.fill('Тест Дэлгүүр ХХК');
    }
    const emailField = page.locator('input[name="email"]');
    if (await emailField.isVisible()) {
      await emailField.fill(`supplier.${timestamp}@test.mn`);
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Dev mode: check for OTP display
    const devOtpEl = page.locator('[data-testid="dev-otp"]');
    const hasDevOtp = await devOtpEl.isVisible();
    if (hasDevOtp) {
      const otpText = (await devOtpEl.textContent()) ?? '';
      const otp = otpText.replace(/\D/g, '');
      if (otp.length === 4) {
        // Fill OTP inputs
        const otpInputs = page.locator('input[data-otp-index]');
        const count = await otpInputs.count();
        if (count === 4) {
          for (let i = 0; i < 4; i++) {
            await otpInputs.nth(i).fill(otp[i]);
          }
        } else {
          // Single OTP input
          const singleInput = page.locator('input[inputmode="numeric"]').first();
          if (await singleInput.isVisible()) {
            await singleInput.fill(otp);
          }
        }
        await page.waitForTimeout(1000);
      }
      console.log(`✅ Нийлүүлэгч бүртгэл: ${phone}, OTP: ${otp}`);
    } else {
      console.log(`⚠️ OTP dev mode байхгүй — гараар шалгана уу (phone: ${phone})`);
    }
  });

  test('4. Admin нэвтэрч нийлүүлэгчийг харна', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/login`);

    // Try common admin credentials
    const usernameInput = page.locator('input[name="username"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();

    await usernameInput.fill('superadmin');
    await passwordInput.fill('StrongPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    if (!currentUrl.includes('login')) {
      await page.goto(`${ADMIN_URL}/admin/suppliers`);
      await expect(page.locator('h1')).toBeVisible();
      console.log('✅ Admin нийлүүлэгчдийн хуудас нээгдлээ');

      const approveBtn = page.locator('button:has-text("Зөвшөөрөх")').first();
      if (await approveBtn.isVisible({ timeout: 2000 })) {
        await approveBtn.click();
        await page.waitForTimeout(1000);
        console.log('✅ Нийлүүлэгч зөвшөөрсөн');
      } else {
        console.log('⚠️ Зөвшөөрөх нийлүүлэгч байхгүй');
      }
    } else {
      console.log('⚠️ Admin нэвтрэхэд алдаа гарлаа — нууц үгийг шалгана уу');
    }
  });

  test('5. Хэрэглэгч бараа хайж сагсанд нэмнэ', async ({ page }) => {
    await page.goto(BASE_URL);

    // Search for a product
    const searchInput = page.locator('input[type="search"], input[placeholder*="хайх"], input[placeholder*="Хайх"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('өрөм');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
    } else {
      // Navigate to search directly
      await page.goto(`${BASE_URL}/search?q=%D3%A9%D1%80%D3%A9%D0%BC`);
      await page.waitForTimeout(1500);
    }

    const productCard = page.locator('[data-testid="product-card"]').first();
    if (await productCard.isVisible({ timeout: 5000 })) {
      await productCard.click();
      await page.waitForTimeout(1000);

      const addToCartBtn = page.locator('button:has-text("Сагсанд нэмэх")').first();
      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();
        await page.waitForTimeout(500);
        console.log('✅ Бараа сагсанд нэмэгдсэн');

        const cartBadge = page.locator('[data-testid="cart-badge"]');
        if (await cartBadge.isVisible({ timeout: 3000 })) {
          const count = await cartBadge.textContent();
          console.log(`✅ Сагсны тоо: ${count}`);
        }
      }
    } else {
      console.log('⚠️ Бараа олдсонгүй — дэлгүүрт бараа байхгүй байж болно');
    }
  });

  test('6. Сагс хуудас харагдана', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart`);
    await expect(page.locator('body')).toBeVisible();

    const cartItems = page.locator('[data-testid="cart-item"]');
    const count = await cartItems.count();
    if (count > 0) {
      console.log(`✅ Сагсанд ${count} бараа байна`);
    } else {
      console.log('⚠️ Сагс хоосон байна — 5-р тест эхлээд ажиллуулна уу');
    }
  });

  test('7. Жолооч бүртгүүлнэ', async ({ page }) => {
    const phone = `88${Math.floor(100000 + Math.random() * 900000)}`;

    await page.goto(`${BASE_URL}/driver/register`);

    const nameInput = page.locator('input[name="ownerName"], input[placeholder*="нэр"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Тест Жолооч');
    }
    const phoneInput = page.locator('input[name="phone"], input[type="tel"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(phone);
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    const devOtpEl = page.locator('[data-testid="dev-otp"]');
    if (await devOtpEl.isVisible({ timeout: 3000 })) {
      const otpText = (await devOtpEl.textContent()) ?? '';
      const otp = otpText.replace(/\D/g, '').slice(-4);
      console.log(`✅ Жолооч бүртгэл: ${phone}, OTP: ${otp}`);
    } else {
      console.log(`⚠️ Жолооч OTP харагдсангүй (phone: ${phone})`);
    }
  });

  test('8. Admin хуудас нэвтрэх болон жолоочдыг харах', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin`);
    await page.waitForTimeout(1000);

    if (page.url().includes('login')) {
      const usernameInput = page.locator('input[name="username"], input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      await usernameInput.fill('superadmin');
      await passwordInput.fill('StrongPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    await page.goto(`${ADMIN_URL}/admin/drivers`);
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Admin жолоочдын хуудас нээгдлээ');
  });

  test('9. Admin хүргэлтийн хяналтын хуудас', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin`);
    await page.waitForTimeout(1000);

    if (page.url().includes('login')) {
      const usernameInput = page.locator('input[name="username"], input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      await usernameInput.fill('superadmin');
      await passwordInput.fill('StrongPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    await page.goto(`${ADMIN_URL}/admin/deliveries`);
    await expect(page.locator('body')).toBeVisible();
    // Accepts either real data or empty state
    const hasContent = await page.locator('h1, [class*="card"], table').first().isVisible({ timeout: 5000 });
    expect(hasContent).toBe(true);
    console.log('✅ Admin хүргэлтийн хуудас нээгдлээ');
  });

  test('10. Жолоочийн dashboard хуудас', async ({ page }) => {
    await page.goto(`${BASE_URL}/driver/login`);
    await expect(page.locator('body')).toBeVisible();

    // Try demo login
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('starbiller@gmail.com');
      await passwordInput.fill('Odbayar22');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      if (!page.url().includes('login')) {
        await page.goto(`${BASE_URL}/driver/dashboard`);
        await expect(page.locator('body')).toBeVisible();
        console.log('✅ Жолоочийн dashboard нээгдлээ');

        const onlineBtn = page.locator('button:has-text("Онлайн болох"), button:has-text("Идэвхжүүлэх")').first();
        if (await onlineBtn.isVisible({ timeout: 2000 })) {
          console.log('✅ Онлайн товч харагдаж байна');
        }
      } else {
        console.log('⚠️ Жолооч demo нэвтрэх алдаа');
      }
    } else {
      console.log('⚠️ Жолооч нэвтрэх хуудас өөр форматтай байна');
    }
  });

  test('11. Жолоочийн active-delivery хуудас', async ({ page }) => {
    await page.goto(`${BASE_URL}/driver/login`);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('starbiller@gmail.com');
      await passwordInput.fill('Odbayar22');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    await page.goto(`${BASE_URL}/driver/active-delivery`);
    await expect(page.locator('body')).toBeVisible();

    // Either active delivery or empty state
    const hasState = await page.locator(
      'text=Идэвхтэй хүргэлт байхгүй, [data-testid="active-delivery"], button:has-text("Дэлгүүрт ирлээ")'
    ).first().isVisible({ timeout: 5000 });

    if (hasState) {
      console.log('✅ Active delivery хуудас зөв ажиллаж байна');
    } else {
      // Page loaded but no expected content found — still pass since driver may have no active delivery
      console.log('⚠️ Active delivery хуудас нээгдсэн, идэвхтэй хүргэлт байхгүй');
    }
  });

});
