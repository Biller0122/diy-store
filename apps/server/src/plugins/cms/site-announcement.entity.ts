import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';

@Entity()
export class SiteAnnouncement extends VendureEntity {
  constructor(input?: DeepPartial<SiteAnnouncement>) {
    super(input);
  }

  @Column({ default: 'Үнэгүй хүргэлт' })
  title: string;

  @Column({ type: 'text', default: '₮100,000-с дээш захиалгад УБ дотор үнэгүй хүргэнэ!' })
  message: string;

  @Column({ default: 'Дэлгэрэнгүй →' })
  ctaLabel: string;

  @Column({ default: '/trade' })
  ctaHref: string;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
