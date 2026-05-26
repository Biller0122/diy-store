import {
  CreatePaymentResult,
  LanguageCode,
  PaymentMethodHandler,
  SettlePaymentResult,
  SettlePaymentErrorResult,
} from '@vendure/core';
import { createPaymentRecord, transition } from './payment-state';

// ─── Mock mode detection ──────────────────────────────────────

function isMockMode(): boolean {
  return !process.env.CARD_PSP_URL || process.env.PAYMENT_MOCK_MODE === 'true';
}

// ─── Mock redirect flow ───────────────────────────────────────
// In mock mode: frontend redirects to /checkout/mock-psp which simulates card payment

async function mockCreateSession(orderCode: string, amount: number) {
  // TODO: Replace with real PSP session creation (e.g. Stripe, Golomb, etc.)
  await new Promise((r) => setTimeout(r, 100));
  const sessionId = `MOCK-CARD-${Date.now()}-${orderCode}`;
  return {
    session_id:   sessionId,
    redirect_url: `/checkout/mock-psp?session=${sessionId}&order=${orderCode}&amount=${Math.round(amount / 100)}`,
  };
}

// ─── Real PSP helpers ─────────────────────────────────────────

async function realCreateSession(orderCode: string, amount: number, callbackUrl: string) {
  // TODO: Implement real card PSP integration
  // Example: Stripe Checkout, or Mongolian acquiring bank (Golomt, Khan Bank Merchant)
  const res = await fetch(`${process.env.CARD_PSP_URL}/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CARD_PSP_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchant_id:  process.env.CARD_PSP_MERCHANT_ID,
      order_id:     orderCode,
      amount:       Math.round(amount / 100),
      currency:     'MNT',
      callback_url: callbackUrl,
      return_url:   `${process.env.STOREFRONT_URL}/checkout/success`,
    }),
  });
  if (!res.ok) throw new Error(`Card PSP session failed: ${res.status}`);
  return res.json();
}

async function realCheckSession(sessionId: string) {
  // TODO: Real PSP status check
  const res = await fetch(`${process.env.CARD_PSP_URL}/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${process.env.CARD_PSP_SECRET}` },
  });
  if (!res.ok) throw new Error(`Card PSP check failed: ${res.status}`);
  return res.json();
}

// ─── Vendure handler ──────────────────────────────────────────

export const cardPluginHandler = new PaymentMethodHandler({
  code: 'card',
  description: [{ languageCode: LanguageCode.mn, value: 'Карт' }],

  args: {
    callbackUrl: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'PSP Callback URL' }],
    },
  },

  createPayment: async (ctx, order, amount, args): Promise<CreatePaymentResult> => {
    const record = createPaymentRecord(String(order.id), '', 'card', amount);

    try {
      let session: { session_id: string; redirect_url: string };

      if (isMockMode()) {
        session = await mockCreateSession(String(order.code), amount);
        console.log('[Card MOCK] Created session:', session.session_id);
        console.log('[Card MOCK] Redirect to:', session.redirect_url);
      } else {
        // TODO: Use real PSP when CARD_PSP_URL is set
        session = await (realCreateSession(String(order.code), amount, args.callbackUrl) as Promise<{ session_id: string; redirect_url: string }>);
      }

      const processing = transition(record, 'PROCESSING');

      return {
        amount,
        state: 'Authorized',
        transactionId: session.session_id,
        metadata: {
          mockMode:    isMockMode(),
          sessionId:   session.session_id,
          redirectUrl: session.redirect_url,
          payment:     processing,
        },
      };
    } catch (err: any) {
      return {
        amount,
        state: 'Declined',
        errorMessage: err?.message ?? 'Картын төлбөр эхлүүлэхэд алдаа гарлаа',
        metadata: { error: String(err) },
      };
    }
  },

  settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult | SettlePaymentErrorResult> => {
    try {
      if (isMockMode()) {
        // TODO: Replace with real PSP status check
        console.log('[Card MOCK] settlePayment called for session:', payment.transactionId);
        // Mock PSP page posts back a success callback — accept here
        return { success: true };
      }

      const status = await realCheckSession(payment.transactionId ?? '') as { status: string };
      if (status.status === 'PAID' || status.status === 'CAPTURED') {
        return { success: true };
      }
      return { success: false as const, errorMessage: `Карт PSP: ${status.status}` };
    } catch (err: any) {
      return { success: false as const, errorMessage: err?.message ?? 'Unknown error' };
    }
  },

  cancelPayment: async () => ({ success: true }),
});
