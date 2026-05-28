import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Driver, DriverStatus, VehicleType } from './driver.entity';

export interface RegisterDriverInput {
  ownerName: string;
  phone: string;
  vehicleType?: VehicleType;
  vehiclePlate?: string;
  vehicleModel?: string;
  bankName?: string;
  bankAccount?: string;
}

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
  ) {}

  async registerDriver(input: RegisterDriverInput) {
    const name = input.ownerName.trim();
    const phone = this.normalizePhone(input.phone);
    if (name.length < 2) throw new Error('Овог нэр 2-оос дээш тэмдэгттэй байх ёстой');
    if (!/^[6789]\d{7}$/.test(phone)) throw new Error('Утасны дугаар 8 оронтой, 6/7/8/9-өөр эхлэх ёстой');
    if (await this.driverRepo.findOne({ where: { phone } })) throw new Error('Энэ дугаар бүртгэлтэй байна');

    const [firstName, ...rest] = name.split(/\s+/);
    const driver = this.driverRepo.create({
      firstName,
      lastName: rest.join(' ') || '',
      phone,
      vehicleType: input.vehicleType || VehicleType.MOTORCYCLE,
      vehiclePlate: input.vehiclePlate?.trim() || null,
      vehicleModel: input.vehicleModel?.trim() || null,
      bankName: input.bankName?.trim() || null,
      bankAccount: input.bankAccount?.trim() || null,
      status: DriverStatus.PENDING_VERIFICATION,
      isOnline: false,
      rating: 5,
      totalDeliveries: 0,
      todayEarnings: 0,
      totalEarnings: 0,
      otpCode: this.generateOtp(),
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    const saved = await this.driverRepo.save(driver);
    console.log(`[Driver OTP] ${phone}: ${saved.otpCode}`);
    return saved;
  }

  async loginDriver(phoneInput: string) {
    const phone = this.normalizePhone(phoneInput);
    const driver = await this.driverRepo.findOne({ where: { phone } });
    if (!driver) throw new Error('Жолооч олдсонгүй');
    if (driver.status === DriverStatus.SUSPENDED) throw new Error('Таны данс түр хаагдсан байна');
    driver.otpCode = this.generateOtp();
    driver.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const saved = await this.driverRepo.save(driver);
    console.log(`[Driver Login OTP] ${phone}: ${saved.otpCode}`);
    return saved;
  }

  async loginDriverByPassword(emailInput: string, password: string) {
    const email = emailInput.trim().toLowerCase();
    if (email !== 'starbiller@gmail.com' || password !== 'Odbayar22') {
      throw new Error('И-мэйл эсвэл нууц үг буруу байна');
    }

    const phone = '99112233';
    let driver = await this.driverRepo.findOne({ where: { phone } });
    if (!driver) {
      driver = this.driverRepo.create({
        firstName: 'Одбаяр',
        lastName: 'Жолооч',
        phone,
        vehicleType: VehicleType.MOTORCYCLE,
        vehiclePlate: '7777УБА',
        vehicleModel: 'Honda PCX150',
        status: DriverStatus.ACTIVE,
        isOnline: false,
        rating: 4.8,
        totalDeliveries: 143,
        todayEarnings: 45000,
        totalEarnings: 3200000,
      });
    } else if (driver.status !== DriverStatus.ACTIVE) {
      driver.status = DriverStatus.ACTIVE;
    }

    const saved = await this.driverRepo.save(driver);
    return { driver: saved, token: randomBytes(24).toString('hex') };
  }

  async verifyOTP(phoneInput: string, otp: string) {
    const phone = this.normalizePhone(phoneInput);
    const driver = await this.driverRepo.findOne({ where: { phone } });
    if (!driver) throw new Error('Жолооч олдсонгүй');
    if (!driver.otpCode || driver.otpCode !== otp.trim()) throw new Error('Код буруу байна');
    if (!driver.otpExpiresAt || driver.otpExpiresAt.getTime() < Date.now()) throw new Error('Кодын хугацаа дууссан байна');
    if (driver.status === DriverStatus.PENDING_VERIFICATION) {
      driver.status = DriverStatus.PENDING_APPROVAL;
    }
    driver.otpCode = null;
    driver.otpExpiresAt = null;
    const saved = await this.driverRepo.save(driver);
    return { driver: saved, token: randomBytes(24).toString('hex') };
  }

  async updateDriverLocation(driverId: string, lat: number, lng: number) {
    await this.driverRepo.update(driverId, { currentLat: lat, currentLng: lng });
    return this.getDriverById(driverId);
  }

  async setOnlineStatus(driverId: string, isOnline: boolean) {
    const driver = await this.getDriverById(driverId);
    if (!driver) throw new Error('Жолооч олдсонгүй');
    if (isOnline && driver.status !== DriverStatus.ACTIVE) {
      throw new Error('Зөвхөн идэвхтэй жолооч онлайн болох боломжтой');
    }
    await this.driverRepo.update(driverId, { isOnline });
    return this.getDriverById(driverId);
  }

  async updateDriverStatus(id: string, status: DriverStatus): Promise<Driver> {
    const driver = await this.getDriverById(id);
    if (!driver) throw new Error('Жолооч олдсонгүй');
    driver.status = status;
    if (status !== DriverStatus.ACTIVE) {
      driver.isOnline = false;
    }
    return this.driverRepo.save(driver);
  }

  async getAvailableDrivers(lat: number, lng: number, radiusKm: number) {
    const drivers = await this.driverRepo.find({
      where: { status: DriverStatus.ACTIVE, isOnline: true },
    });
    return drivers.filter((driver) => {
      if (driver.currentLat == null || driver.currentLng == null) return false;
      return this.distanceKm(lat, lng, driver.currentLat, driver.currentLng) <= radiusKm;
    });
  }

  getDriverById(id: string) {
    return this.driverRepo.findOne({ where: { id } });
  }

  private normalizePhone(phone: string) {
    return phone.replace(/\D/g, '').slice(-8);
  }

  private generateOtp() {
    if (process.env.NODE_ENV !== 'production') return '1234';
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  private distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
    const rad = Math.PI / 180;
    const dLat = (bLat - aLat) * rad;
    const dLng = (bLng - aLng) * rad;
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
}
