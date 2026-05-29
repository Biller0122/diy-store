import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryOrderItem, DeliveryRequest, DeliveryStatus, PickupStop } from './delivery-request.entity';
import { generateOrderNumber, dispatchOrder, type DispatchPickupStop } from '../../services/order-dispatch.service';
import { calculateDeliveryFee } from '../../services/delivery-fee.service';

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
    const { In } = await import('typeorm');
    return this.deliveryRepo.find({
      where: { driverId, status: In([DeliveryStatus.ACCEPTED, DeliveryStatus.IN_PROGRESS]) as any },
      order: { createdAt: 'DESC' },
    });
  }

  @Query()
  async availableDeliveries() {
    return this.deliveryRepo.find({
      where: { status: DeliveryStatus.SEARCHING },
      order: { createdAt: 'DESC' },
    });
  }

  @Mutation()
  async createDeliveryRequest(
    @Args('orderId') orderId: string,
    @Args('customerId') customerId: string,
    @Args('customerName') customerName: string,
    @Args('customerPhone') customerPhone: string,
    @Args('dropoffAddress') dropoffAddress: string,
    @Args('dropoffLat') dropoffLat: number,
    @Args('dropoffLng') dropoffLng: number,
    @Args('pickupStops', { nullable: true }) pickupStops: PickupStop[] = [],
    @Args('orderItems', { nullable: true }) orderItems: DeliveryOrderItem[] = [],
    @Args('orderTotal', { nullable: true }) orderTotal = 0,
    @Args('paymentMethod', { nullable: true }) paymentMethod?: string,
  ) {
    const orderNumber = generateOrderNumber();

    const pickupLat = pickupStops[0]?.lat ?? 47.9185;
    const pickupLng = pickupStops[0]?.lng ?? 106.917;
    const feeResult = calculateDeliveryFee(
      pickupStops.length > 0 ? pickupStops : [{ lat: pickupLat, lng: pickupLng }],
      { lat: dropoffLat, lng: dropoffLng },
    );

    const request = this.deliveryRepo.create({
      orderId,
      orderNumber,
      customerId,
      customerName,
      customerPhone,
      dropoffAddress,
      dropoffLat,
      dropoffLng,
      pickupStops: pickupStops.map((stop) => ({ ...stop, status: stop.status ?? 'PENDING' })),
      orderItems,
      orderTotal,
      paymentMethod,
      supplierStatus: 'PENDING',
      status: DeliveryStatus.SEARCHING,
      distance: feeResult.breakdown.totalDistanceKm,
      estimatedDuration: feeResult.estimatedMinutes,
      proposedFee: feeResult.fee,
      finalFee: 0,
    });

    const saved = await this.deliveryRepo.save(request);

    // Fire-and-forget: dispatch to nearest driver via WebSocket
    const dispatchPickupStops: DispatchPickupStop[] = pickupStops.map((s) => ({
      supplierId: s.supplierId,
      name: s.supplierName,
      district: s.district,
      address: s.address,
      phone: (s as PickupStop & { phone?: string }).phone ?? '',
      items: orderItems
        .filter((i) => i.supplierId === s.supplierId)
        .map((i) => ({ name: i.name, qty: i.qty })),
    }));

    const customerInfo = customerName ? {
      name: customerName,
      phone: customerPhone,
      address: dropoffAddress,
      district: dropoffAddress.split(',')[0]?.trim() ?? 'Улаанбаатар',
      khoroo: dropoffAddress.split(',')[1]?.trim(),
    } : undefined;

    void dispatchOrder(
      String(saved.id),
      pickupLat,
      pickupLng,
      customerId,
      dispatchPickupStops,
      customerInfo,
      orderNumber,
      feeResult.fee,
      feeResult.breakdown.totalDistanceKm,
      feeResult.estimatedMinutes,
    )
      .then(async (result) => {
        if (result.status === 'ACCEPTED' && result.driver) {
          await this.deliveryRepo.update(saved.id, {
            driverId: result.driver.id,
            status: DeliveryStatus.ACCEPTED,
          });
        } else if (result.status === 'TIMEOUT') {
          await this.deliveryRepo.update(saved.id, { status: DeliveryStatus.CANCELLED });
        }
      })
      .catch((err) => {
        console.error('[delivery] dispatch error:', err);
      });

    return saved;
  }

  @Mutation()
  async acceptDelivery(
    @Args('deliveryId') deliveryId: string,
    @Args('driverId') driverId: string,
  ) {
    await this.deliveryRepo.update(deliveryId, {
      driverId,
      status: DeliveryStatus.IN_PROGRESS,
    });
    return this.deliveryRepo.findOne({ where: { id: deliveryId } });
  }

  @Mutation()
  async rejectDelivery(
    @Args('deliveryId') deliveryId: string,
    @Args('driverId') driverId: string,
  ) {
    const current = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    await this.deliveryRepo.update(deliveryId, {
      driverId: current?.driverId ?? driverId,
      status: DeliveryStatus.CANCELLED,
    });
    return this.deliveryRepo.findOne({ where: { id: deliveryId } });
  }

  @Mutation()
  async updateDeliveryStatus(
    @Args('deliveryId') deliveryId: string,
    @Args('status') status: DeliveryStatus,
  ) {
    await this.deliveryRepo.update(deliveryId, { status });
    return this.deliveryRepo.findOne({ where: { id: deliveryId } });
  }

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
