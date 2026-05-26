import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Transaction } from '@vendure/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryRequest, DeliveryStatus } from './delivery-request.entity';

@Resolver()
export class DeliveryResolver {
  constructor(
    @InjectRepository(DeliveryRequest)
    private deliveryRepo: Repository<DeliveryRequest>,
  ) {}

  @Query()
  async deliveryRequest(@Args('orderId') orderId: string) {
    return this.deliveryRepo.findOne({ where: { orderId } });
  }

  @Query()
  async activeDeliveriesForDriver(@Args('driverId') driverId: string) {
    return this.deliveryRepo.find({
      where: { driverId, status: DeliveryStatus.IN_PROGRESS },
    });
  }

  @Query()
  async availableDeliveries() {
    return this.deliveryRepo.find({
      where: { status: DeliveryStatus.SEARCHING },
      order: { createdAt: 'DESC' },
    });
  }

  @Transaction()
  @Mutation()
  async createDeliveryRequest(
    @Args('orderId') orderId: string,
    @Args('customerId') customerId: string,
    @Args('dropoffAddress') dropoffAddress: string,
    @Args('dropoffLat') dropoffLat: number,
    @Args('dropoffLng') dropoffLng: number,
  ) {
    const request = this.deliveryRepo.create({
      orderId,
      customerId,
      dropoffAddress,
      dropoffLat,
      dropoffLng,
      status: DeliveryStatus.SEARCHING,
      pickupStops: [],
      distance: 0,
      estimatedDuration: 30,
      proposedFee: 500000, // ₮5,000
      finalFee: 0,
    });
    return this.deliveryRepo.save(request);
  }

  @Transaction()
  @Mutation()
  async acceptDelivery(
    @Args('deliveryId') deliveryId: string,
    @Args('driverId') driverId: string,
  ) {
    await this.deliveryRepo.update(deliveryId, {
      driverId,
      status: DeliveryStatus.ACCEPTED,
    });
    return this.deliveryRepo.findOne({ where: { id: deliveryId } });
  }

  @Transaction()
  @Mutation()
  async updateDeliveryStatus(
    @Args('deliveryId') deliveryId: string,
    @Args('status') status: DeliveryStatus,
  ) {
    await this.deliveryRepo.update(deliveryId, { status });
    return this.deliveryRepo.findOne({ where: { id: deliveryId } });
  }

  @Transaction()
  @Mutation()
  async updateDeliveryLocation(
    @Args('deliveryId') deliveryId: string,
    @Args('lat') lat: number,
    @Args('lng') lng: number,
  ) {
    await this.deliveryRepo.update(deliveryId, { driverLat: lat, driverLng: lng });
    return this.deliveryRepo.findOne({ where: { id: deliveryId } });
  }
}
