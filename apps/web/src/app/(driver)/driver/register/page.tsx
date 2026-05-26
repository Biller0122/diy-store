'use client';

import { useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import OTPInput from '@/components/auth/OTPInput';
import { useDriverStore } from '@/lib/driver-store';

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}

export default function DriverRegisterPage() {
  const { register, verifyOtp, isLoading, error, devOtp, clearError, logout } = useDriverStore();
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ ownerName?: string; phone?: string }>({});

  async function submitInfo(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    const nextErrors: typeof fieldErrors = {};
    if (ownerName.trim().length < 2) nextErrors.ownerName = 'Овог нэрээ 2-оос дээш тэмдэгтээр оруулна уу.';
    if (!/^[6789]\d{7}$/.test(phone.replace(/\D/g, ''))) nextErrors.phone = 'Утасны дугаар 8 оронтой, 6/7/8/9-өөр эхлэх ёстой.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const ok = await register(ownerName, phone);
    if (ok) setStep('otp');
  }

  async function completeOtp(otp: string) {
    const ok = await verifyOtp(phone, otp);
    if (ok) {
      logout();
      setStep('success');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
        {step === 'success' ? (
          <div className="py-6 text-center">
            <m.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-success text-4xl text-white shadow-xl shadow-success/25"
            >
              ✓
            </m.div>
            <h1 className="text-2xl font-black text-foreground">Бүртгэл амжилттай!</h1>
            <p className="mt-3 text-sm leading-6 text-foreground-muted">
              Манай баг 24 цагийн дотор утсаар холбогдож, сургалтын хуваарь мэдэгдэх болно.
            </p>
            <Link href="/" className="mt-8 inline-flex rounded-2xl bg-brand px-6 py-3 text-sm font-black text-white">
              Нүүр хуудас руу буцах
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand text-3xl shadow-xl shadow-brand/25">🚗</div>
              <h1 className="text-2xl font-black text-foreground">
                {step === 'form' ? 'Жолоочоор бүртгүүлэх' : 'Баталгаажуулах код'}
              </h1>
              <p className="mt-2 text-sm text-foreground-muted">
                {step === 'form' ? 'Хүргэлт хийж орлого олоорой' : `${phone} дугаарт код илгээлээ`}
              </p>
            </div>

            {step === 'form' ? (
              <form onSubmit={submitInfo} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-foreground-muted">Овог нэр</label>
                  <input
                    value={ownerName}
                    onChange={(event) => setOwnerName(event.target.value)}
                    placeholder="Батболд"
                    className={`w-full rounded-2xl border bg-white/[0.04] px-4 py-4 text-foreground outline-none transition focus:border-brand ${
                      fieldErrors.ownerName ? 'border-error/70' : 'border-white/10'
                    }`}
                  />
                  {fieldErrors.ownerName && <p className="mt-2 text-xs text-error">{fieldErrors.ownerName}</p>}
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-foreground-muted">Утасны дугаар</label>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(formatPhone(event.target.value))}
                    inputMode="numeric"
                    placeholder="9911 2233"
                    className={`w-full rounded-2xl border bg-white/[0.04] px-4 py-4 text-lg font-bold text-foreground outline-none transition focus:border-brand ${
                      fieldErrors.phone || error ? 'border-error/70' : 'border-white/10'
                    }`}
                  />
                  {fieldErrors.phone && <p className="mt-2 text-xs text-error">{fieldErrors.phone}</p>}
                  {error && <p className="mt-2 text-xs text-error">{error}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs text-foreground-muted">
                  <div className="rounded-2xl bg-white/[0.04] p-3">🚗<br />Өөрийн цагаар ажиллах</div>
                  <div className="rounded-2xl bg-white/[0.04] p-3">💰<br />Хүргэлт бүрт орлого</div>
                  <div className="rounded-2xl bg-white/[0.04] p-3">📱<br />Апп-аар удирдах</div>
                </div>

                <button disabled={isLoading} className="w-full rounded-2xl bg-brand py-4 text-sm font-black text-white shadow-lg shadow-brand/20 disabled:opacity-60">
                  {isLoading ? 'Илгээж байна...' : 'Үргэлжлүүлэх'}
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <OTPInput onComplete={completeOtp} error={error ?? undefined} />
                {devOtp && <p className="text-center text-xs text-foreground-muted">Dev код: {devOtp}</p>}
                <button
                  onClick={() => setStep('form')}
                  className="w-full rounded-2xl border border-white/10 py-3 text-sm font-bold text-foreground-muted hover:text-foreground"
                >
                  Мэдээлэл засах
                </button>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between text-xs text-foreground-muted">
              <Link href="/driver/login" className="hover:text-brand">Нэвтрэх</Link>
              <Link href="/" className="hover:text-foreground">Нүүр хуудас</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
