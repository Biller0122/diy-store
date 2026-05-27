'use client';

import { useState } from 'react';
import Link from 'next/link';
import OTPInput from '@/components/auth/OTPInput';
import { useDriverStore } from '@/lib/driver-store';

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}

function rememberDriverSession() {
  document.cookie = `diy-driver=1; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  document.cookie = `diy-driver-status=ACTIVE; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export default function DriverLoginPage() {
  const { requestLoginOtp, verifyOtp, isLoading, error, devOtp, clearError } = useDriverStore();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [localError, setLocalError] = useState('');

  async function requestOtp(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    const raw = phone.replace(/\D/g, '');
    if (!/^[6789]\d{7}$/.test(raw)) {
      setLocalError('Утасны дугаар 8 оронтой, 6/7/8/9-өөр эхлэх ёстой.');
      return;
    }
    setLocalError('');
    const ok = await requestLoginOtp(raw);
    if (ok) setStep('otp');
  }

  async function completeOtp(otp: string) {
    const ok = await verifyOtp(phone, otp);
    if (ok) {
      rememberDriverSession();
      window.location.assign('/api/driver/session?next=/driver/dashboard');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand text-3xl shadow-xl shadow-brand/25">🚗</div>
          <h1 className="text-2xl font-black text-foreground">Жолооч нэвтрэх</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            {step === 'phone' ? 'Утасны дугаараа оруулж код авна уу' : `${phone} дугаарт код илгээлээ`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-foreground-muted">Утасны дугаар</label>
              <input
                value={phone}
                onChange={(event) => setPhone(formatPhone(event.target.value))}
                inputMode="numeric"
                placeholder="9911 2233"
                className={`w-full rounded-2xl border bg-white/[0.04] px-4 py-4 text-lg font-bold text-foreground outline-none transition focus:border-brand ${
                  localError || error ? 'border-error/70' : 'border-white/10'
                }`}
              />
              {localError && <p className="mt-2 text-xs text-error">{localError}</p>}
              {error && <p className="mt-2 text-xs text-error">{error}</p>}
            </div>
            <button disabled={isLoading} className="w-full rounded-2xl bg-brand py-4 text-sm font-black text-white shadow-lg shadow-brand/20 disabled:opacity-60">
              {isLoading ? 'Код илгээж байна...' : 'Код авах'}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <OTPInput onComplete={completeOtp} error={error ?? undefined} />
            {devOtp && <p className="text-center text-xs text-foreground-muted">Туршилтын OTP: {devOtp}</p>}
            <button
              onClick={() => setStep('phone')}
              className="w-full rounded-2xl border border-white/10 py-3 text-sm font-bold text-foreground-muted hover:text-foreground"
            >
              Дугаар солих
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-xs text-foreground-muted">
          <Link href="/driver/register" className="hover:text-brand">Бүртгүүлэх</Link>
          <Link href="/" className="hover:text-foreground">Нүүр хуудас</Link>
        </div>
      </div>
    </div>
  );
}
