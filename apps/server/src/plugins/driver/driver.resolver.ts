import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, Permission, RequestContext } from '@vendure/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, DriverStatus, VehicleType } from './driver.entity';
import { DriverService } from './driver.service';
import type { RegisterDriverInput } from './driver.service';
import { exposeOtp, requirePlatformRole } from '../../utils/auth';

type AdminDriverInput = Partial<Driver> & {
  firstName: string;
  phone: string;
};

@Resolver()
export class DriverResolver {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly driverService: DriverService,
  ) {}

  @Query()
  @Allow(Permission.Public)
  async drivers(@Args('status') status?: DriverStatus) {
    const where = status ? { status } : {};
    return this.driverRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  @Query()
  @Allow(Permission.Public)
  async driver(@Args('id') id: ID) {
    return this.driverService.getDriverById(String(id));
  }

  @Query()
  @Allow(Permission.Public)
  async getDriverProfile(@Args('id') id: ID) {
    return this.driverService.getDriverById(String(id));
  }

  @Query()
  @Allow(Permission.Public)
  async getDriverEarnings(@Args('driverId') driverId: string, @Args('period') period: string) {
    return this.driverService.getDriverEarnings(driverId, period);
  }

  @Query()
  @Allow(Permission.Public)
  async getNearbyDrivers(
    @Args('lat') lat: number,
    @Args('lng') lng: number,
    @Args('radiusKm') radiusKm = 5,
  ) {
    return this.driverService.getAvailableDrivers(lat, lng, radiusKm);
  }

  @Mutation()
  @Allow(Permission.Public)
  async registerDriver(@Args('input') input: RegisterDriverInput) {
    try {
      const driver = await this.driverService.registerDriver(input);
      return { success: true, message: 'Баталгаажуулах код илгээгдлээ', phone: driver.phone, otp: exposeOtp(driver.otpCode) };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Алдаа гарлаа', phone: null, otp: null };
    }
  }

  @Mutation()
  @Allow(Permission.Public)
  async loginDriver(@Args('phone') phone: string) {
    try {
      const driver = await this.driverService.loginDriver(phone);
      return { success: true, message: 'Баталгаажуулах код илгээгдлээ', phone: driver.phone, otp: exposeOtp(driver.otpCode) };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Алдаа гарлаа', phone: null, otp: null };
    }
  }

  @Mutation()
  @Allow(Permission.Public)
  async loginDriverByPassword(@Args('email') email: string, @Args('password') password: string) {
    try {
      const { driver, token } = await this.driverService.loginDriverByPassword(email, password);
      return { success: true, message: 'Амжилттай', driverId: String(driver.id), token };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Нэвтрэхэд алдаа гарлаа', driverId: null, token: null };
    }
  }

  @Mutation()
  @Allow(Permission.Public)
  async verifyDriverOTP(@Args('phone') phone: string, @Args('otp') otp: string) {
    try {
      const { driver, token } = await this.driverService.verifyOTP(phone, otp);
      return { success: true, message: 'Амжилттай', driverId: String(driver.id), token };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Код буруу байна', driverId: null, token: null };
    }
  }

  @Mutation()
  @Allow(Permission.Public)
  async refreshDriverToken(@Args('id') id: ID, @Args('phone') phone: string) {
    try {
      const { driver, token } = await this.driverService.refreshToken(String(id), phone);
      return { success: true, message: 'Амжилттай', driverId: String(driver.id), token };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Дахин нэвтрэх шаардлагатай', driverId: null, token: null };
    }
  }

  @Mutation()
  @Allow(Permission.Public)
  async updateDriverLocation(@Ctx() ctx: RequestContext, @Args('id') id: ID, @Args('lat') lat: number, @Args('lng') lng: number) {
    this.requireDriverOwner(ctx, String(id));
    return this.driverService.updateDriverLocation(String(id), lat, lng);
  }

  @Mutation()
  @Allow(Permission.Public)
  async setOnlineStatus(@Ctx() ctx: RequestContext, @Args('id') id: ID, @Args('isOnline') isOnline: boolean) {
    this.requireDriverOwner(ctx, String(id));
    return this.driverService.setOnlineStatus(String(id), isOnline);
  }

  @Mutation()
  @Allow(Permission.Public)
  async updateDriverStatus(@Ctx() ctx: RequestContext, @Args('id') id: ID, @Args('status') status: DriverStatus) {
    if (ctx.apiType !== 'admin' || !ctx.activeUserId) throw new Error('Админ эрх шаардлагатай');
    return this.driverService.updateDriverStatus(String(id), status);
  }

  @Mutation()
  @Allow(Permission.Public)
  async adminCreateDriver(@Ctx() ctx: RequestContext, @Args('input') input: AdminDriverInput) {
    this.requireAdmin(ctx);
    const phone = String(input.phone ?? '').replace(/\D/g, '').slice(-8);
    if (!/^\d{8}$/.test(phone)) throw new Error('Утасны дугаар 8 оронтой байх ёстой');
    if (await this.driverRepo.findOne({ where: { phone } })) throw new Error('Энэ дугаар бүртгэлтэй байна');
    return this.driverRepo.save(this.driverRepo.create({
      firstName: String(input.firstName ?? '').trim(),
      lastName: String(input.lastName ?? '').trim(),
      phone,
      vehicleType: (input.vehicleType as VehicleType | undefined) ?? VehicleType.MOTORCYCLE,
      vehiclePlate: input.vehiclePlate?.trim() || null,
      vehicleModel: input.vehicleModel?.trim() || null,
      bankName: input.bankName?.trim() || null,
      bankAccount: input.bankAccount?.trim() || null,
      status: input.status ?? DriverStatus.ACTIVE,
      isOnline: input.isOnline ?? false,
      rating: 5,
      totalDeliveries: 0,
      todayEarnings: 0,
      totalEarnings: 0,
    }));
  }

  @Mutation()
  @Allow(Permission.Public)
  async adminUpdateDriver(@Ctx() ctx: RequestContext, @Args('id') id: ID, @Args('input') input: Partial<Driver> & { emailAddress?: string; password?: string }) {
    this.requireAdmin(ctx);
    const driver = await this.driverService.getDriverById(String(id));
    if (!driver) throw new Error('Жолооч олдсонгүй');
    if (input.phone !== undefined) {
      const phone = String(input.phone).replace(/\D/g, '').slice(-8);
      if (!/^\d{8}$/.test(phone)) throw new Error('Утасны дугаар 8 оронтой байх ёстой');
      const existing = await this.driverRepo.findOne({ where: { phone } });
      if (existing && String(existing.id) !== String(id)) throw new Error('Энэ дугаар бүртгэлтэй байна');
      driver.phone = phone;
    }
    if (input.emailAddress !== undefined) {
      const email = input.emailAddress.trim().toLowerCase();
      const existing = await this.driverRepo.findOne({ where: { emailAddress: email } });
      if (existing && String(existing.id) !== String(id)) throw new Error('Энэ и-мэйл бүртгэлтэй байна');
      driver.emailAddress = email || null;
    }
    if (input.password) {
      const bcrypt = await import('bcryptjs');
      driver.passwordHash = await bcrypt.hash(input.password, 10);
    }
    if (input.firstName !== undefined) driver.firstName = String(input.firstName).trim();
    if (input.lastName !== undefined) driver.lastName = String(input.lastName).trim();
    if (input.vehicleType !== undefined) driver.vehicleType = input.vehicleType as VehicleType;
    if (input.vehiclePlate !== undefined) driver.vehiclePlate = input.vehiclePlate?.trim() || null;
    if (input.vehicleModel !== undefined) driver.vehicleModel = input.vehicleModel?.trim() || null;
    if (input.bankName !== undefined) driver.bankName = input.bankName?.trim() || null;
    if (input.bankAccount !== undefined) driver.bankAccount = input.bankAccount?.trim() || null;
    if (input.status !== undefined) driver.status = input.status;
    if (input.isOnline !== undefined) driver.isOnline = input.status === DriverStatus.ACTIVE ? input.isOnline : false;
    if (driver.status !== DriverStatus.ACTIVE) driver.isOnline = false;
    return this.driverRepo.save(driver);
  }

  @Mutation()
  @Allow(Permission.Public)
  async adminDeleteDriver(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
    this.requireAdmin(ctx);
    const result = await this.driverRepo.delete(String(id));
    return (result.affected ?? 0) > 0;
  }

  private requireAdmin(ctx: RequestContext) {
    if (ctx.apiType !== 'admin' || !ctx.activeUserId) throw new Error('Админ эрх шаардлагатай');
  }

  private requireDriverOwner(ctx: RequestContext, driverId: string) {
    const principal = requirePlatformRole(ctx, 'DRIVER');
    if (principal.id !== driverId) throw new Error('Өөр жолоочийн мэдээлэлд хандах эрхгүй');
  }

}
