import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Supplier, SupplierStatus } from './supplier.entity';

export interface RegisterSupplierInput {
  ownerName: string;
  email: string;
  phone?: string;
}

export interface VerifySupplierOtpInput {
  email: string;
  otp: string;
}

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  async registerSupplier(input: RegisterSupplierInput): Promise<Supplier> {
    const ownerName = input.ownerName.trim();
    const email = this.normalizeEmail(input.email);
    const phone = input.phone ? this.normalizePhone(input.phone) : '';
    if (ownerName.length < 2) throw new Error('Овог нэр 2-оос дээш тэмдэгттэй байх ёстой');
    if (!this.isValidEmail(email)) throw new Error('И-мэйл хаяг буруу байна');
    if (phone && !/^[6789]\d{7}$/.test(phone)) throw new Error('Утасны дугаар 8 оронтой, 6/7/8/9-өөр эхлэх ёстой');
    if (await this.getSupplierByEmail(email)) throw new Error('Энэ и-мэйл хаяг бүртгэлтэй байна');
    if (phone && await this.getSupplierByPhone(phone)) throw new Error('Энэ дугаар бүртгэлтэй байна');

    const otpCode = this.generateOtp();
    const supplier = this.supplierRepo.create({
      ownerName,
      phone,
      businessName: ownerName,
      slug: await this.createUniqueSlug(ownerName),
      email,
      status: SupplierStatus.PENDING_VERIFICATION,
      otpCode,
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      commissionRate: 10,
      rating: 0,
      reviewCount: 0,
      productCount: 0,
      pickupEnabled: true,
      deliveryEnabled: true,
      statusHistory: [{ status: SupplierStatus.PENDING_VERIFICATION, at: new Date().toISOString() }],
    });

    const saved = await this.supplierRepo.save(supplier);
    console.log(`[Supplier Email OTP] ${email}: ${otpCode}`);
    console.log('[Supplier] NEW REGISTRATION:', { id: saved.id, name: saved.ownerName, email: saved.email, status: saved.status });
    return saved;
  }

  async loginSupplier(emailInput: string): Promise<Supplier> {
    const email = this.normalizeEmail(emailInput);
    if (!this.isValidEmail(email)) throw new Error('И-мэйл хаяг буруу байна');
    const supplier = await this.getSupplierByEmail(email);
    if (!supplier) throw new Error('Бүртгэл олдсонгүй');
    if (supplier.status === SupplierStatus.SUSPENDED) throw new Error('Таны данс түр хаагдсан байна');
    if (supplier.status === SupplierStatus.REJECTED) throw new Error('Таны бүртгэл татгалзсан байна');

    supplier.otpCode = this.generateOtp();
    supplier.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const saved = await this.supplierRepo.save(supplier);
    console.log(`[Supplier Login Email OTP] ${email}: ${saved.otpCode}`);
    return saved;
  }

  async verifyOTP(input: VerifySupplierOtpInput): Promise<{ supplier: Supplier; token: string }> {
    const email = this.normalizeEmail(input.email);
    const supplier = await this.getSupplierByEmail(email);
    if (!supplier) throw new Error('Бүртгэл олдсонгүй');
    if (!supplier.otpCode || supplier.otpCode !== input.otp.trim()) throw new Error('Код буруу байна');
    if (!supplier.otpExpiresAt || supplier.otpExpiresAt.getTime() < Date.now()) throw new Error('Кодын хугацаа дууссан байна');

    if (supplier.status === SupplierStatus.PENDING_VERIFICATION) {
      supplier.status = SupplierStatus.PENDING_APPROVAL;
      supplier.statusHistory = [
        ...(supplier.statusHistory ?? []),
        { status: SupplierStatus.PENDING_APPROVAL, at: new Date().toISOString() },
      ];
    }
    supplier.otpCode = null;
    supplier.otpExpiresAt = null;
    const saved = await this.supplierRepo.save(supplier);
    console.log('SUPPLIER EMAIL VERIFIED:', { id: saved.id, name: saved.ownerName, email: saved.email, status: saved.status });
    return { supplier: saved, token: randomBytes(24).toString('hex') };
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
    if (process.env.NODE_ENV !== 'production') return '1234';
    return String(Math.floor(1000 + Math.random() * 9000));
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
}
