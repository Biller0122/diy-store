import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';

@Entity()
export class HomepageBanner extends VendureEntity {
  constructor(input?: DeepPartial<HomepageBanner>) {
    super(input);
  }

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  subtitle: string;

  @Column({ nullable: true })
  eyebrow: string;

  @Column({ nullable: true })
  ctaLabel: string;

  @Column({ nullable: true })
  ctaHref: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: '#ff4500' })
  accentColor: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
