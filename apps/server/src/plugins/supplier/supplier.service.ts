import { Injectable, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EmailOtpService } from '../../services/email-otp.service';
import { generateMockableOtp, generateToken, isOtpMockMode, maskOtp } from '../../utils/auth';
import { Supplier, SupplierStatus } from './supplier.entity';
import { SupplierProduct } from './supplier-product.entity';
import { EmbeddingService } from '../search/embedding.service';

export interface RegisterSupplierInput {
  ownerName: string;
  email: string;
  phone?: string;
  businessName?: string;
  registrationNumber?: string;
  district?: string;
  address?: string;
}

export interface VerifySupplierOtpInput {
  email: string;
  otp: string;
}

export interface SupplierProductInput {
  supplierId: string;
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  image?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  enabled?: boolean;
}

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierProduct)
    private readonly supplierProductRepo: Repository<SupplierProduct>,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
    @Optional()
    private readonly emailOtpService?: EmailOtpService,
    @Optional()
    private readonly embeddingService?: EmbeddingService,
  ) {}

  async registerSupplier(input: RegisterSupplierInput): Promise<Supplier> {
    const ownerName = input.ownerName.trim();
    const email = this.normalizeEmail(input.email);
    const phone = input.phone ? this.normalizePhone(input.phone) : '';
    const businessName = input.businessName?.trim() || ownerName;
    if (ownerName.length < 2) throw new Error('Овог нэр 2-оос дээш тэмдэгттэй байх ёстой');
    if (businessName.length < 2) throw new Error('Байгууллагын нэр 2-оос дээш тэмдэгттэй байх ёстой');
    if (!this.isValidEmail(email)) throw new Error('И-мэйл хаяг буруу байна');
    if (phone && !/^\d{8}$/.test(phone)) throw new Error('Утасны дугаар 8 оронтой байх ёстой');
    if (await this.getSupplierByEmail(email)) throw new Error('Энэ и-мэйл хаяг бүртгэлтэй байна');
    if (phone && await this.getSupplierByPhone(phone)) throw new Error('Энэ дугаар бүртгэлтэй байна');

    const otpCode = this.generateOtp();
    const supplier = this.supplierRepo.create({
      ownerName,
      phone,
      businessName,
      slug: await this.createUniqueSlug(businessName),
      email,
      registrationNumber: input.registrationNumber?.trim() || null,
      district: input.district?.trim() || null,
      address: input.address?.trim() || null,
      status: SupplierStatus.PENDING_VERIFICATION,
      otpCode,
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      otpAttempts: 0,
      commissionRate: 10,
      rating: 0,
      reviewCount: 0,
      productCount: 0,
      pickupEnabled: true,
      deliveryEnabled: true,
      statusHistory: [{ status: SupplierStatus.PENDING_VERIFICATION, at: new Date().toISOString() }],
    });

    const saved = await this.supplierRepo.save(supplier);
    if (isOtpMockMode()) console.log(`[Supplier Email OTP] ${email}: ${maskOtp(otpCode)}`);
    await this.emailOtpService?.sendSupplierOtp(email, otpCode, 'register');
    console.log(`SUPPLIER REGISTERED: id=${saved.id} name=${saved.ownerName}`);
    return saved;
  }

  async loginSupplier(emailInput: string): Promise<Supplier> {
    const email = this.normalizeEmail(emailInput);
    if (!this.isValidEmail(email)) throw new Error('И-мэйл хаяг буруу байна');
    const supplier = await this.getSupplierByEmail(email);
    if (!supplier) throw new Error('Бүртгэл олдсонгүй');
    if (supplier.status === SupplierStatus.SUSPENDED) throw new Error('Таны данс түр хаагдсан байна');
    if (supplier.status === SupplierStatus.REJECTED) throw new Error('Таны бүртгэл татгалзсан байна');

    // Rate limit: 60s cooldown between OTP requests (expiry is +5min on issue,
    // so >4min remaining means a code was sent < 1min ago).
    if (supplier.otpExpiresAt && supplier.otpExpiresAt.getTime() - Date.now() > 4 * 60 * 1000) {
      throw new Error('Та түр хүлээгээд (1 мин) дахин код аваарай');
    }

    supplier.otpCode = this.generateOtp();
    supplier.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    supplier.otpAttempts = 0;
    const saved = await this.supplierRepo.save(supplier);
    if (isOtpMockMode()) console.log(`[Supplier Login Email OTP] ${email}: ${maskOtp(saved.otpCode)}`);
    await this.emailOtpService?.sendSupplierOtp(email, saved.otpCode, 'login');
    return saved;
  }

  async verifyOTP(input: VerifySupplierOtpInput): Promise<{ supplier: Supplier; token: string }> {
    const email = this.normalizeEmail(input.email);
    const supplier = await this.getSupplierByEmail(email);
    if (!supplier) throw new Error('Бүртгэл олдсонгүй');
    if (!supplier.otpExpiresAt || supplier.otpExpiresAt.getTime() < Date.now()) throw new Error('Кодын хугацаа дууссан байна');
    if ((supplier.otpAttempts ?? 0) >= 5) throw new Error('Олон удаа буруу оролдлоо. Дахин код аваарай');
    if (!supplier.otpCode || supplier.otpCode !== input.otp.trim()) {
      supplier.otpAttempts = (supplier.otpAttempts ?? 0) + 1;
      await this.supplierRepo.save(supplier);
      throw new Error('Код буруу байна');
    }

    if (supplier.status === SupplierStatus.PENDING_VERIFICATION) {
      supplier.status = SupplierStatus.PENDING_APPROVAL;
      supplier.statusHistory = [
        ...(supplier.statusHistory ?? []),
        { status: SupplierStatus.PENDING_APPROVAL, at: new Date().toISOString() },
      ];
    }
    supplier.otpCode = null;
    supplier.otpExpiresAt = null;
    supplier.otpAttempts = 0;
    const saved = await this.supplierRepo.save(supplier);
    console.log('SUPPLIER EMAIL VERIFIED:', { id: saved.id, name: saved.ownerName, email: saved.email, status: saved.status });
    return { supplier: saved, token: generateToken({ id: String(saved.id), role: 'SUPPLIER' }, '7d') };
  }

  getSupplierByEmail(email: string): Promise<Supplier | null> {
    return this.supplierRepo.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  getSupplierByPhone(phone: string): Promise<Supplier | null> {
    return this.supplierRepo.findOne({ where: { phone: this.normalizePhone(phone) } });
  }

  getSupplierById(id: string): Promise<Supplier | null> {
    return this.supplierRepo.findOne({ where: { id } });
  }

  async getAllSuppliers(): Promise<{ items: Supplier[]; total: number }> {
    const [items, total] = await this.supplierRepo.findAndCount({ order: { createdAt: 'DESC' } });
    console.log('Total suppliers in DB:', total);
    return { items, total };
  }

  async getSuppliersByStatus(status?: SupplierStatus): Promise<Supplier[]> {
    const suppliers = await this.supplierRepo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
    console.log(`SUPPLIERS FOUND: count=${suppliers.length}`);
    return suppliers;
  }

  async updateSupplierStatus(id: string, status: SupplierStatus, reason?: string): Promise<Supplier> {
    const supplier = await this.getSupplierById(id);
    if (!supplier) throw new Error('Нийлүүлэгч олдсонгүй');
    supplier.status = status;
    supplier.rejectionReason = status === SupplierStatus.REJECTED ? reason ?? null : supplier.rejectionReason;
    supplier.statusHistory = [
      ...(supplier.statusHistory ?? []),
      { status, reason, at: new Date().toISOString() },
    ];
    return this.supplierRepo.save(supplier);
  }

  async getSupplierProducts(supplierId?: string): Promise<{ items: SupplierProduct[]; total: number }> {
    const where = supplierId ? { supplierId } : {};
    const [items, total] = await this.supplierProductRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
    });
    return { items, total };
  }

  async createSupplierProduct(input: SupplierProductInput): Promise<SupplierProduct> {
    const supplier = await this.getSupplierById(String(input.supplierId));
    if (!supplier) throw new Error('Нийлүүлэгч олдсонгүй');
    const name = input.name.trim();
    if (name.length < 2) throw new Error('Барааны нэр оруулна уу');
    if (!Number.isFinite(input.price) || input.price <= 0) throw new Error('Үнэ зөв оруулна уу');
    if (!Number.isFinite(input.stock) || input.stock < 0) throw new Error('Нөөц зөв оруулна уу');

    const product = this.supplierProductRepo.create({
      supplierId: String(input.supplierId),
      name,
      slug: await this.createUniqueProductSlug(input.slug || name),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      image: input.image?.trim() || null,
      price: Math.round(input.price),
      originalPrice: input.originalPrice ? Math.round(input.originalPrice) : null,
      stock: Math.round(input.stock),
      enabled: input.enabled ?? true,
    });
    const saved = await this.supplierProductRepo.save(product);
    supplier.productCount = await this.supplierProductRepo.count({ where: { supplierId: String(input.supplierId) } });
    await this.supplierRepo.save(supplier);
    void this.embeddingService?.indexSupplierProductById(String(saved.id));
    return saved;
  }

  async updateSupplierProduct(id: string, input: Partial<SupplierProductInput>): Promise<SupplierProduct> {
    const saved = this.dataSource
      ? await this.dataSource.transaction((manager) => this.updateSupplierProductLocked(manager, id, input))
      : await this.updateSupplierProductLocked(this.supplierProductRepo.manager as EntityManager | undefined, id, input);
    void this.embeddingService?.indexSupplierProductById(String(saved.id));
    return saved;
  }

  private async updateSupplierProductLocked(
    manager: EntityManager | undefined,
    id: string,
    input: Partial<SupplierProductInput>,
  ): Promise<SupplierProduct> {
    const repo = manager?.getRepository?.(SupplierProduct) ?? this.supplierProductRepo;
    const supportsPessimisticLock = this.supportsPessimisticLock();
    const product = await repo.findOne(
      supportsPessimisticLock
        ? { where: { id }, lock: { mode: 'pessimistic_write' as const } }
        : { where: { id } },
    );
    if (!product) throw new Error('Бараа олдсонгүй');
    if (input.name !== undefined) product.name = input.name.trim();
    if (input.slug !== undefined) product.slug = input.slug.trim() || product.slug;
    if (input.description !== undefined) product.description = input.description?.trim() || null;
    if (input.category !== undefined) product.category = input.category?.trim() || null;
    if (input.image !== undefined) product.image = input.image?.trim() || null;
    if (input.price !== undefined) product.price = Math.round(input.price);
    if (input.originalPrice !== undefined) product.originalPrice = input.originalPrice ? Math.round(input.originalPrice) : null;
    if (input.stock !== undefined) product.stock = Math.max(0, Math.round(input.stock));
    if (input.enabled !== undefined) product.enabled = input.enabled;
    return repo.save(product);
  }

  async deleteSupplierProduct(id: string): Promise<boolean> {
    const product = await this.supplierProductRepo.findOne({ where: { id } });
    if (!product) throw new Error('Бараа олдсонгүй');
    const result = await this.supplierProductRepo.delete(id);
    const supplier = await this.getSupplierById(product.supplierId);
    if (supplier) {
      supplier.productCount = await this.supplierProductRepo.count({ where: { supplierId: product.supplierId } });
      await this.supplierRepo.save(supplier);
    }
    return (result.affected ?? 0) > 0;
  }

  private normalizePhone(phone: string) {
    return phone.replace(/\D/g, '').slice(-8);
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private generateOtp() {
    return generateMockableOtp();
  }

  private supportsPessimisticLock() {
    const type = this.dataSource?.options?.type;
    return Boolean(type && !['sqlite', 'better-sqlite3'].includes(String(type)));
  }

  private async createUniqueSlug(name: string) {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\u0400-\u04ff-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'supplier';
    let slug = base;
    let index = 1;
    while (await this.supplierRepo.findOne({ where: { slug } })) {
      index += 1;
      slug = `${base}-${index}`;
    }
    return slug;
  }

  private async createUniqueProductSlug(value: string) {
    const base = this.toSlug(value) || 'product';
    let slug = base;
    let index = 1;
    while (await this.supplierProductRepo.findOne({ where: { slug } })) {
      index += 1;
      slug = `${base}-${index}`;
    }
    return slug;
  }

  private toSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\u0400-\u04ff-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
