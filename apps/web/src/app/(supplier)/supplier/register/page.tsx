'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Check, Loader2, Store } from 'lucide-react';
import OTPInput from '@/components/auth/OTPInput';
import { getSupplierRegistry, saveSupplierToRegistry, type SupplierUser } from '@/lib/supplier-store';
import { vendureShopFetch } from '@/lib/vendure';

const DEV_OTP = '1234';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError || String(error).toLowerCase().includes('failed to fetch');
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
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
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
    if (businessName.trim().length < 2) {
      setError('Байгууллагын нэр 2-оос дээш тэмдэгттэй байх ёстой');
      return;
    }
    if (!/^\d{8}$/.test(phone.replace(/\D/g, ''))) {
      setError('Утасны дугаар 8 оронтой байх ёстой');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('И-мэйл хаяг буруу байна');
      return;
    }
    setLoading(true);
    try {
      const data = await vendureShopFetch<{ registerSupplier: { success: boolean; message: string; otp?: string | null } }>(
        REGISTER_GQL,
        {
          input: {
            ownerName: ownerName.trim(),
            businessName: businessName.trim(),
            phone: phone.replace(/\D/g, ''),
            registrationNumber: registrationNumber.trim(),
            district: district.trim(),
            address: address.trim(),
            email: cleanEmail,
          },
        },
      );
      if (!data.registerSupplier.success) {
        setError(data.registerSupplier.message || 'Алдаа гарлаа');
        return;
      }
      setDevOtp(data.registerSupplier.otp ?? '');
      setStep('otp');
      setCountdown(60);
    } catch (err) {
      // Dev fallback: create supplier locally if server unavailable
      if (process.env.NODE_ENV === 'development' && isNetworkError(err)) {
        const reg = getSupplierRegistry();
        if (reg[cleanEmail]) {
          setError('Энэ и-мэйл бүртгэлтэй байна. Нэвтэрч орно уу.');
          setLoading(false);
          return;
        }
        const newSupplier: SupplierUser = {
          id: `sup-${Date.now()}`,
          businessName: businessName.trim(),
          slug: cleanEmail.replace(/[^a-z0-9]+/g, '-'),
          ownerName: ownerName.trim(),
          phone: phone.replace(/\D/g, ''),
          email: cleanEmail,
          district: district.trim(),
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
        setError(err instanceof Error ? err.message : 'И-мэйл илгээхэд алдаа гарлаа');
      }
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(otp: string) {
    setOtpError('');
    setLoading(true);
    try {
      const data = await vendureShopFetch<{ verifySupplierOTP: { success: boolean; message: string; supplierId?: string | null } }>(
        VERIFY_GQL,
        { input: { email: cleanEmail, otp } },
      );
      if (!data.verifySupplierOTP.success) throw new Error(data.verifySupplierOTP.message);
      localStorage.setItem('diy-supplier-pending', JSON.stringify({
        supplierId: data.verifySupplierOTP.supplierId ?? undefined,
        ownerName: ownerName.trim(),
        businessName: businessName.trim(),
        phone: phone.replace(/\D/g, ''),
        registrationNumber: registrationNumber.trim(),
        district: district.trim(),
        address: address.trim(),
        email: cleanEmail,
      }));
      setStep('success'); // Don't set cookies — supplier needs admin approval first
    } catch (err) {
      // Dev fallback: verify OTP locally
      if (process.env.NODE_ENV === 'development' && isNetworkError(err)) {
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
        setOtpError(err instanceof Error ? err.message : `Код буруу байна. ${left} оролдлого үлдлээ`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (countdown > 0) return;
    setOtpError('');
    setAttempts(3);
    await sendOtp();
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
            onClick={() => router.push('/supplier/pending')}
            className="mt-6 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white"
          >
            Статус харах
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
          <div data-testid="supplier-reg-form" className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Овог нэр*</span>
              <input
                data-testid="input-owner-name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Батболд"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-brand/60"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Байгууллагын нэр*</span>
              <input
                data-testid="input-business-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Барилга Маркет ХХК"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-brand/60"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">И-мэйл хаяг*</span>
              <input
                data-testid="input-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supplier@example.com"
                type="email"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-brand/60"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Утас*</span>
                <input
                  data-testid="input-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="99112233"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-brand/60"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Регистр</span>
                <input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="1234567"
                  className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-brand/60"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Дүүрэг</span>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Баянзүрх"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-brand/60"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Хаяг</span>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Дэлгүүрийн хаяг"
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--glass-border)] bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-brand/60"
              />
            </label>
            {error && <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
            <button
              data-testid="supplier-reg-submit"
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
              <p data-testid="dev-otp" className="text-center text-[10px] text-foreground-muted">dev OTP: {devOtp}</p>
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
