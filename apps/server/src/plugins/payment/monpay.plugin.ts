import {
  CreatePaymentResult,
  LanguageCode,
  PaymentMethodHandler,
  SettlePaymentResult,
  SettlePaymentErrorResult,
} from '@vendure/core';
import { createPaymentRecord, paymentMockMode, transition } from './payment-state';

// ─── Mock mode detection (never active in production) ─────────

function isMockMode(): boolean {
  return paymentMockMode(!!process.env.MONPAY_USERNAME);
}

// ─── Mock implementations ─────────────────────────────────────

async function mockCreateInvoice(orderCode: string, amount: number) {
  // TODO: Replace with real MonPay API call when credentials are set
  await new Promise((r) => setTimeout(r, 200));
  const invoiceId = `MOCK-MONPAY-${Date.now()}-${orderCode}`;
  return {
    invoice_id: invoiceId,
    qr_text:    `monpay://q?invoice=${invoiceId}&amount=${Math.round(amount / 100)}`,
    deeplink:   `monpay://q?invoice=${invoiceId}&amount=${Math.round(amount / 100)}`,
    amount:     Math.round(amount / 100),
    status:     'PENDING',
  };
}

// ─── Real API helpers ─────────────────────────────────────────

const MONPAY_BASE = process.env.MONPAY_URL ?? 'https://wallet.monpay.mn';

async function realGetToken(): Promise<string> {
  // TODO: Real MonPay OAuth — plug in when credentials are available
  const res = await fetch(`${MONPAY_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     process.env.MONPAY_CLIENT_ID ?? '',
      client_secret: process.env.MONPAY_CLIENT_SECRET ?? '',
    }),
  });
  if (!res.ok) throw new Error(`MonPay auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function realCreateInvoice(token: string, orderCode: string, amount: number, callbackUrl: string) {
  // TODO: Real MonPay invoice creation
  const res = await fetch(`${MONPAY_BASE}/rest/merchant/invoice`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoice_no:   orderCode,
      amount:       Math.round(amount / 100),
      description:  `DIY Store захиалга #${orderCode}`,
      callback_url: callbackUrl,
    }),
  });
  if (!res.ok) throw new Error(`MonPay invoice failed: ${res.status}`);
  return res.json() as Promise<Awaited<ReturnType<typeof mockCreateInvoice>>>;
}

async function realGetStatus(token: string, invoiceId: string) {
  // TODO: Real MonPay status check
  const res = await fetch(`${MONPAY_BASE}/rest/merchant/invoice/${invoiceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`MonPay status check failed: ${res.status}`);
  return res.json();
}

// ─── Vendure handler ──────────────────────────────────────────

export const monpayPluginHandler = new PaymentMethodHandler({
  code: 'monpay',
  description: [{ languageCode: LanguageCode.mn, value: 'MonPay' }],

  args: {
    callbackUrl: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'Payment Callback URL' }],
    },
  },

  createPayment: async (ctx, order, amount, args): Promise<CreatePaymentResult> => {
    const record = createPaymentRecord(String(order.id), '', 'monpay', amount);

    try {
      let invoice: Awaited<ReturnType<typeof mockCreateInvoice>>;

      if (isMockMode()) {
        invoice = await mockCreateInvoice(String(order.code), amount);
        console.log('[MonPay MOCK] Created invoice:', invoice.invoice_id);
      } else {
        // TODO: Use real API when credentials are set
        const token = await realGetToken();
        invoice = await realCreateInvoice(token, String(order.code), amount, args.callbackUrl);
      }

      const processing = transition(record, 'PROCESSING');

      return {
        amount,
        state: 'Authorized',
        transactionId: invoice.invoice_id,
        metadata: {
          mockMode:  isMockMode(),
          qrText:    invoice.qr_text,
          deeplink:  invoice.deeplink,
          invoiceId: invoice.invoice_id,
          payment:   processing,
        },
      };
    } catch (err: any) {
      return {
        amount,
        state: 'Declined',
        errorMessage: err?.message ?? 'MonPay invoice үүсгэхэд алдаа гарлаа',
        metadata: { error: String(err) },
      };
    }
  },

  settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult | SettlePaymentErrorResult> => {
    try {
      if (isMockMode()) {
        // TODO: Replace with real status check
        console.log('[MonPay MOCK] settlePayment called for invoice:', payment.transactionId);
        return { success: true };
      }

      const token = await realGetToken();
      const status = await realGetStatus(token, payment.transactionId ?? '');

      const s = status as { status: string };
      if (s.status === 'PAID') return { success: true };
      return { success: false as const, errorMessage: `MonPay төлбөр: ${s.status}` };
    } catch (err: any) {
      return { success: false as const, errorMessage: err?.message ?? 'Unknown error' };
    }
  },

  cancelPayment: async () => ({ success: true }),
});
