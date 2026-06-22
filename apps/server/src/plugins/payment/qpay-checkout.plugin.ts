import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Permission, PluginCommonModule, VendurePlugin } from '@vendure/core';
import gql from 'graphql-tag';

// Direct QPay v2 checkout for the marketplace's custom (delivery-request) flow:
// create a real invoice/QR and poll its payment status. Credentials come from
// the environment (QPAY_USERNAME / QPAY_PASSWORD / QPAY_INVOICE_CODE) — never
// the repo. QPAY_URL defaults to the live merchant endpoint.

const QPAY_BASE = (process.env.QPAY_URL ?? 'https://merchant.qpay.mn/v2').replace(/\/$/, '');

interface QPayBankUrl { name?: string; description?: string; logo?: string; link?: string }
interface QPayInvoiceResponse { invoice_id: string; qr_text: string; qr_image: string; qPay_shortUrl?: string; urls?: QPayBankUrl[] }
interface QPayCheckResponse { count?: number; paid_amount?: number; rows?: Array<{ payment_status?: string }> }

// QPay issues a token per timestamp and asks that it be reused within validity.
const tokenCache: { token: string; expiresAt: number } = { token: '', expiresAt: 0 };

function qpayConfig() {
  const username = process.env.QPAY_USERNAME;
  const password = process.env.QPAY_PASSWORD;
  const invoiceCode = process.env.QPAY_INVOICE_CODE;
  if (!username || !password || !invoiceCode) {
    throw new Error('QPay тохиргоо дутуу байна (QPAY_USERNAME/QPAY_PASSWORD/QPAY_INVOICE_CODE)');
  }
  return { username, password, invoiceCode };
}

async function qpayToken(): Promise<string> {
  if (tokenCache.token && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const { username, password } = qpayConfig();
  const res = await fetch(`${QPAY_BASE}/auth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` },
  });
  if (!res.ok) throw new Error(`QPay auth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const ttlMs = (Number(data.expires_in) > 0 ? Number(data.expires_in) : 3600) * 1000;
  tokenCache.token = data.access_token;
  tokenCache.expiresAt = Date.now() + ttlMs;
  return data.access_token;
}

@Resolver()
class QpayCheckoutResolver {
  @Mutation()
  @Allow(Permission.Public)
  async createQpayInvoice(@Args('amount') amount: number, @Args('orderRef') orderRef: string) {
    const { invoiceCode } = qpayConfig();
    const token = await qpayToken();
    const base = (process.env.QPAY_CALLBACK_BASE ?? process.env.PRODUCTION_BASE_URL ?? 'https://shoptool.mn').replace(/\/$/, '');
    const callbackUrl = `${base}/qpay/callback?ref=${encodeURIComponent(orderRef)}`;
    const res = await fetch(`${QPAY_BASE}/invoice`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice_code: invoiceCode,
        sender_invoice_no: orderRef,
        invoice_receiver_code: 'terminal',
        invoice_description: `DIY Store ${orderRef}`,
        amount: Math.max(1, Math.round(amount)),
        callback_url: callbackUrl,
      }),
    });
    if (!res.ok) throw new Error(`QPay invoice failed: ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
    const data = (await res.json()) as QPayInvoiceResponse;
    return {
      invoiceId: data.invoice_id,
      qrText: data.qr_text,
      qrImage: data.qr_image,
      shortUrl: data.qPay_shortUrl ?? null,
      urls: (data.urls ?? []).map((u) => ({
        name: u.name ?? null,
        description: u.description ?? null,
        logo: u.logo ?? null,
        link: u.link ?? null,
      })),
    };
  }

  @Query()
  @Allow(Permission.Public)
  async checkQpayPayment(@Args('invoiceId') invoiceId: string) {
    const token = await qpayToken();
    const res = await fetch(`${QPAY_BASE}/payment/check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ object_type: 'INVOICE', object_id: invoiceId, offset: { page_number: 1, page_limit: 100 } }),
    });
    if (!res.ok) throw new Error(`QPay check failed: ${res.status}`);
    const data = (await res.json()) as QPayCheckResponse;
    const paid = (data.count ?? 0) > 0 && (data.rows ?? []).some((r) => r.payment_status === 'PAID');
    return { paid, count: data.count ?? 0, paidAmount: data.paid_amount ?? 0 };
  }
}

const QPAY_CHECKOUT_SCHEMA = gql`
  type QpayBankUrl {
    name: String
    description: String
    logo: String
    link: String
  }
  type QpayInvoiceResult {
    invoiceId: String!
    qrText: String!
    qrImage: String!
    shortUrl: String
    urls: [QpayBankUrl!]!
  }
  type QpayPaymentStatus {
    paid: Boolean!
    count: Int!
    paidAmount: Float!
  }
  extend type Mutation {
    createQpayInvoice(amount: Int!, orderRef: String!): QpayInvoiceResult!
  }
  extend type Query {
    checkQpayPayment(invoiceId: String!): QpayPaymentStatus!
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule],
  shopApiExtensions: { schema: QPAY_CHECKOUT_SCHEMA, resolvers: [QpayCheckoutResolver] },
})
export class QpayCheckoutPlugin {}
