import {
  exposeOtp,
  generateOTP,
  generateMockableOtp,
  generateToken,
  InMemoryOtpService,
  isOtpMockMode,
  requireRole,
  validatePhone,
  verifyToken,
} from '../utils/auth';

describe('OTP Authentication', () => {
  const originalOtpMockMode = process.env.OTP_MOCK_MODE;

  beforeEach(() => {
    jest.useRealTimers();
    delete process.env.OTP_MOCK_MODE;
  });

  afterAll(() => {
    if (originalOtpMockMode === undefined) {
      delete process.env.OTP_MOCK_MODE;
    } else {
      process.env.OTP_MOCK_MODE = originalOtpMockMode;
    }
  });

  describe('Phone validation', () => {
    test('valid phone 99112233 passes', () => expect(validatePhone('99112233')).toBe(true));
    test('valid phone starting with 8 passes', () => expect(validatePhone('88001122')).toBe(true));
    test('valid phone starting with 7 passes', () => expect(validatePhone('77009988')).toBe(true));
    test('7 digit phone fails', () => expect(validatePhone('9911223')).toBe(false));
    test('9 digit phone fails', () => expect(validatePhone('991122334')).toBe(false));
    test('phone with letters fails', () => expect(validatePhone('9911223a')).toBe(false));
    test('empty phone fails', () => expect(validatePhone('')).toBe(false));
    test('phone starting with 5 fails', () => expect(validatePhone('55001122')).toBe(false));
  });

  describe('OTP generation', () => {
    test('generates 4 digit code', () => expect(generateOTP()).toMatch(/^\d{4}$/));

    test('generates different codes each time', () => {
      const codes = new Set([...Array(20)].map(() => generateOTP()));
      expect(codes.size).toBeGreaterThan(1);
    });

    test('mockable OTP is random and hidden unless OTP_MOCK_MODE is explicit', () => {
      const otp = generateMockableOtp();
      expect(otp).toMatch(/^\d{4}$/);
      expect(exposeOtp(otp)).toBeNull();
      expect(isOtpMockMode()).toBe(false);
    });

    test('mockable OTP returns 1234 only in explicit mock mode', () => {
      process.env.OTP_MOCK_MODE = 'true';
      expect(isOtpMockMode()).toBe(true);
      expect(generateMockableOtp()).toBe('1234');
      expect(exposeOtp('1234')).toBe('1234');
    });
  });

  describe('OTP verification', () => {
    test('correct OTP within 5 min verifies', async () => {
      process.env.OTP_MOCK_MODE = 'true';
      const otpService = new InMemoryOtpService();
      await otpService.sendOTP('99112233');
      await expect(otpService.verifyOTP('99112233', '1234')).resolves.toMatchObject({ success: true });
    });

    test('wrong OTP fails', async () => {
      process.env.OTP_MOCK_MODE = 'true';
      const otpService = new InMemoryOtpService();
      await otpService.sendOTP('99112233');
      const result = await otpService.verifyOTP('99112233', '0000');
      expect(result.success).toBe(false);
      expect(result.message).toContain('буруу');
    });

    test('expired OTP fails', async () => {
      process.env.OTP_MOCK_MODE = 'true';
      jest.useFakeTimers();
      const otpService = new InMemoryOtpService();
      await otpService.sendOTP('99112233');
      jest.advanceTimersByTime(6 * 60 * 1000);
      const result = await otpService.verifyOTP('99112233', '1234');
      expect(result.success).toBe(false);
      expect(result.message).toContain('дууссан');
    });

    test('OTP used twice fails second time', async () => {
      process.env.OTP_MOCK_MODE = 'true';
      const otpService = new InMemoryOtpService();
      await otpService.sendOTP('99112233');
      await otpService.verifyOTP('99112233', '1234');
      const second = await otpService.verifyOTP('99112233', '1234');
      expect(second.success).toBe(false);
    });
  });

  describe('Role isolation', () => {
    test('customer token has CUSTOMER role', () => {
      expect(verifyToken(generateToken({ id: '1', role: 'CUSTOMER' })).role).toBe('CUSTOMER');
    });

    test('supplier token has SUPPLIER role', () => {
      expect(verifyToken(generateToken({ id: '1', role: 'SUPPLIER' })).role).toBe('SUPPLIER');
    });

    test('driver token has DRIVER role', () => {
      expect(verifyToken(generateToken({ id: '1', role: 'DRIVER' })).role).toBe('DRIVER');
    });

    test('customer token cannot access supplier route', () => {
      expect(() => requireRole(generateToken({ id: '1', role: 'CUSTOMER' }), 'SUPPLIER')).toThrow();
    });

    test('supplier token cannot access driver route', () => {
      expect(() => requireRole(generateToken({ id: '1', role: 'SUPPLIER' }), 'DRIVER')).toThrow();
    });

    test('expired token throws error', () => {
      expect(() => verifyToken(generateToken({ id: '1', role: 'CUSTOMER' }, '-1s'))).toThrow();
    });
  });
});
