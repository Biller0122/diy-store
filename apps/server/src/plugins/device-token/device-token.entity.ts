import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, CreateDateColumn, Entity, Index, UpdateDateColumn } from 'typeorm';

@Entity()
@Index(['recipientType', 'recipientId'])
export class DeviceToken extends VendureEntity {
  constructor(input?: DeepPartial<DeviceToken>) {
    super(input);
  }

  @Column()
  recipientType: 'driver' | 'customer';

  @Column()
  recipientId: string;

  @Column({ type: 'text' })
  token: string;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
