import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { generateToken } from '../../utils/auth';
import { Driver, DriverStatus, VehicleType } from './driver.entity';
import { DeliveryRequest, DeliveryStatus } from '../delivery/delivery-request.entity';

export interface RegisterDriverInput {
  ownerName: string;
  phone: string;
  email?: string;
  password?: string;
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
    @InjectRepository(DeliveryRequest)
    private readonly deliveryRepo: Repository<DeliveryRequest>,
  ) {}

  async registerDriver(input: RegisterDriverInput) {
    const name = input.ownerName.trim();
    const phone = this.normalizePhone(input.phone);
    if (name.length < 2) throw new Error('Овог нэр 2-оос дээш тэмдэгттэй байх ёстой');
    if (!/^\d{8}$/.test(phone)) throw new Error('Утасны дугаар 8 оронтой байх ёстой');
    if (await this.driverRepo.findOne({ where: { phone } })) throw new Error('Энэ дугаар бүртгэлтэй байна');

    const emailAddress = input.email?.trim().toLowerCase() || null;
    if (emailAddress) {
      if (await this.driverRepo.findOne({ where: { emailAddress } })) throw new Error('Энэ и-мэйл бүртгэлтэй байна');
    }

    const [firstName, ...rest] = name.split(/\s+/);
    const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null;

    const driver = this.driverRepo.create({
      firstName,
      lastName: rest.join(' ') || '',
      phone,
      emailAddress,
      passwordHash,
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
    console.log(`DRIVER REGISTERED: id=${saved.id} name=${saved.firstName} ${saved.lastName}`.trim());
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
    const driver = await this.driverRepo.findOne({ where: { emailAddress: email } });
    if (!driver) throw new Error('И-мэйл эсвэл нууц үг буруу байна');
    if (!driver.passwordHash) throw new Error('Энэ данс нууц үгтэй холбогдоогүй байна. OTP-аар нэвтэрнэ үү.');
    const valid = await bcrypt.compare(password, driver.passwordHash);
    if (!valid) throw new Error('И-мэйл эсвэл нууц үг буруу байна');
    if (driver.status === DriverStatus.SUSPENDED) throw new Error('Таны данс түр хаагдсан байна');
    return { driver, token: generateToken({ id: String(driver.id), role: 'DRIVER' }, '7d') };
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
    return { driver: saved, token: generateToken({ id: String(saved.id), role: 'DRIVER' }, '7d') };
  }

  async refreshToken(id: string, phoneInput: string) {
    const phone = this.normalizePhone(phoneInput);
    const driver = await this.driverRepo.findOne({ where: { id, phone } });
    if (!driver) throw new Error('Жолоочийн session олдсонгүй');
    if (driver.status === DriverStatus.SUSPENDED) throw new Error('Таны данс түр хаагдсан байна');
    return { driver, token: generateToken({ id: String(driver.id), role: 'DRIVER' }, '7d') };
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
    console.log(`DRIVER ONLINE STATUS: id=${driverId} online=${isOnline}`);
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

  async getDriverEarnings(driverId: string, period: string) {
    const driver = await this.getDriverById(driverId);
    if (!driver) throw new Error('Жолооч олдсонгүй');

    const now = new Date();
    let from: Date;
    if (period === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const completedDeliveries = await this.deliveryRepo.find({
      where: {
        driverId,
        status: DeliveryStatus.COMPLETED,
        updatedAt: MoreThanOrEqual(from),
      },
      order: { updatedAt: 'DESC' },
    });

    const totalEarned = completedDeliveries.reduce((sum, d) => sum + (d.proposedFee ?? 0), 0);
    const totalDeliveries = completedDeliveries.length;
    const averageRating = driver.rating;
    const averagePerDelivery = totalDeliveries > 0 ? Math.round(totalEarned / totalDeliveries) : 0;

    const chartMap = new Map<string, { amount: number; count: number }>();
    for (const d of completedDeliveries) {
      const label = this.periodLabel(d.updatedAt, period);
      const existing = chartMap.get(label) ?? { amount: 0, count: 0 };
      chartMap.set(label, { amount: existing.amount + (d.proposedFee ?? 0), count: existing.count + 1 });
    }
    const chart = Array.from(chartMap.entries()).map(([label, { amount, count }]) => ({ label, amount, count }));

    const history = completedDeliveries.slice(0, 30).map((d) => ({
      id: String(d.id),
      orderNumber: d.orderNumber ?? String(d.id),
      date: d.updatedAt.toISOString().split('T')[0],
      supplierDistrict: d.pickupStops?.[0]?.district ?? d.pickupStops?.[0]?.address?.split(',')[0]?.trim() ?? 'Нийлүүлэгч',
      customerDistrict: d.dropoffAddress?.split(',')[0]?.trim() ?? 'Хэрэглэгч',
      customerAddress: d.dropoffAddress ?? '',
      fee: d.proposedFee ?? 0,
      rating: driver.rating,
    }));

    return { totalDeliveries, totalEarned, averageRating, averagePerDelivery, chart, history };
  }

  getDriverById(id: string) {
    return this.driverRepo.findOne({ where: { id } });
  }

  private periodLabel(date: Date, period: string): string {
    if (period === 'today') {
      return `${date.getHours()}:00`;
    } else if (period === 'week') {
      const days = ['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям'];
      return days[date.getDay()];
    } else {
      return `${date.getDate()}-р`;
    }
  }

  private normalizePhone(phone: string) {
    return phone.replace(/\D/g, '').slice(-8);
  }

  private generateOtp() {
    if (process.env.NODE_ENV !== 'production' || process.env.OTP_MOCK_MODE === 'true') return '1234';
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
