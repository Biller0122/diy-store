import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class OrderNumberCounter {
  @PrimaryColumn()
  year: number;

  @Column({ default: 1000 })
  value: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
