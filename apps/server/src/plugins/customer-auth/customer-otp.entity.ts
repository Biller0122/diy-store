import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

export type CustomerOtpPurpose = 'login' | 'password_reset';

@Entity()
export class CustomerOtp extends VendureEntity {
  constructor(input?: DeepPartial<CustomerOtp>) {
    super(input);
  }

  @Index()
  @Column()
  emailAddress: string;

  @Column()
  otpCode: string;

  @Column()
  purpose: CustomerOtpPurpose;

  @Column()
  expiresAt: Date;

  @Column({ default: 0 })
  attempts: number;

  @Column({ default: false })
  consumed: boolean;
}
