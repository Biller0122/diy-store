import { monpayService, qpayService } from '../utils/payment';

describe('PaymentService', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  describe('QPay Mock', () => {
    test('creates invoice in mock mode', async () => {
      process.env.PAYMENT_MOCK_MODE = 'true';
      const result = await qpayService.createInvoice({
        orderId: 'order_123',
        amount: 50000,
        description: 'DIY Store захиалга',
      });
      expect(result.success).toBe(true);
      expect(result.invoiceId).toBeDefined();
      expect(result.qrCode).toBeDefined();
    });

    test('mock payment auto-confirms', async () => {
      jest.useFakeTimers();
      process.env.PAYMENT_MOCK_MODE = 'true';
      const invoice = await qpayService.createInvoice({ orderId: 'order_123', amount: 50000, description: 'test' });
      jest.advanceTimersByTime(6000);
      const status = await qpayService.checkPayment(invoice.invoiceId);
      expect(status.paid).toBe(true);
    });
  });

  describe('MonPay Mock', () => {
    test('creates invoice in mock mode', async () => {
      process.env.PAYMENT_MOCK_MODE = 'true';
      const result = await monpayService.createInvoice({ orderId: 'order_456', amount: 30000 });
      expect(result.success).toBe(true);
      expect(result.invoiceId).toBeDefined();
    });
  });
});
