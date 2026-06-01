import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Allow, Ctx, ID, Order, Permission, RequestContext, TransactionalConnection } from '@vendure/core';
import { Repository } from 'typeorm';
import { Driver, DriverStatus } from '../driver/driver.entity';
import { DriverService } from '../driver/driver.service';
import { Supplier, SupplierStatus } from '../supplier/supplier.entity';
import { SupplierService } from '../supplier/supplier.service';
import { DeliveryRequest } from '../delivery/delivery-request.entity';

@Resolver()
export class AdminStatsResolver {
  constructor(
    private readonly connection: TransactionalConnection,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(DeliveryRequest)
    private readonly deliveryRepo: Repository<DeliveryRequest>,
    private readonly supplierService: SupplierService,
    private readonly driverService: DriverService,
  ) {}

  @Query()
  @Allow(Permission.Authenticated)
  async getDashboardStats(@Ctx() ctx: RequestContext) {
    this.requireAdmin(ctx);
    const orderRepo = this.connection.getRepository(ctx, Order);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [vendureOrderCount, deliveryOrderCount, activeSuppliers, onlineDrivers, pendingSuppliers, pendingDrivers] =
      await Promise.all([
        orderRepo.count(),
        this.deliveryRepo.count(),
        this.supplierRepo.count({ where: { status: SupplierStatus.ACTIVE } }),
        this.driverRepo.count({ where: { isOnline: true } }),
        this.supplierRepo.count({ where: { status: SupplierStatus.PENDING_APPROVAL } }),
        this.driverRepo.count({ where: { status: DriverStatus.PENDING_APPROVAL } }),
      ]);

    const todayRevenue = (await orderRepo.find({
      order: { createdAt: 'DESC' },
      take: 500,
    }))
      .filter((order) => order.createdAt >= today && !['Cancelled', 'CancelledByCustomer'].includes(order.state))
      .reduce((sum, order) => sum + (order.totalWithTax ?? order.total ?? 0), 0);

    return { totalOrders: vendureOrderCount + deliveryOrderCount, todayRevenue, activeSuppliers, onlineDrivers, pendingSuppliers, pendingDrivers };
  }

  @Query()
  @Allow(Permission.Authenticated)
  async getPendingSuppliers(@Ctx() ctx: RequestContext) {
    this.requireAdmin(ctx);
    return this.supplierRepo.find({
      where: { status: SupplierStatus.PENDING_APPROVAL },
      order: { createdAt: 'DESC' },
    });
  }

  @Query()
  @Allow(Permission.Authenticated)
  async getPendingDrivers(@Ctx() ctx: RequestContext) {
    this.requireAdmin(ctx);
    return this.driverRepo.find({
      where: { status: DriverStatus.PENDING_APPROVAL },
      order: { createdAt: 'DESC' },
    });
  }

  @Query()
  @Allow(Permission.Authenticated)
  async getSuppliersByStatus(@Ctx() ctx: RequestContext, @Args('status') status?: SupplierStatus) {
    this.requireAdmin(ctx);
    const where = status ? { status } : {};
    const suppliers = await this.supplierRepo.find({ where, order: { createdAt: 'DESC' } });
    console.log(`SUPPLIERS FOUND: count=${suppliers.length}`);
    return suppliers;
  }

  @Query()
  @Allow(Permission.Authenticated)
  async getDriversByStatus(@Ctx() ctx: RequestContext, @Args('status') status?: DriverStatus) {
    this.requireAdmin(ctx);
    const where = status ? { status } : {};
    return this.driverRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  @Mutation()
  @Allow(Permission.Authenticated)
  async adminUpdateSupplierStatus(
    @Ctx() ctx: RequestContext,
    @Args('id') id: ID,
    @Args('status') status: SupplierStatus,
  ) {
    this.requireAdmin(ctx);
    return this.supplierService.updateSupplierStatus(String(id), status);
  }

  @Mutation()
  @Allow(Permission.Authenticated)
  async adminUpdateDriverStatus(
    @Ctx() ctx: RequestContext,
    @Args('id') id: ID,
    @Args('status') status: DriverStatus,
  ) {
    this.requireAdmin(ctx);
    return this.driverService.updateDriverStatus(String(id), status);
  }

  @Query()
  @Allow(Permission.Authenticated)
  async getAllOrders(
    @Ctx() ctx: RequestContext,
    @Args('page') page = 1,
    @Args('limit') limit = 20,
  ) {
    this.requireAdmin(ctx);
    const take = Math.max(1, Math.min(100, limit));
    const skip = Math.max(0, page - 1) * take;
    const orderRepo = this.connection.getRepository(ctx, Order);
    const [items, vendureTotal] = await orderRepo.findAndCount({
      relations: ['customer'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    const deliveryItems = await this.deliveryRepo.find({
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    const deliveryTotal = await this.deliveryRepo.count();
    const vendureItems = items.map((order) => ({
      id: String(order.id),
      orderNumber: order.code,
      customerName: order.customer
        ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
        : '',
      total: order.totalWithTax ?? order.total ?? 0,
      status: order.state,
      createdAt: order.createdAt,
      source: 'vendure',
      itemSummary: null,
    }));
    const deliverySummaries = deliveryItems.map((order) => ({
      id: String(order.id),
      orderNumber: order.orderNumber || order.orderId,
      customerName: order.customerName,
      total: order.orderTotal,
      status: order.status,
      createdAt: order.createdAt,
      source: 'delivery',
      itemSummary: order.orderItems.map((item) => `${item.name} × ${item.qty}`).join(', '),
    }));
    const merged = [...vendureItems, ...deliverySummaries]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take);
    return {
      total: vendureTotal + deliveryTotal,
      items: merged,
    };
  }

  @Query()
  @Allow(Permission.Authenticated)
  async getCommissionStats(@Ctx() ctx: RequestContext) {
    this.requireAdmin(ctx);
    const orderRepo = this.connection.getRepository(ctx, Order);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const orders = await orderRepo.find({ order: { createdAt: 'DESC' }, take: 1000 });
    const thisMonthGMV = orders
      .filter((order) => order.createdAt >= monthStart && !['Cancelled', 'CancelledByCustomer'].includes(order.state))
      .reduce((sum, order) => sum + (order.totalWithTax ?? order.total ?? 0), 0);
    const totalSuppliers = await this.supplierRepo.count({ where: { status: SupplierStatus.ACTIVE } });
    return {
      thisMonthGMV,
      thisMonthCommission: Math.round(thisMonthGMV * 0.1),
      totalSuppliers,
    };
  }

  private requireAdmin(ctx: RequestContext) {
    if (ctx.apiType !== 'admin' || !ctx.activeUserId) {
      throw new Error('Админ эрх шаардлагатай');
    }
  }
}
