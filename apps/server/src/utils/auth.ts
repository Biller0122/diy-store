import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { RequestContext } from '@vendure/core';

export type PlatformRole = 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'ADMIN';

export interface TokenPayload {
  id: string;
  role: PlatformRole;
}

const TOKEN_SECRET = process.env.JWT_SECRET || 'diy-store-test-secret';

export function validatePhone(phone: string): boolean {
  return /^[789]\d{7}$/.test(phone);
}

export function generateOTP(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function base64Url(input: string) {
  return Buffer.from(input).toString('base64url');
}

function parseDuration(duration: string) {
  const match = /^(-?\d+)([smhd])$/.exec(duration);
  if (!match) return 60 * 60;
  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return value * multiplier;
}

export function generateToken(payload: TokenPayload, expiresIn = '1h'): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + parseDuration(expiresIn) };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(body))}`;
  const signature = createHmac('sha256', TOKEN_SECRET).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function verifyToken(token: string): TokenPayload & { exp: number } {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) throw new Error('Token буруу байна');
  const expected = createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    throw new Error('Token signature буруу байна');
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload & { exp: number };
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token хугацаа дууссан');
  return payload;
}

export function requireRole(token: string, role: PlatformRole) {
  const decoded = verifyToken(token);
  if (decoded.role !== role) throw new Error('Эрхийн түвшин тохирохгүй байна');
  return decoded;
}

export function getBearerToken(ctx: RequestContext): string | null {
  const header = ctx.req?.headers?.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  const match = /^Bearer\s+(.+)$/i.exec(value ?? '');
  return match?.[1] ?? null;
}

export function requirePlatformRole(ctx: RequestContext, role: PlatformRole) {
  const token = getBearerToken(ctx);
  if (!token) throw new Error('Нэвтрэх шаардлагатай');
  return requireRole(token, role);
}

export class InMemoryOtpService {
  private readonly otps = new Map<string, { otp: string; expiresAt: number }>();

  async sendOTP(phone: string) {
    if (!validatePhone(phone)) return { success: false, message: 'Утасны дугаар буруу байна' };
    const otp = process.env.NODE_ENV === 'production' ? generateOTP() : '1234';
    this.otps.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
    return { success: true, otp };
  }

  async verifyOTP(phone: string, otp: string) {
    const record = this.otps.get(phone);
    if (!record) return { success: false, message: 'Код олдсонгүй' };
    if (record.expiresAt < Date.now()) {
      this.otps.delete(phone);
      return { success: false, message: 'Кодын хугацаа дууссан байна' };
    }
    if (record.otp !== otp) return { success: false, message: 'Код буруу байна' };
    this.otps.delete(phone);
    return { success: true, message: 'Амжилттай' };
  }
}

export const otpService = new InMemoryOtpService();

export function randomToken() {
  return randomBytes(24).toString('hex');
}
