import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Ctx, RequestContext } from '@vendure/core';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DeliveryOrderItem, DeliveryRequest, DeliveryStatus, PickupStop } from './delivery-request.entity';
import { dispatchOrder, type DispatchPickupStop } from '../../services/order-dispatch.service';
import { generateOrderNumber } from '../../services/order-number.service';
import { calculateDeliveryFee } from '../../services/delivery-fee.service';
import { emitToOrder, handleDriverOfferDecision } from '../realtime.plugin';
import { requirePlatformRole } from '../../utils/auth';
import { Driver, DriverStatus } from '../driver/driver.entity';
import { SupplierProduct } from '../supplier/supplier-product.entity';

@Resolver()
export class DeliveryResolver {
  constructor(
    @InjectRepository(DeliveryRequest)
    private deliveryRepo: Repository<DeliveryRequest>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Query()
  async deliveryRequest(@Args('orderId') orderId: string) {
    return this.deliveryRepo.findOne({
      where: [{ orderId }, { orderNumber: orderId }],
    });
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
  async deliveryHistoryForDriver(@Args('driverId') driverId: string, @Args('limit', { nullable: true }) limit = 50) {
    const { In } = await import('typeorm');
    return this.deliveryRepo.find({
      where: { driverId, status: In([DeliveryStatus.COMPLETED, DeliveryStatus.CANCELLED]) as any },
      order: { updatedAt: 'DESC' },
      take: Math.max(1, Math.min(100, limit || 50)),
    });
  }

  @Query()
  async availableDeliveries() {
    return this.deliveryRepo.find({
      where: { status: DeliveryStatus.SEARCHING },
      order: { createdAt: 'DESC' },
    });
  }

  @Query()
  async getActiveDeliveries() {
    const { In } = await import('typeorm');
    return this.deliveryRepo.find({
      where: { status: In([DeliveryStatus.SEARCHING, DeliveryStatus.ACCEPTED, DeliveryStatus.IN_PROGRESS]) as any },
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
    const orderNumber = await generateOrderNumber(this.dataSource);

    const pickupLat = pickupStops[0]?.lat ?? 47.9185;
    const pickupLng = pickupStops[0]?.lng ?? 106.917;
    const feeResult = calculateDeliveryFee(
      pickupStops.length > 0 ? pickupStops : [{ lat: pickupLat, lng: pickupLng }],
      { lat: dropoffLat, lng: dropoffLng },
    );

    await this.reserveSupplierStock(orderItems);

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
      deliveryCode: this.generateDeliveryCode(),
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
    const onlineDriversFromDb = (await this.dataSource.getRepository(Driver).find({
      where: { status: DriverStatus.ACTIVE, isOnline: true },
    })).map((driver) => ({
      id: String(driver.id),
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      vehiclePlate: driver.vehiclePlate ?? '',
      rating: driver.rating,
      lat: driver.currentLat ?? pickupLat,
      lng: driver.currentLng ?? pickupLng,
    }));

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
      onlineDriversFromDb,
    )
      .then(async (result) => {
        if (result.status === 'ACCEPTED' && result.driver) {
          const current = await this.deliveryRepo.findOne({ where: { id: saved.id } });
          if (current?.status === DeliveryStatus.SEARCHING) {
            await this.deliveryRepo.update(saved.id, {
              driverId: result.driver.id,
              status: DeliveryStatus.ACCEPTED,
            });
          }
        } else if (result.status === 'TIMEOUT') {
          const current = await this.deliveryRepo.findOne({ where: { id: saved.id } });
          if (current?.status === DeliveryStatus.SEARCHING) {
            await this.deliveryRepo.update(saved.id, { status: DeliveryStatus.CANCELLED });
          }
        }
      })
      .catch((err) => {
        console.error('[delivery] dispatch error:', err);
      });

    return saved;
  }

  @Mutation()
  async acceptDelivery(
    @Ctx() ctx: RequestContext,
    @Args('deliveryId') deliveryId: string,
    @Args('driverId') driverId: string,
  ) {
    this.requireDriverOwner(ctx, driverId);
    const current = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!current) throw new Error('Хүргэлт олдсонгүй');
    if (![DeliveryStatus.SEARCHING, DeliveryStatus.ACCEPTED].includes(current.status)) {
      throw new Error('Энэ хүргэлтийг авах боломжгүй байна');
    }
    handleDriverOfferDecision('accept', { driverId, orderId: deliveryId });
    await this.deliveryRepo.update(deliveryId, {
      driverId,
      status: DeliveryStatus.ACCEPTED,
    });
    emitToOrder(current.orderId, 'order:status', { orderId: current.orderId, status: DeliveryStatus.ACCEPTED });
    if (current.orderNumber) {
      emitToOrder(current.orderNumber, 'order:status', { orderId: current.orderNumber, status: DeliveryStatus.ACCEPTED });
    }
    return this.deliveryRepo.findOne({ where: { id: deliveryId } });
  }

  @Mutation()
  async rejectDelivery(
    @Ctx() ctx: RequestContext,
    @Args('deliveryId') deliveryId: string,
    @Args('driverId') driverId: string,
  ) {
    this.requireDriverOwner(ctx, driverId);
    const current = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!current) throw new Error('Хүргэлт олдсонгүй');
    if (current.driverId && current.driverId !== driverId) {
      throw new Error('Өөр жолоочид оноогдсон хүргэлт байна');
    }
    handleDriverOfferDecision('reject', { driverId, orderId: deliveryId });
    await this.deliveryRepo.update(deliveryId, {
      driverId: current?.driverId ?? driverId,
      status: DeliveryStatus.CANCELLED,
    });
    emitToOrder(current.orderId, 'order:status', { orderId: current.orderId, status: DeliveryStatus.CANCELLED });
    return this.deliveryRepo.findOne({ where: { id: deliveryId } });
  }

  @Mutation()
  async updateDeliveryStatus(
    @Ctx() ctx: RequestContext,
    @Args('deliveryId') deliveryId: string,
    @Args('status') status: DeliveryStatus,
  ) {
    if (!Object.values(DeliveryStatus).includes(status)) throw new Error('Хүргэлтийн төлөв буруу байна');
    const current = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!current) throw new Error('Хүргэлт олдсонгүй');
    if (current.driverId) this.requireDriverOwner(ctx, current.driverId);
    if (status === DeliveryStatus.COMPLETED) {
      throw new Error('Хүргэлт дуусгахын тулд хэрэглэгчийн буулгах код шаардлагатай');
    }
    await this.deliveryRepo.update(deliveryId, { status });
    emitToOrder(current.orderId, 'order:status', { orderId: current.orderId, status });
    if (current.orderNumber) {
      emitToOrder(current.orderNumber, 'order:status', { orderId: current.orderNumber, status });
    }
    return this.deliveryRepo.findOne({ where: { id: deliveryId } });
  }

