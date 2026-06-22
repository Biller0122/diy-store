import { Driver, DriverStatus, VehicleType } from '../plugins/driver/driver.entity';
import { DriverService } from '../plugins/driver/driver.service';
import { createMockRepository } from './test-repo';
import { verifyToken } from '../utils/auth';

function createService() {
  const repo = createMockRepository<Driver>();
  const deliveryRepo = createMockRepository();
  return { repo, driverService: new DriverService(repo as never, deliveryRepo as never) };
}

async function createMockDriver(
  driverService: DriverService,
  status: DriverStatus = DriverStatus.ACTIVE,
  phone = '88001122',
) {
  const driver = await driverService.registerDriver({ ownerName: 'Ганбаатар', phone });
  driver.status = status;
  return driver;
}

describe('DriverService', () => {
  describe('registerDriver', () => {
    test('creates driver with PENDING status', async () => {
      const { driverService } = createService();
      const result = await driverService.registerDriver({ ownerName: 'Ганбаатар', phone: '88001122' });
      expect(result.status).toBe(DriverStatus.PENDING_VERIFICATION);
      expect(result.vehicleType).toBe(VehicleType.MOTORCYCLE);
    });

    test('duplicate phone fails', async () => {
      const { driverService } = createService();
      await driverService.registerDriver({ ownerName: 'Ганбаатар', phone: '88001122' });
      await expect(driverService.registerDriver({ ownerName: 'Дорж', phone: '88001122' })).rejects.toThrow('бүртгэлтэй');
    });
  });

  describe('setOnlineStatus', () => {
    test('active driver can go online', async () => {
      const { driverService } = createService();
      const driver = await createMockDriver(driverService, DriverStatus.ACTIVE);
      await driverService.setOnlineStatus(String(driver.id), true);
      const updated = await driverService.getDriverById(String(driver.id));
      expect(updated?.isOnline).toBe(true);
    });

    test('pending driver cannot go online', async () => {
      const { driverService } = createService();
      const driver = await createMockDriver(driverService, DriverStatus.PENDING_APPROVAL);
      await expect(driverService.setOnlineStatus(String(driver.id), true)).rejects.toThrow('идэвхтэй');
    });

    test('suspended driver cannot go online', async () => {
      const { driverService } = createService();
      const driver = await createMockDriver(driverService, DriverStatus.SUSPENDED);
      await expect(driverService.setOnlineStatus(String(driver.id), true)).rejects.toThrow('идэвхтэй');
    });
  });

  describe('getNearbyDrivers', () => {
    test('returns drivers within radius', async () => {
      const { driverService } = createService();
      const d1 = await createMockDriver(driverService, DriverStatus.ACTIVE, '88001122');
      const d2 = await createMockDriver(driverService, DriverStatus.ACTIVE, '88001123');
      const d3 = await createMockDriver(driverService, DriverStatus.ACTIVE, '88001124');
      Object.assign(d1, { isOnline: true, currentLat: 47.9184, currentLng: 106.9257 });
      Object.assign(d2, { isOnline: true, currentLat: 47.9500, currentLng: 106.9600 });
      Object.assign(d3, { isOnline: true, currentLat: 47.7573, currentLng: 107.2631 });

      const nearby = await driverService.getAvailableDrivers(47.9184, 106.9257, 10);
      expect(nearby).toHaveLength(2);
    });

    test('returns only ONLINE drivers', async () => {
      const { driverService } = createService();
      const online = await createMockDriver(driverService, DriverStatus.ACTIVE, '88001122');
      const offline = await createMockDriver(driverService, DriverStatus.ACTIVE, '88001123');
      Object.assign(online, { isOnline: true, currentLat: 47.9184, currentLng: 106.9257 });
      Object.assign(offline, { isOnline: false, currentLat: 47.9200, currentLng: 106.9300 });

      const nearby = await driverService.getAvailableDrivers(47.9184, 106.9257, 10);
      expect(nearby).toHaveLength(1);
      expect(nearby[0].isOnline).toBe(true);
    });

    test('returns empty array when no drivers', async () => {
      const { driverService } = createService();
      await expect(driverService.getAvailableDrivers(47.9184, 106.9257, 5)).resolves.toEqual([]);
    });
  });

  describe('updateDriverLocation', () => {
    test('updates driver coordinates', async () => {
      const { driverService } = createService();
      const driver = await createMockDriver(driverService, DriverStatus.ACTIVE);
      await driverService.updateDriverLocation(String(driver.id), 47.9200, 106.9300);
      const updated = await driverService.getDriverById(String(driver.id));
      expect(updated?.currentLat).toBe(47.9200);
      expect(updated?.currentLng).toBe(106.9300);
    });
  });

  describe('driver auth token', () => {
    test('wrong OTP persists attempts and caps after five tries', async () => {
      const originalOtpMockMode = process.env.OTP_MOCK_MODE;
      process.env.OTP_MOCK_MODE = 'true';
      const { driverService } = createService();
      try {
        await driverService.registerDriver({ ownerName: 'Ганбаатар', phone: '88001122' });

        await expect(driverService.verifyOTP('88001122', '0000')).rejects.toThrow('Код буруу');
        let driver = await driverService.getDriverById('1');
        expect(driver?.otpAttempts).toBe(1);

        for (let i = 0; i < 4; i++) {
          await expect(driverService.verifyOTP('88001122', '0000')).rejects.toThrow('Код буруу');
        }

        driver = await driverService.getDriverById('1');
        expect(driver?.otpAttempts).toBe(5);
        await expect(driverService.verifyOTP('88001122', '1234')).rejects.toThrow('Олон удаа буруу');
      } finally {
        if (originalOtpMockMode === undefined) delete process.env.OTP_MOCK_MODE;
        else process.env.OTP_MOCK_MODE = originalOtpMockMode;
      }
    });

    test('expired OTP is rejected before attempts are counted', async () => {
      const originalOtpMockMode = process.env.OTP_MOCK_MODE;
      process.env.OTP_MOCK_MODE = 'true';
      const { driverService } = createService();
      try {
        const driver = await driverService.registerDriver({ ownerName: 'Ганбаатар', phone: '88001122' });
        driver.otpExpiresAt = new Date(Date.now() - 1000);

        await expect(driverService.verifyOTP('88001122', '0000')).rejects.toThrow('Кодын хугацаа');
        expect(driver.otpAttempts).toBe(0);
      } finally {
        if (originalOtpMockMode === undefined) delete process.env.OTP_MOCK_MODE;
        else process.env.OTP_MOCK_MODE = originalOtpMockMode;
      }
    });

    test('verified OTP returns signed driver role token', async () => {
      const originalOtpMockMode = process.env.OTP_MOCK_MODE;
      process.env.OTP_MOCK_MODE = 'true';
      const { driverService } = createService();
      try {
        await driverService.registerDriver({ ownerName: 'Ганбаатар', phone: '88001122' });

        const result = await driverService.verifyOTP('88001122', '1234');
        const decoded = verifyToken(result.token);

        expect(decoded.role).toBe('DRIVER');
        expect(decoded.id).toBe(String(result.driver.id));
      } finally {
        if (originalOtpMockMode === undefined) delete process.env.OTP_MOCK_MODE;
        else process.env.OTP_MOCK_MODE = originalOtpMockMode;
      }
    });
  });
});
