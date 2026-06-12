import { VendureEntity, DeepPartial } from '@vendure/core';
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';

export enum VehicleType {
  MOTORCYCLE = 'MOTORCYCLE',
  CAR = 'CAR',
  VAN = 'VAN',
  TRUCK = 'TRUCK',
}

export enum DriverStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity()
export class Driver extends VendureEntity {
  constructor(input?: DeepPartial<Driver>) {
    super(input);
  }

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true, unique: true })
  emailAddress: string | null;

  @Column({ nullable: true })
  passwordHash: string | null;

  @Column({ unique: true })
  phone: string;

  @Column({ type: 'varchar', default: VehicleType.MOTORCYCLE })
  vehicleType: VehicleType;

  @Column({ nullable: true })
  vehiclePlate: string | null;

  @Column({ nullable: true })
  vehicleModel: string | null;

  @Column({ type: 'varchar', default: DriverStatus.PENDING_VERIFICATION })
  status: DriverStatus;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'float', nullable: true })
  currentLat: number | null;

  @Column({ type: 'float', nullable: true })
  currentLng: number | null;

  @Column({ type: 'float', default: 5 })
  rating: number;

  @Column({ default: 0 })
  totalDeliveries: number;

  @Column({ default: 0 })
  todayEarnings: number;

  @Column({ default: 0 })
  totalEarnings: number;

  @Column({ nullable: true })
  bankName: string | null;

  @Column({ nullable: true })
  bankAccount: string | null;

  @Column({ nullable: true })
  otpCode: string | null;

  @Column({ nullable: true })
  otpExpiresAt: Date | null;

  @Column({ default: 0 })
  otpAttempts: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