  @Mutation()
  async completeDeliveryWithCode(
    @Ctx() ctx: RequestContext,
    @Args('deliveryId') deliveryId: string,
    @Args('driverId') driverId: string,
    @Args('code') code: string,
  ) {
    this.requireDriverOwner(ctx, driverId);
    const current = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!current) throw new Error('Хүргэлт олдсонгүй');
    if (current.driverId !== driverId) throw new Error('Энэ хүргэлт өөр жолоочид оноогдсон байна');
    const normalized = code.replace(/\D/g, '');
    if (!current.deliveryCode || current.deliveryCode !== normalized) {
      throw new Error('Буулгах код буруу байна');
    }
    await this.deliveryRepo.update(deliveryId, {
      status: DeliveryStatus.COMPLETED,
      completedAt: new Date(),
    });
    emitToOrder(current.orderId, 'order:status', { orderId: current.orderId, status: DeliveryStatus.COMPLETED });
    if (current.orderNumber) {
      emitToOrder(current.orderNumber, 'order:status', { orderId: current.orderNumber, status: DeliveryStatus.COMPLETED });
    }
    return this.deliveryRepo.findOne({ where: { id: deliveryId } });
  }

  @Mutation()
  async updateDeliveryLocation(
    @Ctx() ctx: RequestContext,
    @Args('deliveryId') deliveryId: string,
    @Args('lat') lat: number,
    @Args('lng') lng: number,
  ) {
    const current = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!current) throw new Error('Хүргэлт олдсонгүй');
    if (current.driverId) this.requireDriverOwner(ctx, current.driverId);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Байршлын координат буруу байна');
    await this.deliveryRepo.update(deliveryId, { driverLat: lat, driverLng: lng });
    emitToOrder(current.orderId, 'driver:location', { orderId: current.orderId, driverId: current.driverId, lat, lng });
    return this.deliveryRepo.findOne({ where: { id: deliveryId } });
  }

  private requireDriverOwner(ctx: RequestContext, driverId: string) {
    const principal = requirePlatformRole(ctx, 'DRIVER');
    if (principal.id !== driverId) throw new Error('Өөр жолоочийн хүргэлтэд хандах эрхгүй');
  }

  private generateDeliveryCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private async reserveSupplierStock(orderItems: DeliveryOrderItem[]) {
    const supplierItems = orderItems.filter((item) =>
      item.supplierId &&
      item.supplierId !== 'diy-store' &&
      Number.isFinite(item.qty) &&
      item.qty > 0,
    );
    if (supplierItems.length === 0) return;

    const repo = this.dataSource.getRepository(SupplierProduct);
    for (const item of supplierItems) {
      const where = [
        item.productId ? { id: item.productId, supplierId: item.supplierId } : null,
        item.variantId ? { id: item.variantId, supplierId: item.supplierId } : null,
        item.sku ? { slug: item.sku, supplierId: item.supplierId } : null,
      ].filter(Boolean) as Array<{ id?: string; slug?: string; supplierId: string }>;
      if (where.length === 0) continue;
      const product = await repo.findOne({
        where: where as any,
      });
      if (!product) continue;
      const qty = Math.max(1, Math.round(item.qty));
      if (product.stock < qty) {
        throw new Error(`${product.name} барааны үлдэгдэл хүрэлцэхгүй байна`);
      }
      product.stock -= qty;
      if (product.stock === 0) product.enabled = false;
      await repo.save(product);
    }
  }
}
