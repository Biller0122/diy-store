'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Store } from 'lucide-react';
import OTPInput from '@/components/auth/OTPInput';
import { useSupplierStore } from '@/lib/supplier-store';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function SupplierLoginPage() {
  const router = useRouter();
  const { requestLoginOtp, verifyLoginOtp, isLoading, error, devOtp, clearError } = useSupplierStore();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const cleanEmail = useMemo(() => normalizeEmail(email), [email]);

  useEffect(() => {
    if (step !== 'otp') return;
    const timer = window.setInterval(() => setCountdown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  async function sendOtp() {
    setLocalError('');
    clearError();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setLocalError('И-мэйл хаяг буруу байна');
      return;
    }
    const ok = await requestLoginOtp(cleanEmail);
    if (ok) {
      setStep('otp');
      setCountdown(60);
    }
  }

  async function verify(otp: string) {
    setLocalError('');
    clearError();
    const result = await verifyLoginOtp(cleanEmail, otp);
    if (result.success && result.redirectTo) {
      router.replace(result.redirectTo);
    }
  }

  function resend() {
    if (countdown > 0) return;
    clearError();
    setCountdown(60);
    requestLoginOtp(cleanEmail);
  }

  const displayError = localError || error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark px-4">
      <div className="w-full max-w-md rounded-3xl border border-[var(--glass-border)] bg-card p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
            <Store size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground">
            {step === 'email' ? 'Нийлүүлэгч нэвтрэх' : 'Баталгаажуулах код'}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {step === 'email' ? 'И-мэйл хаягаа оруулна уу' : `${cleanEmail} хаягт код илгээлээ`}
          </p>
        </div>

        {step === 'email' ? (
          <div className="space-y-4">
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
            {displayError && (
              <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">{displayError}</p>
            )}
            <button
              onClick={sendOtp}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {isLoading && <Loader2 className="animate-spin" size={16} />}
              Код авах
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <OTPInput onComplete={verify} error={error ?? undefined} />
            {isLoading && (
              <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
            )}
            <button
              onClick={resend}
              disabled={countdown > 0}
              className="w-full text-sm font-semibold text-brand disabled:text-foreground-muted"
            >
              {countdown > 0 ? `Дахин код авах (${countdown})` : 'Дахин код авах'}
            </button>
            {devOtp && (
              <p className="text-center text-[10px] text-foreground-muted">Туршилтын OTP: {devOtp}</p>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-foreground-muted">
          Бүртгэлгүй юу?{' '}
          <Link href="/supplier/register" className="text-brand hover:underline">
            Бүртгүүлэх
          </Link>
        </p>
      </div>
    </div>
  );
}
