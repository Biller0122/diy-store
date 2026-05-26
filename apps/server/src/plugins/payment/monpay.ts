import {
  CreatePaymentResult,
  LanguageCode,
  PaymentMethodHandler,
  SettlePaymentResult,
  SettlePaymentErrorResult,
} from '@vendure/core';

// ─── MonPay API client ────────────────────────────────────────

const MONPAY_BASE = 'https://api.monpay.mn';

interface MonPayToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MonPayInvoice {
  invoice_id: string;
  qr_text: string;
  deeplink: string;
  amount: number;
  status: string;
}

interface MonPayStatus {
  invoice_id: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paid_amount: number;
  paid_date?: string;
}

async function getToken(username: string, password: string): Promise<string> {
  const res = await fetch(`${MONPAY_BASE}/auth/generate_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`MonPay auth failed: ${res.status}`);
  const data = await res.json() as MonPayToken;
  return data.access_token;
}

async function createInvoice(
  token: string,
  acquirerId: string,
  orderCode: string,
  amount: number, // minor units
  callbackUrl: string,
): Promise<MonPayInvoice> {
  const res = await fetch(`${MONPAY_BASE}/merchant/invoice`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      acquirer_id: acquirerId,
      invoice_no: orderCode,
      amount: Math.round(amount / 100), // möngö → tögrög
      description: `DIY Store захиалга #${orderCode}`,
      callback_url: callbackUrl,
    }),
  });
  if (!res.ok) throw new Error(`MonPay invoice failed: ${res.status}`);
  return res.json() as Promise<MonPayInvoice>;
}

async function getInvoiceStatus(token: string, invoiceId: string): Promise<MonPayStatus> {
  const res = await fetch(`${MONPAY_BASE}/merchant/invoice/${invoiceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`MonPay status check failed: ${res.status}`);
  return res.json() as Promise<MonPayStatus>;
}

// ─── Vendure handler ──────────────────────────────────────────

export const monpayPaymentHandler = new PaymentMethodHandler({
  code: 'monpay',
  description: [{ languageCode: LanguageCode.mn, value: 'MonPay' }],

  args: {
    merchantUsername: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'MonPay Merchant Username' }],
    },
    merchantPassword: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'MonPay Merchant Password' }],
    },
    acquirerId: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'MonPay Acquirer ID' }],
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
        args.acquirerId,
        String(order.code),
        amount,
        args.callbackUrl,
      );

      return {
        amount,
        state: 'Authorized',
        transactionId: invoice.invoice_id,
        metadata: {
          invoiceId: invoice.invoice_id,
          qrText:    invoice.qr_text,
          deeplink:  invoice.deeplink,
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
      const token = await getToken(args.merchantUsername, args.merchantPassword);
      const status = await getInvoiceStatus(token, payment.transactionId ?? '');

      if (status.status === 'PAID') {
        return { success: true };
      }
      return {
        success: false as const,
        errorMessage: `MonPay төлбөр: ${status.status}`,
      };
    } catch (err: any) {
      return { success: false as const, errorMessage: err?.message ?? 'Unknown error' };
    }
  },

  cancelPayment: async () => ({ success: true }),
});
