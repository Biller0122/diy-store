import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, ID, Permission } from '@vendure/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier, SupplierStatus } from './supplier.entity';
import { RegisterSupplierInput, SupplierService, VerifySupplierOtpInput } from './supplier.service';

@Resolver()
export class SupplierResolver {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    private readonly supplierService: SupplierService,
  ) {}

  @Query()
  @Allow(Permission.Public)
  async suppliers(
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
    return { items, total };
  }

  @Query()
  @Allow(Permission.Public)
  async getAllSuppliers() {
    return this.supplierService.getAllSuppliers();
  }

  @Query()
  @Allow(Permission.Public)
  async supplierBySlug(@Args('slug') slug: string) {
    return this.supplierRepo.findOne({ where: { slug } });
  }

  @Query()
  @Allow(Permission.Public)
  async supplier(@Args('id') id: ID) {
    return this.supplierService.getSupplierById(String(id));
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
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Алдаа гарлаа. Дахин оролдоно уу.',
        email: null,
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
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Алдаа гарлаа. Дахин оролдоно уу.',
        email: null,
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
  async createSupplier(@Args('input') input: Partial<Supplier>) {
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
    @Args('id') id: ID,
    @Args('input') input: Partial<Supplier>,
  ) {
    await this.supplierRepo.update(String(id), input);
    return this.supplierService.getSupplierById(String(id));
  }

  @Mutation()
  @Allow(Permission.Public)
  async updateSupplierStatus(
    @Args('id') id: ID,
    @Args('status') status: SupplierStatus,
    @Args('reason') reason?: string,
  ) {
    const saved = await this.supplierService.updateSupplierStatus(String(id), status, reason);
    console.log('[Admin] Supplier status updated:', { id: saved.id, name: saved.ownerName, status: saved.status });
    return saved;
  }
}
