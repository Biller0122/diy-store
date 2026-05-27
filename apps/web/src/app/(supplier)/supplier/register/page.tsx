'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Check, Loader2, Store } from 'lucide-react';
import OTPInput from '@/components/auth/OTPInput';
import { getSupplierRegistry, saveSupplierToRegistry, type SupplierUser } from '@/lib/supplier-store';

const DEV_OTP = '1234';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function gqlFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(process.env.NEXT_PUBLIC_VENDURE_SHOP_API ?? 'http://localhost:3001/shop-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error('NETWORK');
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message || 'SERVER');
  return json.data as T;
}

const REGISTER_GQL = `
  mutation RegisterSupplier($input: RegisterSupplierInput!) {
    registerSupplier(input: $input) {
      success
      message
      email
    }
  }
`;

const VERIFY_GQL = `
  mutation VerifySupplierOTP($input: VerifySupplierOTPInput!) {
    verifySupplierOTP(input: $input) {
      success
      message
      supplierId
      token
    }
  }
`;

export default function SupplierRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'info' | 'otp' | 'success'>('info');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [otpError, setOtpError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [attempts, setAttempts] = useState(3);
  const [countdown, setCountdown] = useState(60);

  const cleanEmail = useMemo(() => normalizeEmail(email), [email]);

  async function sendOtp() {
    setError('');
    if (ownerName.trim().length < 2) {
      setError('Овог нэр 2-оос дээш тэмдэгттэй байх ёстой');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('И-мэйл хаяг буруу байна');
      return;
    }
    setLoading(true);
    try {
      const data = await gqlFetch<{ registerSupplier: { success: boolean; message: string } }>(
        REGISTER_GQL,
        { input: { ownerName: ownerName.trim(), email: cleanEmail } },
      );
      if (!data.registerSupplier.success) {
        setError(data.registerSupplier.message || 'Алдаа гарлаа');
        return;
      }
      setDevOtp(DEV_OTP);
      setStep('otp');
      setCountdown(60);
    } catch {
      // Dev fallback: create supplier locally if server unavailable
      if (process.env.NODE_ENV === 'development') {
        const reg = getSupplierRegistry();
        if (reg[cleanEmail]) {
          setError('Энэ и-мэйл бүртгэлтэй байна. Нэвтэрч орно уу.');
          setLoading(false);
          return;
        }
        const newSupplier: SupplierUser = {
          id: `sup-${Date.now()}`,
          businessName: ownerName.trim(),
          slug: cleanEmail.replace(/[^a-z0-9]+/g, '-'),
          ownerName: ownerName.trim(),
          phone: '',
          email: cleanEmail,
          status: 'PENDING',
          commissionRate: 12,
          rating: 0,
          reviewCount: 0,
          productCount: 0,
        };
        saveSupplierToRegistry(newSupplier);
        console.log(`[Supplier Register Email OTP] ${cleanEmail}: ${DEV_OTP}`);
        setDevOtp(DEV_OTP);
        setStep('otp');
        setCountdown(60);
      } else {
        setError('Интернэт холболт шалгана уу');
      }
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(otp: string) {
    setOtpError('');
    setLoading(true);
    try {
      const data = await gqlFetch<{ verifySupplierOTP: { success: boolean; message: string } }>(
        VERIFY_GQL,
        { input: { email: cleanEmail, otp } },
      );
      if (!data.verifySupplierOTP.success) throw new Error(data.verifySupplierOTP.message);
      setStep('success'); // Don't set cookies — supplier needs admin approval first
    } catch {
      // Dev fallback: verify OTP locally
      if (process.env.NODE_ENV === 'development') {
        if (otp !== DEV_OTP) {
          const left = Math.max(attempts - 1, 0);
          setAttempts(left);
          setOtpError(`Код буруу байна. ${left} оролдлого үлдлээ`);
          setLoading(false);
          return;
        }
        // Upgrade status in registry so admin panel sees PENDING_APPROVAL
        const reg = getSupplierRegistry();
        const found = reg[cleanEmail];
        if (found) {
          saveSupplierToRegistry({ ...found, status: 'PENDING_APPROVAL' });
          console.log('NEW SUPPLIER REGISTERED:', { id: found.id, name: found.ownerName, email: found.email, status: 'PENDING_APPROVAL' });
        }
        setStep('success'); // Don't auto-login — supplier must await admin approval
      } else {
        const left = Math.max(attempts - 1, 0);
        setAttempts(left);
        setOtpError(`Код буруу байна. ${left} оролдлого үлдлээ`);
      }
    } finally {
      setLoading(false);
    }
  }

  function resend() {
    if (countdown > 0) return;
    setOtpError('');
    setAttempts(3);
    setDevOtp(DEV_OTP);
    setCountdown(60);
  }

  useEffect(() => {
    if (step !== 'otp') return;
    const timer = window.setInterval(() => setCountdown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  if (step === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark px-4">
        <div className="max-w-md text-center">
          <m.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success"
          >
            <Check size={42} />
          </m.div>
          <h1 className="text-2xl font-black text-foreground">Бүртгэл амжилттай!</h1>
          <p className="mt-3 text-sm leading-7 text-foreground-muted">
            Манай баг 24 цагийн дотор утсаар холбогдох болно.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white"
          >
            Нүүр хуудас руу буцах
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark px-4">
      <div className="w-full max-w-md rounded-3xl border border-[var(--glass-border)] bg-card p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
            <Store size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground">
            {step === 'info' ? 'Нийлүүлэгчээр бүртгүүлэх' : 'Баталгаажуулах код'}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {step === 'info' ? 'Мэдээллээ оруулна уу' : `${cleanEmail} хаягт код илгээлээ`}
          </p>
        </div>

        {step === 'info' ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Овог нэр*</span>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Батболд"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-brand/60"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">И-мэйл хаяг*</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supplier@example.com"
                type="email"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-brand/60"
              />
            </label>
            {error && <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
            <button
              onClick={sendOtp}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              Үргэлжлүүлэх
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <OTPInput onComplete={verifyOtp} error={otpError} />
            <button
              onClick={resend}
              disabled={countdown > 0}
              className="w-full text-sm font-semibold text-brand disabled:text-foreground-muted"
            >
              {countdown > 0 ? `Дахин код авах (${countdown})` : 'Дахин код авах'}
            </button>
            {devOtp && (
              <p className="text-center text-[10px] text-foreground-muted">dev OTP: {devOtp}</p>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-foreground-muted">
          <Link href="/supplier/login" className="text-brand hover:underline">
            Нэвтрэх
          </Link>
        </p>
      </div>
    </div>
  );
}
