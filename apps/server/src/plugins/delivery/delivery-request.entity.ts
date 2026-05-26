import { VendureEntity, DeepPartial } from '@vendure/core';
import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DeliveryStatus {
  SEARCHING = 'SEARCHING',
  OFFERED = 'OFFERED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface PickupStop {
  supplierId: string;
  supplierName: string;
  address: string;
  lat: number;
  lng: number;
  status: 'PENDING' | 'ARRIVED' | 'PICKED_UP';
}

@Entity()
export class DeliveryRequest extends VendureEntity {
  constructor(input?: DeepPartial<DeliveryRequest>) {
    super(input);
  }

  @Column()
  orderId: string;

  @Column()
  customerId: string;

  @Column({ type: 'jsonb', default: [] })
  pickupStops: PickupStop[];

  @Column({ type: 'text' })
  dropoffAddress: string;

  @Column({ type: 'float' })
  dropoffLat: number;

  @Column({ type: 'float' })
  dropoffLng: number;

  @Column({ type: 'float', default: 0 })
  distance: number;

  @Column({ default: 0 })
  estimatedDuration: number;

  @Column({ default: 0 })
  proposedFee: number;

  @Column({ default: 0 })
  finalFee: number;

  @Column({ type: 'varchar', default: DeliveryStatus.SEARCHING })
  status: DeliveryStatus;

  @Column({ nullable: true })
  driverId: string;

  @Column({ type: 'float', nullable: true })
  driverLat: number;

  @Column({ type: 'float', nullable: true })
  driverLng: number;

  @Column({ nullable: true })
  estimatedArrival: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
