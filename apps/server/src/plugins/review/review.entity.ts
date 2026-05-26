import { Column, Entity, Index } from 'typeorm';
import { VendureEntity } from '@vendure/core';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity()
@Index(['productId', 'customerId'], { unique: true })
export class Review extends VendureEntity {
  @Column()
  productId!: string;

  @Column()
  customerId!: string;

  @Column('int')
  rating!: number;

  @Column()
  title!: string;

  @Column('text')
  body!: string;

  @Column({ default: false })
  verifiedPurchase!: boolean;

  @Column({ default: 'PENDING' })
  status!: ReviewStatus;

  @Column('int', { default: 0 })
  helpfulCount!: number;
}
