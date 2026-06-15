import {
  CreatePaymentResult,
  LanguageCode,
  PaymentMethodHandler,
  SettlePaymentResult,
  SettlePaymentErrorResult,
} from '@vendure/core';

// ─── QPay v2 API client ───────────────────────────────────────

const QPAY_BASE = 'https://merchant.qpay.mn/v2';

interface QPayToken {
  access_token: string;
  expires_in: number;
}

interface QPayInvoice {
  invoice_id: string;
  qr_text: string;
  qr_image: string; // base64
  urls: Array<{ name: string; description: string; logo: string; link: string }>;
}

interface QPayCheck {
  count: number;
  paid_amount: number;
  rows: Array<{ payment_id: string; payment_status: string; payment_date: string }>;
}

// QPay warns the token must be reused within its validity window (it is issued
// per timestamp), so cache it per merchant and only re-auth when near expiry.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getToken(username: string, password: string): Promise<string> {
  const cached = tokenCache.get(username);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }
  const res = await fetch(`${QPAY_BASE}/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    },
  });
  if (!res.ok) throw new Error(`QPay auth failed: ${res.status}`);
  const data = await res.json() as QPayToken;
  const ttlMs = (Number(data.expires_in) > 0 ? Number(data.expires_in) : 3600) * 1000;
  tokenCache.set(username, { token: data.access_token, expiresAt: Date.now() + ttlMs });
  return data.access_token;
}

async function createInvoice(
  token: string,
  invoiceCode: string,
  orderCode: string,
  amount: number,         // minor units (möngö)
  callbackUrl: string,
): Promise<QPayInvoice> {
  const res = await fetch(`${QPAY_BASE}/invoice`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      invoice_code: invoiceCode,
      sender_invoice_no: orderCode,
      invoice_receiver_code: 'terminal',
      invoice_description: `DIY Store захиалга #${orderCode}`,
      amount: Math.round(amount / 100), // convert möngö → tögrög
      callback_url: callbackUrl,
    }),
  });
  if (!res.ok) throw new Error(`QPay create invoice failed: ${res.status}`);
  return res.json() as Promise<QPayInvoice>;
}

async function checkPayment(token: string, invoiceId: string): Promise<QPayCheck> {
  // QPay v2: POST /payment/check with a JSON body keyed by the invoice object.
  const res = await fetch(`${QPAY_BASE}/payment/check`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      object_type: 'INVOICE',
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    }),
  });
  if (!res.ok) throw new Error(`QPay check failed: ${res.status}`);
  return res.json() as Promise<QPayCheck>;
}

// ─── Vendure handler ──────────────────────────────────────────

export const qpayPaymentHandler = new PaymentMethodHandler({
  code: 'qpay',
  description: [{ languageCode: LanguageCode.mn, value: 'QPay' }],

  args: {
    merchantUsername: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'QPay Merchant Username' }],
    },
    merchantPassword: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'QPay Merchant Password' }],
    },
    invoiceCode: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'QPay Invoice Code' }],
    },
    callbackUrl: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'Payment Callback URL' }],
    },
  },

  createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
    try {
      const token = await getToken(args.merchantUsername, args.merchantPassword);
      const invoice = await createInvoice(
        token,
        args.invoiceCode,
        String(order.code),
        amount,
        args.callbackUrl,
      );

      return {
        amount,
        state: 'Authorized',
        transactionId: invoice.invoice_id,
        metadata: {
          qrText:    invoice.qr_text,
          qrImage:   invoice.qr_image,
          qpayUrls:  invoice.urls,
          invoiceId: invoice.invoice_id,
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
      const token = await getToken(args.merchantUsername, args.merchantPassword);
      const status = await checkPayment(token, payment.transactionId ?? '');

      if (status.count > 0 && status.rows[0]?.payment_status === 'PAID') {
        return { success: true };
      }
      return { success: false as const, errorMessage: 'QPay төлбөр хийгдээгүй байна' };
    } catch (err: any) {
      return { success: false as const, errorMessage: err?.message ?? 'Unknown error' };
    }
  },

  cancelPayment: async () => ({ success: true }),
});
