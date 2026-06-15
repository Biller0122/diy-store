const SHOP_API = process.env.NEXT_PUBLIC_VENDURE_SHOP_API || '/shop-api';

export interface QpayInvoice {
  invoiceId: string;
  qrText: string;
  qrImage: string;
  shortUrl: string | null;
  urls: Array<{ name: string | null; description: string | null; logo: string | null; link: string | null }>;
}

export interface QpayStatus {
  paid: boolean;
  count: number;
  paidAmount: number;
}

async function shopGql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(SHOP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message || 'QPay алдаа гарлаа');
  return json.data as T;
}

// amount is in tögrög (₮), orderRef ties the invoice to the order/delivery.
export async function createQpayInvoice(amount: number, orderRef: string): Promise<QpayInvoice> {
  const data = await shopGql<{ createQpayInvoice: QpayInvoice }>(
    `mutation CreateQpayInvoice($amount: Int!, $orderRef: String!) {
      createQpayInvoice(amount: $amount, orderRef: $orderRef) {
        invoiceId qrText qrImage shortUrl urls { name description logo link }
      }
    }`,
    { amount: Math.max(1, Math.round(amount)), orderRef },
  );
  return data.createQpayInvoice;
}

export async function checkQpayPayment(invoiceId: string): Promise<QpayStatus> {
  const data = await shopGql<{ checkQpayPayment: QpayStatus }>(
    `query CheckQpayPayment($invoiceId: String!) {
      checkQpayPayment(invoiceId: $invoiceId) { paid count paidAmount }
    }`,
    { invoiceId },
  );
  return data.checkQpayPayment;
}
