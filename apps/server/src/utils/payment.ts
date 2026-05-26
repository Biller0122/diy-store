export interface InvoiceInput {
  orderId: string;
  amount: number;
  description?: string;
}

class MockPaymentService {
  private readonly invoices = new Map<string, { createdAt: number; input: InvoiceInput }>();

  constructor(private readonly prefix: string) {}

  async createInvoice(input: InvoiceInput) {
    const invoiceId = `${this.prefix}_${input.orderId}_${Date.now()}`;
    this.invoices.set(invoiceId, { createdAt: Date.now(), input });
    return {
      success: true,
      invoiceId,
      qrCode: `mock-qr:${invoiceId}`,
      amount: input.amount,
    };
  }

  async checkPayment(invoiceId: string) {
    const invoice = this.invoices.get(invoiceId);
    return {
      paid: Boolean(invoice && Date.now() - invoice.createdAt >= 5_000),
      invoiceId,
    };
  }
}

export const qpayService = new MockPaymentService('qpay');
export const monpayService = new MockPaymentService('monpay');
