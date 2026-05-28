import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, CreateDateColumn, Entity, Index, UpdateDateColumn } from 'typeorm';

@Entity()
export class SupplierProduct extends VendureEntity {
  constructor(input?: DeepPartial<SupplierProduct>) {
    super(input);
  }

  @Index()
  @Column()
  supplierId: string;

  @Column()
  name: string;

  @Index()
  @Column()
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ nullable: true })
  category: string | null;

  @Column({ type: 'text', nullable: true })
  image: string | null;

  @Column()
  price: number;

  @Column({ nullable: true })
  originalPrice: number | null;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
