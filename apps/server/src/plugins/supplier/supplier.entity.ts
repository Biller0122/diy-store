import { VendureEntity, DeepPartial } from '@vendure/core';
import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SupplierStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

@Entity()
export class Supplier extends VendureEntity {
  constructor(input?: DeepPartial<Supplier>) {
    super(input);
  }

  @Column()
  businessName: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  ownerName: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  otpCode: string;

  @Column({ nullable: true })
  otpExpiresAt: Date;

  @Column({ default: 0 })
  otpAttempts: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  district: string;

  @Column({ nullable: true })
  khoroo: string;

  @Column({ type: 'float', nullable: true })
  lat: number;

  @Column({ type: 'float', nullable: true })
  lng: number;

  @Column({ nullable: true })
  bankAccount: string;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankAccountName: string;

  @Column({ nullable: true })
  registrationNumber: string;

  @Column({ type: 'float', default: 10 })
  commissionRate: number;

  @Column({ type: 'varchar', default: SupplierStatus.PENDING_VERIFICATION })
  status: SupplierStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'simple-json', nullable: true })
  workingHours: {
    weekdays: { start: string; end: string };
    saturday: { start: string; end: string };
    sunday: { closed: boolean; start?: string; end?: string };
  };

  @Column({ default: true })
  pickupEnabled: boolean;

  @Column({ default: true })
  deliveryEnabled: boolean;

  @Column({ type: 'simple-json', nullable: true })
  statusHistory: Array<{ status: SupplierStatus; reason?: string; at: string }>;

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  @Column({ default: 0 })
  productCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
