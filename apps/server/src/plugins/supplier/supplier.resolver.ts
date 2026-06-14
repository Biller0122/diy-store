import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, Order, Permission, RequestContext, TransactionalConnection } from '@vendure/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier, SupplierStatus } from './supplier.entity';
import { SupplierProduct } from './supplier-product.entity';
import { RegisterSupplierInput, SupplierProductInput, SupplierService, VerifySupplierOtpInput } from './supplier.service';
import { exposeOtp, requirePlatformRole } from '../../utils/auth';
import { DeliveryRequest } from '../delivery/delivery-request.entity';

@Resolver()
export class SupplierResolver {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierProduct)
    private readonly supplierProductRepo: Repository<SupplierProduct>,
    @InjectRepository(DeliveryRequest)
    private readonly deliveryRepo: Repository<DeliveryRequest>,
    private readonly supplierService: SupplierService,
    private readonly connection: TransactionalConnection,
  ) {}

  @Query()
  @Allow(Permission.Public)
  async suppliers(
    @Ctx() ctx: RequestContext,
    @Args('status') status?: SupplierStatus,
    @Args('take') take = 20,
    @Args('skip') skip = 0,
  ) {
    const where = status ? { status } : {};
    const [items, total] = await this.supplierRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return { items: items.map((item) => this.sanitizeSupplier(ctx, item)), total };
  }

  @Query()
  @Allow(Permission.Public)
  async getAllSuppliers(@Ctx() ctx: RequestContext) {
    const result = await this.supplierService.getAllSuppliers();
    return { items: result.items.map((item) => this.sanitizeSupplier(ctx, item)), total: result.total };
  }

  @Query()
  @Allow(Permission.Public)
  async supplierBySlug(@Ctx() ctx: RequestContext, @Args('slug') slug: string) {
    const supplier = await this.supplierRepo.findOne({ where: { slug } });
    return this.sanitizeSupplier(ctx, supplier);
  }

  @Query()
  @Allow(Permission.Public)
  async supplier(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
    const supplier = await this.supplierService.getSupplierById(String(id));
    return this.sanitizeSupplier(ctx, supplier);
  }

  @Mutation()
  @Allow(Permission.Public)
  async registerSupplier(@Args('input') input: RegisterSupplierInput) {
    try {
      const supplier = await this.supplierService.registerSupplier(input);
      return {
        success: true,
        message: 'Баталгаажуулах код и-мэйлээр илгээгдлээ',
        email: supplier.email,
        otp: exposeOtp(supplier.otpCode),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Алдаа гарлаа. Дахин оролдоно уу.',
        email: null,
        otp: null,
      };
    }
  }

  @Mutation()
  @Allow(Permission.Public)
  async loginSupplier(@Args('email') email: string) {
    try {
      const supplier = await this.supplierService.loginSupplier(email);
      return {
        success: true,
        message: 'Баталгаажуулах код и-мэйлээр илгээгдлээ',
        email: supplier.email,
        otp: exposeOtp(supplier.otpCode),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Алдаа гарлаа. Дахин оролдоно уу.',
        email: null,
        otp: null,
      };
    }
  }

  @Mutation()
  @Allow(Permission.Public)
  async verifySupplierOTP(@Args('input') input: VerifySupplierOtpInput) {
    try {
      const { supplier, token } = await this.supplierService.verifyOTP(input);
      return {
        success: true,
        message: 'Бүртгэл амжилттай',
        supplierId: String(supplier.id),
        token,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Код буруу байна',
        supplierId: null,
        token: null,
      };
    }
  }

  @Mutation()
  @Allow(Permission.Public)
  async createSupplier(@Ctx() ctx: RequestContext, @Args('input') input: Partial<Supplier>) {
    this.requireAdmin(ctx);
    return this.supplierRepo.save(this.supplierRepo.create({
      ...input,
      slug: input.slug || input.businessName?.toLowerCase().replace(/\s+/g, '-') || `supplier-${Date.now()}`,
      status: SupplierStatus.PENDING,
      rating: 0,
      reviewCount: 0,
      commissionRate: input.commissionRate ?? 10,
      statusHistory: [{ status: SupplierStatus.PENDING, at: new Date().toISOString() }],
    }));
  }

  @Mutation()
  @Allow(Permission.Public)
  async updateSupplier(
    @Ctx() ctx: RequestContext,
    @Args('id') id: ID,
    @Args('input') input: Partial<Supplier>,
  ) {
    this.requireAdminOrSupplier(ctx, String(id));
    if (ctx.apiType !== 'admin') {
      delete (input as Partial<Supplier> & { status?: SupplierStatus }).status;
      delete (input as Partial<Supplier> & { commissionRate?: number }).commissionRate;
      delete (input as Partial<Supplier> & { email?: string }).email;
    }
    await this.supplierRepo.update(String(id), input);
    return this.supplierService.getSupplierById(String(id));
  }

  @Mutation()
  @Allow(Permission.Public)
  async deleteSupplier(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
    this.requireAdmin(ctx);
    await this.supplierProductRepo.delete({ supplierId: String(id) });
    const result = await this.supplierRepo.delete(String(id));
    return (result.affected ?? 0) > 0;
  }

  @Mutation()
  @Allow(Permission.Public)
  async updateSupplierStatus(
    @Ctx() ctx: RequestContext,
    @Args('id') id: ID,
    @Args('status') status: SupplierStatus,
    @Args('reason') reason?: string,
  ) {
    this.requireAdmin(ctx);
    const saved = await this.supplierService.updateSupplierStatus(String(id), status, reason);
    console.log('[Admin] Supplier status updated:', { id: saved.id, name: saved.ownerName, status: saved.status });
    return saved;
  }

  @Query()
  @Allow(Permission.Public)
  async supplierProducts(@Args('supplierId') supplierId?: string) {
    return this.supplierService.getSupplierProducts(supplierId ? String(supplierId) : undefined);
  }

  @Mutation()
  @Allow(Permission.Public)
  async createSupplierProduct(@Ctx() ctx: RequestContext, @Args('input') input: SupplierProductInput) {
    this.requireAdminOrSupplier(ctx, String(input.supplierId));
    return this.supplierService.createSupplierProduct(input);
  }

  @Mutation()
  @Allow(Permission.Public)
  async updateSupplierProduct(@Ctx() ctx: RequestContext, @Args('id') id: ID, @Args('input') input: Partial<SupplierProduct>) {
    const product = await this.supplierProductRepo.findOne({ where: { id: String(id) } });
    if (!product) throw new Error('Бараа олдсонгүй');
    this.requireAdminOrSupplier(ctx, product.supplierId);
    return this.supplierService.updateSupplierProduct(String(id), input as Partial<SupplierProductInput>);
  }

  @Mutation()
  @Allow(Permission.Public)
  async deleteSupplierProduct(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
    const product = await this.supplierProductRepo.findOne({ where: { id: String(id) } });
    if (!product) throw new Error('Бараа олдсонгүй');
    this.requireAdminOrSupplier(ctx, product.supplierId);
    return this.supplierService.deleteSupplierProduct(String(id));
  }

  @Query()
  @Allow(Permission.Public)
  async supplierDeliveryRequests(@Ctx() ctx: RequestContext, @Args('supplierId') supplierId: string) {
    this.requireAdminOrSupplier(ctx, String(supplierId));
    const deliveries = await this.deliveryRepo.find({ order: { createdAt: 'DESC' } });
    return deliveries.filter((delivery) =>
      delivery.orderItems?.some((item) => String(item.supplierId) === String(supplierId)) ||
      delivery.pickupStops?.some((stop) => String(stop.supplierId) === String(supplierId)),
    );
  }

  @Mutation()
  @Allow(Permission.Public)
  async supplierDeliveryAction(
    @Ctx() ctx: RequestContext,
    @Args('deliveryId') deliveryId: ID,
    @Args('supplierId') supplierId: string,
    @Args('action') action: string,
  ) {
    this.requireAdminOrSupplier(ctx, String(supplierId));
    const delivery = await this.deliveryRepo.findOne({ where: { id: String(deliveryId) } });
    if (!delivery) return { success: false, message: 'Захиалга олдсонгүй', delivery: null };
    const ownsDelivery = delivery.orderItems?.some((item) => String(item.supplierId) === String(supplierId)) ||
      delivery.pickupStops?.some((stop) => String(stop.supplierId) === String(supplierId));
    if (!ownsDelivery) throw new Error('Өөр нийлүүлэгчийн захиалгад хандах эрхгүй');

    const normalized = action.trim().toUpperCase();
    if (normalized === 'ACCEPT') {
      delivery.supplierStatus = 'ACCEPTED';
    } else if (normalized === 'REJECT' || normalized === 'CANCEL') {
      delivery.supplierStatus = 'REJECTED';
    } else {
      return { success: false, message: 'Үйлдэл буруу байна', delivery };
    }
    const saved = await this.deliveryRepo.save(delivery);
    return { success: true, message: 'Амжилттай шинэчлэгдлээ', delivery: saved };
  }

  @Query()
  @Allow(Permission.Public)
  async supplierOrders(@Ctx() ctx: RequestContext, @Args('take') take = 50, @Args('skip') skip = 0) {
    const repo = this.connection.getRepository(ctx, Order);
    const [orders, total] = await repo.findAndCount({
      where: { active: false },
      relations: ['lines', 'lines.productVariant', 'lines.productVariant.product'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return { items: orders.map((order) => this.toSupplierOrder(order)), total };
  }

  @Mutation()
  @Allow(Permission.Public)
  async supplierOrderAction(@Ctx() ctx: RequestContext, @Args('orderId') orderId: ID, @Args('action') action: string) {
    requirePlatformRole(ctx, 'SUPPLIER');
    const repo = this.connection.getRepository(ctx, Order);
    const order = await repo.findOne({
      where: { id: String(orderId) as any },
      relations: ['lines', 'lines.productVariant', 'lines.productVariant.product'],
    });
    if (!order) return { success: false, message: 'Захиалга олдсонгүй', order: null };

    const normalized = action.trim().toUpperCase();
    const nextState =
      normalized === 'ACCEPT'
        ? 'PaymentSettled'
        : normalized === 'REJECT' || normalized === 'CANCEL'
        ? 'Cancelled'
        : normalized === 'SHIP'
        ? 'Shipped'
        : null;
    if (!nextState) return { success: false, message: 'Үйлдэл буруу байна', order: this.toSupplierOrder(order) };

    await repo.update(order.id, { state: nextState as any });
    order.state = nextState as any;
    return { success: true, message: 'Амжилттай шинэчлэгдлээ', order: this.toSupplierOrder(order) };
  }

  private requireAdmin(ctx: RequestContext) {
    if (ctx.apiType !== 'admin' || !ctx.activeUserId) {
      throw new Error('Админ эрх шаардлагатай');
    }
  }

  private requireAdminOrSupplier(ctx: RequestContext, supplierId: string) {
    if (ctx.apiType === 'admin' && ctx.activeUserId) return;
    const principal = requirePlatformRole(ctx, 'SUPPLIER');
    if (principal.id !== supplierId) throw new Error('Өөр нийлүүлэгчийн мэдээлэлд хандах эрхгүй');
  }

  private tryPlatformRole(ctx: RequestContext, role: 'SUPPLIER' | 'DRIVER' | 'ADMIN' | 'CUSTOMER') {
    try {
      return requirePlatformRole(ctx, role);
    } catch {
      return null;
    }
  }

  /**
   * Strip sensitive fields (PII + bank + secrets) from a supplier unless the
   * caller is an admin or the supplier owner. Public storefront queries
   * (suppliers / supplierBySlug / supplier) must never leak email, bank
   * details, registration number, OTP code or password hash.
   */
  private sanitizeSupplier<T extends Supplier | null | undefined>(ctx: RequestContext, supplier: T): T {
    if (!supplier) return supplier;
    if (ctx.apiType === 'admin' && ctx.activeUserId) return supplier;
    if (this.tryPlatformRole(ctx, 'ADMIN')) return supplier;
    const owner = this.tryPlatformRole(ctx, 'SUPPLIER');
    if (owner && String(owner.id) === String(supplier.id)) return supplier;

    return {
      ...(supplier as Supplier),
      email: null,
      passwordHash: null,
      otpCode: null,
      otpExpiresAt: null,
      bankAccount: null,
      bankName: null,
      bankAccountName: null,
      registrationNumber: null,
    } as unknown as T;
  }

  private toSupplierOrder(order: Order) {
    return {
      id: String(order.id),
      code: order.code,
      state: order.state,
      total: order.totalWithTax ?? order.total ?? 0,
      createdAt: order.createdAt,
      shippingAddress: {
        streetLine1: order.shippingAddress?.streetLine1 ?? '',
        city: order.shippingAddress?.city ?? '',
      },
      lines: (order.lines ?? []).map((line) => ({
        quantity: line.quantity,
        productVariant: {
          name: line.productVariant?.name ?? '',
          product: { name: line.productVariant?.product?.name ?? line.productVariant?.name ?? '' },
        },
      })),
    };
  }

}
