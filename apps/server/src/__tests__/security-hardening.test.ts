import { DeliveryResolver } from '../plugins/delivery/delivery.resolver';
import { DeliveryRequest, DeliveryStatus } from '../plugins/delivery/delivery-request.entity';
import { assertPaymentMockModeAllowed, paymentMockMode } from '../plugins/payment/payment-state';
import { CustomerAuthService } from '../plugins/customer-auth/customer-auth.service';
import { CustomerOtp } from '../plugins/customer-auth/customer-otp.entity';
import { exposeOtp, generateMockableOtp, generateToken, verifyToken } from '../utils/auth';
import { createMockRepository } from './test-repo';

describe('Security hardening guards', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPaymentMockMode = process.env.PAYMENT_MOCK_MODE;
  const originalOtpMockMode = process.env.OTP_MOCK_MODE;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalPaymentMockMode === undefined) {
      delete process.env.PAYMENT_MOCK_MODE;
    } else {
      process.env.PAYMENT_MOCK_MODE = originalPaymentMockMode;
    }
    if (originalOtpMockMode === undefined) {
      delete process.env.OTP_MOCK_MODE;
    } else {
      process.env.OTP_MOCK_MODE = originalOtpMockMode;
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

  test('OTP mock code is hidden unless explicit mock mode is enabled', () => {
    delete process.env.OTP_MOCK_MODE;
    const otp = generateMockableOtp();
    expect(otp).toMatch(/^\d{4}$/);
    expect(otp).not.toBe('1234');
    expect(exposeOtp(otp)).toBeNull();

    process.env.OTP_MOCK_MODE = 'true';
    expect(generateMockableOtp()).toBe('1234');
    expect(exposeOtp('1234')).toBe('1234');
  });

  test('customer assertOtp persists wrong attempts and enforces attempt cap', async () => {
    const otpRepo = createMockRepository<CustomerOtp>();
    const service = new CustomerAuthService(
      otpRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    ) as any;
    const otp = await otpRepo.save(otpRepo.create({
      emailAddress: 'customer@example.com',
      otpCode: '1234',
      purpose: 'login',
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      consumed: false,
    }));

    await expect(service.assertOtp(otp, '0000')).rejects.toThrow('Код буруу');
    expect((await otpRepo.findOne({ where: { id: otp.id } }))?.attempts).toBe(1);

    otp.attempts = 5;
    await expect(service.assertOtp(otp, '1234')).rejects.toThrow('Олон удаа буруу');
  });

  test('customer assertOtp checks expiry before counting attempts', async () => {
    const otpRepo = createMockRepository<CustomerOtp>();
    const service = new CustomerAuthService(
      otpRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    ) as any;
    const otp = await otpRepo.save(otpRepo.create({
      emailAddress: 'customer@example.com',
      otpCode: '1234',
      purpose: 'login',
      expiresAt: new Date(Date.now() - 1000),
      attempts: 4,
      consumed: false,
    }));

    await expect(service.assertOtp(otp, '0000')).rejects.toThrow('Кодын хугацаа');
    expect((await otpRepo.findOne({ where: { id: otp.id } }))?.attempts).toBe(4);
  });

  test('delivery status state machine blocks invalid backward transition', () => {
    const resolver = new DeliveryResolver({} as any, {} as any) as any;
    expect(() => resolver.assertStatusTransition(DeliveryStatus.COMPLETED, DeliveryStatus.SEARCHING)).toThrow();
    expect(() => resolver.assertStatusTransition(DeliveryStatus.CANCELLED, DeliveryStatus.IN_PROGRESS)).toThrow();
    expect(() => resolver.assertStatusTransition(DeliveryStatus.ACCEPTED, DeliveryStatus.SEARCHING)).toThrow();
    expect(() => resolver.assertStatusTransition(DeliveryStatus.ACCEPTED, DeliveryStatus.IN_PROGRESS)).not.toThrow();
    expect(() => resolver.assertStatusTransition(DeliveryStatus.IN_PROGRESS, DeliveryStatus.COMPLETED)).not.toThrow();
  });

  test('deliveryRequest requires matching tracking token for anonymous tracking', async () => {
    const delivery = new DeliveryRequest({
      id: 'delivery-1',
      orderId: 'order-1',
      orderNumber: 'DIY-2026-01001',
      trackingToken: 'track-secret',
      customerId: 'customer-1',
      customerName: 'Хэрэглэгч',
      customerPhone: '99112233',
      dropoffAddress: 'Улаанбаатар',
      dropoffLat: 47,
      dropoffLng: 106,
      pickupStops: [],
      orderItems: [],
      status: DeliveryStatus.SEARCHING,
    });
    const repo = {
      async findOne({ where }: { where: Array<Partial<DeliveryRequest>> }) {
        return where.some((condition) => condition.orderId === delivery.orderId || condition.orderNumber === delivery.orderNumber)
          ? delivery
          : null;
      },
    };
    const resolver = new DeliveryResolver(repo as any, {} as any);
    const anonymousCtx = { apiType: 'shop', req: { headers: {} } };

    await expect(resolver.deliveryRequest(anonymousCtx as any, 'DIY-2026-01001')).rejects.toThrow('Хандах эрхгүй');
    await expect(resolver.deliveryRequest(anonymousCtx as any, 'DIY-2026-01001', 'wrong')).rejects.toThrow('Хандах эрхгүй');
    await expect(resolver.deliveryRequest(anonymousCtx as any, 'DIY-2026-01001', 'track-secret')).resolves.toBe(delivery);
  });

  test('realtime token payload can be verified for room ownership checks', () => {
    const token = generateToken({ id: 'driver-1', role: 'DRIVER' }, '5m');
    const payload = verifyToken(token);
    expect(payload).toMatchObject({ id: 'driver-1', role: 'DRIVER' });
  });
});
