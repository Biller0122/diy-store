import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AuthService,
  Customer,
  CustomerService,
  isGraphQlErrorResult,
  RequestContext,
  User,
  UserService,
} from '@vendure/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailOtpService } from '../../services/email-otp.service';
import { CustomerOtp, CustomerOtpPurpose } from './customer-otp.entity';

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

@Injectable()
export class CustomerAuthService {
  private ensureTablePromise?: Promise<void>;

  constructor(
    @InjectRepository(CustomerOtp)
    private readonly otpRepo: Repository<CustomerOtp>,
    private readonly customerService: CustomerService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly emailOtpService: EmailOtpService,
  ) {}

  async requestEmailOtp(emailInput: string, purpose: CustomerOtpPurpose = 'login') {
    await this.ensureOtpTable();
    const emailAddress = this.normalizeEmail(emailInput);
    this.assertEmail(emailAddress);

    const otpCode = this.generateOtp();
    const otp = this.otpRepo.create({
      emailAddress,
      otpCode,
      purpose,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      consumed: false,
    });
    await this.otpRepo.update({ emailAddress, purpose, consumed: false }, { consumed: true });
    await this.otpRepo.save(otp);

    console.log(`[Customer ${purpose} OTP] ${emailAddress}: ${otpCode}`);
    await this.emailOtpService.sendCustomerOtp(emailAddress, otpCode, purpose);
    return {
      success: true,
      message: 'Баталгаажуулах код и-мэйлээр илгээгдлээ',
      emailAddress,
      otp: this.exposeOtp(otpCode),
    };
  }

  async verifyEmailOtp(ctx: RequestContext, emailInput: string, otpInput: string) {
    await this.ensureOtpTable();
    const emailAddress = this.normalizeEmail(emailInput);
    const otpCode = otpInput.trim();
    const otp = await this.otpRepo.findOne({
      where: { emailAddress, purpose: 'login', consumed: false },
      order: { createdAt: 'DESC' },
    });
    this.assertOtp(otp, otpCode);
    otp!.consumed = true;
    await this.otpRepo.save(otp!);

    const customer = await this.getOrCreateCustomer(ctx, {
      emailAddress,
      firstName: this.nameFromEmail(emailAddress),
      lastName: '',
    });
    return this.createSession(ctx, customer.user!);
  }

  async loginWithGoogle(ctx: RequestContext, credential: string) {
    const info = await this.verifyGoogleCredential(credential);
    const emailAddress = this.normalizeEmail(info.email ?? '');
    this.assertEmail(emailAddress);
    const verified = info.email_verified === true || info.email_verified === 'true';
    if (!verified) throw new Error('Google имэйл баталгаажаагүй байна');

    const customer = await this.getOrCreateCustomer(ctx, {
      emailAddress,
      firstName: info.given_name || info.name?.split(/\s+/)[0] || this.nameFromEmail(emailAddress),
      lastName: info.family_name || info.name?.split(/\s+/).slice(1).join(' ') || '',
    });
    return this.createSession(ctx, customer.user!);
  }

  async resetPasswordWithOtp(ctx: RequestContext, emailInput: string, otpInput: string, password: string) {
    await this.ensureOtpTable();
    const emailAddress = this.normalizeEmail(emailInput);
    const otpCode = otpInput.trim();
    if (password.length < 8) throw new Error('Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой');

    const otp = await this.otpRepo.findOne({
      where: { emailAddress, purpose: 'password_reset', consumed: false },
      order: { createdAt: 'DESC' },
    });
    this.assertOtp(otp, otpCode);

    const customer = await this.findCustomerByEmail(ctx, emailAddress);
    if (!customer?.user) throw new Error('Ийм и-мэйлтэй хэрэглэгч олдсонгүй');

    await this.userService.changeUserAndNativeIdentifier(ctx, customer.user.id, emailAddress);
    const resetToken = await this.userService.setPasswordResetToken(ctx, emailAddress);
    if (!resetToken) throw new Error('Нууц үг сэргээх token үүссэнгүй');
    const result = await this.userService.resetPasswordByToken(ctx, this.getResetToken(resetToken), password);
    if (isGraphQlErrorResult(result)) {
      throw new Error(result.message);
    }

    otp!.consumed = true;
    await this.otpRepo.save(otp!);
    return this.createSession(ctx, customer.user);
  }

  private async createSession(ctx: RequestContext, user: User) {
    const session = await this.authService.createAuthenticatedSessionForUser(ctx, user, 'native');
    if (isGraphQlErrorResult(session)) {
      throw new Error(session.message);
    }
    const customer = await this.customerService.findOneByUserId(ctx, user.id, false);
    return {
      success: true,
      message: 'Амжилттай нэвтэрлээ',
      token: session.token,
      customer: customer ? this.serializeCustomer(customer) : null,
    };
  }

