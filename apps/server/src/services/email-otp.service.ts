import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { maskOtp } from '../utils/auth';

type OtpEmailPurpose = 'login' | 'register' | 'password_reset';

@Injectable()
export class EmailOtpService {
  async sendSupplierOtp(to: string, otp: string, purpose: OtpEmailPurpose) {
    const subject =
      purpose === 'register'
        ? 'DIY Store нийлүүлэгчийн бүртгэл баталгаажуулах код'
        : 'DIY Store нийлүүлэгчийн нэвтрэх код';

    const text = [
      'Сайн байна уу,',
      '',
      `Таны баталгаажуулах код: ${otp}`,
      'Код 5 минутын хугацаанд хүчинтэй.',
      '',
      'Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл тооно уу.',
      '',
      'DIY Store',
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <p>Сайн байна уу,</p>
        <p>Таны баталгаажуулах код:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${otp}</p>
        <p>Код 5 минутын хугацаанд хүчинтэй.</p>
        <p style="color:#6b7280;font-size:13px">Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл тооно уу.</p>
        <p>DIY Store</p>
      </div>
    `;

    if (!process.env.SMTP_HOST) {
      console.log(`[Email OTP skipped: SMTP_HOST not set] ${to}: ${maskOtp(otp)}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || '',
          }
        : undefined,
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.EMAIL_FROM || '"DIY Store" <noreply@diy-store.mn>',
      to,
      subject,
      text,
      html,
    });
    console.log(`[Email OTP sent] ${to}: ${info.messageId}`);
  }

  async sendCustomerOtp(to: string, otp: string, purpose: 'login' | 'password_reset') {
    const subject =
      purpose === 'password_reset'
        ? 'DIY Store нууц үг сэргээх код'
        : 'DIY Store нэвтрэх баталгаажуулах код';
    return this.sendOtp(to, otp, subject);
  }

  private async sendOtp(to: string, otp: string, subject: string) {
    const text = [
      'Сайн байна уу,',
      '',
      `Таны баталгаажуулах код: ${otp}`,
      'Код 5 минутын хугацаанд хүчинтэй.',
      '',
      'Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл тооно уу.',
      '',
      'DIY Store',
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <p>Сайн байна уу,</p>
        <p>Таны баталгаажуулах код:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${otp}</p>
        <p>Код 5 минутын хугацаанд хүчинтэй.</p>
        <p style="color:#6b7280;font-size:13px">Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл тооно уу.</p>
        <p>DIY Store</p>
      </div>
    `;

    if (!process.env.SMTP_HOST) {
      console.log(`[Email OTP skipped: SMTP_HOST not set] ${to}: ${maskOtp(otp)}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || '',
          }
        : undefined,
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.EMAIL_FROM || '"DIY Store" <noreply@diy-store.mn>',
      to,
      subject,
      text,
      html,
    });
    console.log(`[Email OTP sent] ${to}: ${info.messageId}`);
  }
}
