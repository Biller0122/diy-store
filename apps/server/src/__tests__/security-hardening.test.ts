import { DeliveryResolver } from '../plugins/delivery/delivery.resolver';
import { DeliveryStatus } from '../plugins/delivery/delivery-request.entity';
import { assertPaymentMockModeAllowed, paymentMockMode } from '../plugins/payment/payment-state';
import { generateToken, verifyToken } from '../utils/auth';

describe('Security hardening guards', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPaymentMockMode = process.env.PAYMENT_MOCK_MODE;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalPaymentMockMode === undefined) {
      delete process.env.PAYMENT_MOCK_MODE;
    } else {
      process.env.PAYMENT_MOCK_MODE = originalPaymentMockMode;
    }
  });

  test('payment mock mode is refused in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.PAYMENT_MOCK_MODE = 'true';
    expect(paymentMockMode(false)).toBe(false);
    expect(() => assertPaymentMockModeAllowed()).toThrow(/forbidden/i);
  });

  test('payment mock mode can be used outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.PAYMENT_MOCK_MODE = 'true';
    expect(paymentMockMode(true)).toBe(true);
    expect(() => assertPaymentMockModeAllowed()).not.toThrow();
  });

  test('delivery status state machine blocks invalid backward transition', () => {
    const resolver = new DeliveryResolver({} as any, {} as any) as any;
    expect(() => resolver.assertStatusTransition(DeliveryStatus.COMPLETED, DeliveryStatus.SEARCHING)).toThrow();
    expect(() => resolver.assertStatusTransition(DeliveryStatus.ACCEPTED, DeliveryStatus.SEARCHING)).toThrow();
    expect(() => resolver.assertStatusTransition(DeliveryStatus.ACCEPTED, DeliveryStatus.IN_PROGRESS)).not.toThrow();
  });

  test('realtime token payload can be verified for room ownership checks', () => {
    const token = generateToken({ id: 'driver-1', role: 'DRIVER' }, '5m');
    const payload = verifyToken(token);
    expect(payload).toMatchObject({ id: 'driver-1', role: 'DRIVER' });
  });
});