  private ensureOtpTable() {
    if (!this.ensureTablePromise) {
      this.ensureTablePromise = this.createOtpTableIfNeeded();
    }
    return this.ensureTablePromise;
  }

  private async createOtpTableIfNeeded() {
    const dbType = this.otpRepo.manager.connection.options.type;
    if (dbType === 'postgres') {
      await this.otpRepo.manager.query(`
        CREATE TABLE IF NOT EXISTS "customer_otp" (
          "id" SERIAL PRIMARY KEY,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "emailAddress" character varying NOT NULL,
          "otpCode" character varying NOT NULL,
          "purpose" character varying NOT NULL,
          "expiresAt" TIMESTAMP NOT NULL,
          "attempts" integer NOT NULL DEFAULT 0,
          "consumed" boolean NOT NULL DEFAULT false
        );
      `);
      await this.otpRepo.manager.query('CREATE INDEX IF NOT EXISTS "IDX_customer_otp_email" ON "customer_otp" ("emailAddress");');
      return;
    }

    if (dbType === 'better-sqlite3' || dbType === 'sqlite') {
      await this.otpRepo.manager.query(`
        CREATE TABLE IF NOT EXISTS "customer_otp" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          "emailAddress" varchar NOT NULL,
          "otpCode" varchar NOT NULL,
          "purpose" varchar NOT NULL,
          "expiresAt" datetime NOT NULL,
          "attempts" integer NOT NULL DEFAULT 0,
          "consumed" boolean NOT NULL DEFAULT 0
        );
      `);
      await this.otpRepo.manager.query('CREATE INDEX IF NOT EXISTS "IDX_customer_otp_email" ON "customer_otp" ("emailAddress");');
    }
  }

  private async getOrCreateCustomer(ctx: RequestContext, input: { emailAddress: string; firstName: string; lastName: string }) {
    const existing = await this.findCustomerByEmail(ctx, input.emailAddress);
    if (existing) return existing;

    const password = `Diy-${randomUUID()}-Aa1!`;
    const created = await this.customerService.create(ctx, {
      emailAddress: input.emailAddress,
      firstName: input.firstName || this.nameFromEmail(input.emailAddress),
      lastName: input.lastName || '',
    }, password);
    if (isGraphQlErrorResult(created)) {
      throw new Error(created.message);
    }
    return created;
  }

  private async findCustomerByEmail(ctx: RequestContext, emailAddress: string) {
    const user = await this.userService.getUserByEmailAddress(ctx, emailAddress, 'customer');
    if (!user) return undefined;
    return this.customerService.findOneByUserId(ctx, user.id, false);
  }

  private async verifyGoogleCredential(credential: string): Promise<GoogleTokenInfo> {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('GOOGLE_CLIENT_ID тохируулаагүй байна');
    if (!credential) throw new Error('Google credential хоосон байна');

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!response.ok) throw new Error('Google token баталгаажуулахад алдаа гарлаа');
    const info = await response.json() as GoogleTokenInfo;
    if (info.aud !== clientId) throw new Error('Google client id тохирохгүй байна');
    return info;
  }

  private assertOtp(otp: CustomerOtp | null, value: string) {
    if (!otp) throw new Error('Код олдсонгүй. Дахин код аваарай');
    otp.attempts += 1;
    if (otp.attempts > 5) throw new Error('Олон удаа буруу оролдлоо. Дахин код аваарай');
    if (otp.expiresAt.getTime() < Date.now()) throw new Error('Кодын хугацаа дууссан байна');
    if (otp.otpCode !== value) throw new Error('Код буруу байна');
  }

  private serializeCustomer(customer: Customer) {
    return {
      id: String(customer.id),
      firstName: customer.firstName,
      lastName: customer.lastName,
      emailAddress: customer.emailAddress,
      phoneNumber: customer.phoneNumber,
    };
  }

  private getResetToken(user: User) {
    const token = (user as any).getNativeAuthenticationMethod(false)?.passwordResetToken as string | undefined;
    if (!token) throw new Error('Нууц үг сэргээх token олдсонгүй');
    return token;
  }

  private normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  private assertEmail(value: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('И-мэйл хаяг буруу байна');
  }

  private nameFromEmail(emailAddress: string) {
    return emailAddress.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'Хэрэглэгч';
  }

  private generateOtp() {
    if (process.env.NODE_ENV !== 'production' || process.env.OTP_MOCK_MODE === 'true') return '1234';
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  private exposeOtp(otp: string) {
    return process.env.NODE_ENV !== 'production' || process.env.OTP_MOCK_MODE === 'true' ? otp : null;
  }
}
