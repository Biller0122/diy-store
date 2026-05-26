import {
  CreatePaymentResult,
  LanguageCode,
  PaymentMethodHandler,
  SettlePaymentResult,
  SettlePaymentErrorResult,
} from '@vendure/core';
import { createPaymentRecord, transition } from './payment-state';

// ─── Mock mode detection ──────────────────────────────────────
// Automatically active when QPAY_USERNAME is empty or PAYMENT_MOCK_MODE=true

function isMockMode(): boolean {
  return !process.env.QPAY_USERNAME || process.env.PAYMENT_MOCK_MODE === 'true';
}

// ─── Mock data ────────────────────────────────────────────────

const MOCK_INVOICE_ID = 'MOCK-QPAY-INVOICE-001';
const MOCK_QR_TEXT    = 'https://mock.qpay.mn/q/MOCK-QPAY-INVOICE-001';
// Placeholder 200×200 QR-looking image (data URI)
const MOCK_QR_IMAGE   = 'mock_qr_placeholder';

const MOCK_BANK_LINKS = [
  { name: 'Khan Bank',      description: 'Хаан Банк',          logo: 'khanbank',   link: '#' },
  { name: 'Golomt Bank',    description: 'Голомт Банк',         logo: 'golomt',     link: '#' },
  { name: 'TDB',            description: 'Худалдаа Хөгжлийн',  logo: 'tdb',        link: '#' },
  { name: 'State Bank',     description: 'Төрийн Банк',         logo: 'statebank',  link: '#' },
  { name: 'Xac Bank',       description: 'Хас Банк',            logo: 'xacbank',    link: '#' },
  { name: 'Capitron Bank',  description: 'Капитрон Банк',       logo: 'capitron',   link: '#' },
  { name: 'M Bank',         description: 'М Банк',              logo: 'mbank',      link: '#' },
  { name: 'Bogd Bank',      description: 'Богд Банк',           logo: 'bogdbank',   link: '#' },
  { name: 'Ard App',        description: 'Ард Апп',             logo: 'ardapp',     link: '#' },
  { name: 'Most Money',     description: 'МостМани',            logo: 'mostmoney',  link: '#' },
];

// ─── Mock implementations ─────────────────────────────────────

async function mockCreateInvoice(orderCode: string, amount: number) {
  // TODO: Replace with real QPay API call when QPAY_USERNAME is set
  await new Promise((r) => setTimeout(r, 200)); // Simulate network latency
  return {
    invoice_id: `MOCK-${Date.now()}-${orderCode}`,
    qr_text:    MOCK_QR_TEXT,
    qr_image:   MOCK_QR_IMAGE,
    urls:       MOCK_BANK_LINKS,
  };
}

async function mockCheckPayment(invoiceId: string) {
  // TODO: Replace with real QPay /payment/check call
  // In mock mode, payment is always "not yet paid" — frontend dev button triggers success
  return { count: 0, paid_amount: 0, rows: [] };
}

// ─── Real API helpers ─────────────────────────────────────────

const QPAY_BASE = process.env.QPAY_URL ?? 'https://merchant.qpay.mn/v2';

async function realGetToken(): Promise<string> {
  // TODO: Real QPay auth — plug in when credentials are available
  const res = await fetch(`${QPAY_BASE}/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.QPAY_USERNAME}:${process.env.QPAY_PASSWORD}`,
      ).toString('base64')}`,
    },
  });
  if (!res.ok) throw new Error(`QPay auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function realCreateInvoice(token: string, orderCode: string, amount: number, callbackUrl: string) {
  // TODO: Real QPay invoice creation
  const res = await fetch(`${QPAY_BASE}/invoice`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoice_code:          process.env.QPAY_INVOICE_CODE,
      sender_invoice_no:     orderCode,
      invoice_receiver_code: 'terminal',
      invoice_description:   `DIY Store захиалга #${orderCode}`,
      amount:                Math.round(amount / 100),
      callback_url:          callbackUrl,
    }),
  });
  if (!res.ok) throw new Error(`QPay create invoice failed: ${res.status}`);
  return res.json() as Promise<Awaited<ReturnType<typeof mockCreateInvoice>>>;
}

async function realCheckPayment(token: string, invoiceId: string) {
  // TODO: Real QPay payment check
  const res = await fetch(`${QPAY_BASE}/payment/check?id=${invoiceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`QPay check failed: ${res.status}`);
  return res.json() as Promise<{ count: number; rows: Array<{ payment_status: string }> }>;
}

// ─── Vendure handler ──────────────────────────────────────────

export const qpayPluginHandler = new PaymentMethodHandler({
  code: 'qpay',
  description: [{ languageCode: LanguageCode.mn, value: 'QPay' }],

  args: {
    callbackUrl: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'Payment Callback URL' }],
    },
  },

  createPayment: async (ctx, order, amount, args): Promise<CreatePaymentResult> => {
    const record = createPaymentRecord(String(order.id), '', 'qpay', amount);

    try {
      let invoice: Awaited<ReturnType<typeof mockCreateInvoice>>;

      if (isMockMode()) {
        invoice = await mockCreateInvoice(String(order.code), amount);
        console.log('[QPay MOCK] Created invoice:', invoice.invoice_id);
      } else {
        // TODO: Use real API when credentials are set
        const token = await realGetToken();
        invoice = await realCreateInvoice(token, String(order.code), amount, args.callbackUrl);
      }

      const settled = transition(record, 'PROCESSING');

      return {
        amount,
        state: 'Authorized',
        transactionId: invoice.invoice_id,
        metadata: {
          mockMode:  isMockMode(),
          qrText:    invoice.qr_text,
          qrImage:   invoice.qr_image,
          qpayUrls:  invoice.urls,
          invoiceId: invoice.invoice_id,
          payment:   settled,
        },
      };
    } catch (err: any) {
      return {
        amount,
        state: 'Declined',
        errorMessage: err?.message ?? 'QPay invoice үүсгэхэд алдаа гарлаа',
        metadata: { error: String(err) },
      };
    }
  },

  settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult | SettlePaymentErrorResult> => {
    try {
      if (isMockMode()) {
        // TODO: Replace with real status check
        console.log('[QPay MOCK] settlePayment called for invoice:', payment.transactionId);
        // In mock mode, accept settle (frontend sends callback after "Төлбөр дуурайх")
        return { success: true };
      }

      const token = await realGetToken();
      const status = await realCheckPayment(token, payment.transactionId ?? '');

      const s = status as { count: number; rows: Array<{ payment_status: string }> };
      if (s.count > 0 && s.rows[0]?.payment_status === 'PAID') {
        return { success: true };
      }
      return { success: false as const, errorMessage: 'QPay төлбөр хийгдээгүй байна' };
    } catch (err: any) {
      return { success: false as const, errorMessage: err?.message ?? 'Unknown error' };
    }
  },

  cancelPayment: async () => ({ success: true }),
});
