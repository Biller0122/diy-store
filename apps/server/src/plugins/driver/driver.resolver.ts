import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ID } from '@vendure/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, DriverStatus } from './driver.entity';
import { DriverService } from './driver.service';

@Resolver()
export class DriverResolver {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly driverService: DriverService,
  ) {}

  @Query()
  async drivers(@Args('status') status?: DriverStatus) {
    const where = status ? { status } : {};
    return this.driverRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  @Query()
  async driver(@Args('id') id: ID) {
    return this.driverService.getDriverById(String(id));
  }

  @Query()
  async getDriverProfile(@Args('id') id: ID) {
    return this.driverService.getDriverById(String(id));
  }

  @Query()
  async getNearbyDrivers(
    @Args('lat') lat: number,
    @Args('lng') lng: number,
    @Args('radiusKm') radiusKm = 5,
  ) {
    return this.driverService.getAvailableDrivers(lat, lng, radiusKm);
  }

  @Mutation()
  async registerDriver(@Args('ownerName') ownerName: string, @Args('phone') phone: string) {
    try {
      const driver = await this.driverService.registerDriver(ownerName, phone);
      return { success: true, message: 'Баталгаажуулах код илгээгдлээ', phone: driver.phone };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Алдаа гарлаа', phone: null };
    }
  }

  @Mutation()
  async loginDriver(@Args('phone') phone: string) {
    try {
      const driver = await this.driverService.loginDriver(phone);
      return { success: true, message: 'Баталгаажуулах код илгээгдлээ', phone: driver.phone };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Алдаа гарлаа', phone: null };
    }
  }

  @Mutation()
  async verifyDriverOTP(@Args('phone') phone: string, @Args('otp') otp: string) {
    try {
      const { driver, token } = await this.driverService.verifyOTP(phone, otp);
      return { success: true, message: 'Амжилттай', driverId: String(driver.id), token };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Код буруу байна', driverId: null, token: null };
    }
  }

  @Mutation()
  async updateDriverLocation(@Args('id') id: ID, @Args('lat') lat: number, @Args('lng') lng: number) {
    return this.driverService.updateDriverLocation(String(id), lat, lng);
  }

  @Mutation()
  async setOnlineStatus(@Args('id') id: ID, @Args('isOnline') isOnline: boolean) {
    return this.driverService.setOnlineStatus(String(id), isOnline);
  }
}
