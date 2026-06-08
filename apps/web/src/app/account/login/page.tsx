'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

type Tab = 'otp' | 'login' | 'register';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/account';
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const {
    login,
    register,
    requestEmailOtp,
    verifyEmailOtp,
    loginWithGoogle,
    requestPasswordResetOtp,
    resetPasswordWithOtp,
    isLoading,
    error,
    clearError,
    customer,
  } = useAuthStore();

  const [tab, setTab] = useState<Tab>('otp');
  const [formError, setFormError] = useState('');
  const [info, setInfo] = useState('');

  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'reset'>('email');

  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
    if (customer) router.replace(redirect);
  }, [customer, redirect, router]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return;

    const render = () => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential) {
            setFormError('Google credential ирсэнгүй');
            return;
          }
          const ok = await loginWithGoogle(response.credential);
          if (ok) router.replace(redirect);
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'continue_with',
      });
    };

    if (window.google) {
      render();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [loginWithGoogle, redirect, router]);

  const handleTabChange = (next: Tab) => {
    setTab(next);
    clearError();
    setFormError('');
    setInfo('');
    setRegSuccess(false);
  };

  const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  async function handleRequestOtp(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    setInfo('');
    if (!validEmail(otpEmail)) {
      setFormError('И-мэйл хаяг буруу байна');
      return;
    }
    const result = await requestEmailOtp(otpEmail);
    if (result.ok) {
      setOtpStep('code');
      setInfo(result.otp ? `Туршилтын код: ${result.otp}` : 'Код и-мэйлээр илгээгдлээ');
    }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    if (!/^\d{4}$/.test(otpCode.trim())) {
      setFormError('4 оронтой код оруулна уу');
      return;
    }
    const ok = await verifyEmailOtp(otpEmail, otpCode);
    if (ok) router.replace(redirect);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    if (!loginEmail || !loginPassword) {
      setFormError('И-мэйл болон нууц үгээ оруулна уу');
      return;
    }
    const ok = await login(loginEmail, loginPassword);
    if (ok) router.replace(redirect);
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    if (!regFirstName || !regLastName || !regEmail || !regPassword) {
      setFormError('Бүх шаардлагатай талбарыг бөглөнө үү');
      return;
    }
    if (!validEmail(regEmail)) {
      setFormError('И-мэйл хаяг буруу байна');
      return;
    }
    if (regPhone && !/^[6789]\d{7}$/.test(regPhone.replace(/\D/g, ''))) {
      setFormError('Утасны дугаар 8 оронтой, 6/7/8/9-өөр эхлэх ёстой');
      return;
    }
    if (regPassword !== regConfirm) {
      setFormError('Нууц үг таарахгүй байна');
      return;
    }
    if (regPassword.length < 8) {
      setFormError('Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой');
      return;
    }
    const ok = await register({
      firstName: regFirstName,
      lastName: regLastName,
      emailAddress: regEmail,
      password: regPassword,
      phoneNumber: regPhone || undefined,
    });
    if (ok) setRegSuccess(true);
  }

  async function handleRequestReset(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    setInfo('');
    if (!validEmail(resetEmail)) {
      setFormError('И-мэйл хаяг буруу байна');
      return;
    }
    const result = await requestPasswordResetOtp(resetEmail);
    if (result.ok) {
      setResetStep('reset');
      setInfo(result.otp ? `Туршилтын сэргээх код: ${result.otp}` : 'Сэргээх код и-мэйлээр илгээгдлээ');
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    if (!/^\d{4}$/.test(resetOtp.trim())) {
      setFormError('4 оронтой сэргээх код оруулна уу');
      return;
    }
    if (resetPassword.length < 8) {
      setFormError('Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой');
      return;
    }
    if (resetPassword !== resetConfirm) {
      setFormError('Шинэ нууц үг таарахгүй байна');
      return;
    }
    const ok = await resetPasswordWithOtp(resetEmail, resetOtp, resetPassword);
    if (ok) router.replace(redirect);
  }

  const displayError = formError || error;

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-foreground">
            <span>DIY Store</span>
          </Link>
          <h1 className="text-xl font-black text-foreground mt-3">Хэрэглэгчийн нэвтрэлт</h1>
          <p className="text-sm text-foreground-muted mt-1">Gmail, email код эсвэл нууц үгээр нэвтэрнэ</p>
        </div>

        <div className="bg-card rounded-2xl p-8">
          <div className="mb-5">
            {GOOGLE_CLIENT_ID ? (
              <div ref={googleButtonRef} className="flex justify-center" />
            ) : (
              <button
                type="button"
                onClick={() => setFormError('Google login ажиллуулахын тулд NEXT_PUBLIC_GOOGLE_CLIENT_ID ба GOOGLE_CLIENT_ID тохируулна уу')}
                className="w-full rounded-xl border border-[var(--glass-border)] px-4 py-3 text-sm font-semibold text-foreground hover:bg-white/5"
              >
                Gmail-ээр үргэлжлүүлэх
              </button>
            )}
          </div>

          <div className="flex border-b border-[var(--glass-border)] mb-6">
            {(['otp', 'login', 'register'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleTabChange(item)}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                  tab === item ? 'border-b-2 border-amber-500 text-brand' : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {item === 'otp' ? 'Email код' : item === 'login' ? 'Нууц үг' : 'Бүртгэл'}
              </button>
            ))}
          </div>

          {displayError && (
            <div className="mb-4 rounded-xl border border-error/20 bg-error/10 p-3 text-sm text-error">
              {displayError}
            </div>
          )}
          {info && (
            <div className="mb-4 rounded-xl border border-success/20 bg-success/10 p-3 text-sm text-success">
              {info}
            </div>
          )}

          {tab === 'otp' && otpStep === 'email' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <Field label="И-мэйл">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" size={17} />
                  <input value={otpEmail} onChange={(event) => setOtpEmail(event.target.value)} type="email" autoComplete="email" placeholder="example@gmail.com" className="w-full rounded-xl border border-[var(--glass-border)] px-10 py-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </Field>
              <SubmitButton loading={isLoading} label="Код авах" loadingLabel="Илгээж байна..." />
            </form>
          )}

          {tab === 'otp' && otpStep === 'code' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <Field label="И-мэйл">
                <input value={otpEmail} onChange={(event) => setOtpEmail(event.target.value)} type="email" className="w-full rounded-xl border border-[var(--glass-border)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
              </Field>
              <Field label="Баталгаажуулах код">
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" size={17} />
                  <input value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="1234" className="w-full rounded-xl border border-[var(--glass-border)] px-10 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </Field>
              <SubmitButton loading={isLoading} label="Нэвтрэх" loadingLabel="Шалгаж байна..." />
              <button type="button" onClick={() => setOtpStep('email')} className="w-full text-xs font-semibold text-foreground-muted hover:text-brand">
                И-мэйлээ солих
              </button>
            </form>
          )}

          {tab === 'login' && !resetOpen && (
            <form data-testid="login-form" onSubmit={handleLogin} className="space-y-4">
              <Field label="И-мэйл">
                <input data-testid="login-email" type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="example@mail.com" autoComplete="email" className="w-full rounded-xl border border-[var(--glass-border)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
              </Field>
              <Field label="Нууц үг">
                <PasswordInput value={loginPassword} onChange={setLoginPassword} show={showLoginPwd} setShow={setShowLoginPwd} autoComplete="current-password" />
              </Field>
              <button type="button" onClick={() => { setResetOpen(true); setResetEmail(loginEmail); setInfo(''); setFormError(''); }} className="text-xs font-semibold text-brand hover:underline">
                Нууц үгээ мартсан уу?
              </button>
              <SubmitButton loading={isLoading} label="Нэвтрэх" loadingLabel="Нэвтэрч байна..." />
            </form>
          )}

          {tab === 'login' && resetOpen && resetStep === 'email' && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <KeyRound size={16} />
                Нууц үг сэргээх
              </div>
              <Field label="Бүртгэлтэй и-мэйл">
                <input value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} type="email" placeholder="example@mail.com" className="w-full rounded-xl border border-[var(--glass-border)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
              </Field>
              <SubmitButton loading={isLoading} label="Сэргээх код авах" loadingLabel="Илгээж байна..." />
              <button type="button" onClick={() => setResetOpen(false)} className="w-full text-xs font-semibold text-foreground-muted hover:text-brand">
                Буцах
              </button>
            </form>
          )}

          {tab === 'login' && resetOpen && resetStep === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Field label="Сэргээх код">
                <input value={resetOtp} onChange={(event) => setResetOtp(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="1234" className="w-full rounded-xl border border-[var(--glass-border)] px-4 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none focus:ring-2 focus:ring-brand" />
              </Field>
              <Field label="Шинэ нууц үг">
                <PasswordInput value={resetPassword} onChange={setResetPassword} show={showRegPwd} setShow={setShowRegPwd} autoComplete="new-password" />
              </Field>
              <Field label="Шинэ нууц үг давтах">
                <input type={showRegPwd ? 'text' : 'password'} value={resetConfirm} onChange={(event) => setResetConfirm(event.target.value)} autoComplete="new-password" className="w-full rounded-xl border border-[var(--glass-border)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
              </Field>
              <SubmitButton loading={isLoading} label="Нууц үг шинэчлэх" loadingLabel="Шинэчилж байна..." />
            </form>
          )}

          {tab === 'register' && !regSuccess && (
            <form data-testid="register-form" onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Нэр">
                  <input data-testid="reg-firstname" value={regFirstName} onChange={(event) => setRegFirstName(event.target.value)} className="w-full rounded-xl border border-[var(--glass-border)] px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
                </Field>
                <Field label="Овог">
                  <input data-testid="reg-lastname" value={regLastName} onChange={(event) => setRegLastName(event.target.value)} className="w-full rounded-xl border border-[var(--glass-border)] px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
                </Field>
              </div>
              <Field label="И-мэйл">
                <input data-testid="reg-email" type="email" value={regEmail} onChange={(event) => setRegEmail(event.target.value)} autoComplete="email" className="w-full rounded-xl border border-[var(--glass-border)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
              </Field>
              <Field label="Утасны дугаар">
                <input type="tel" value={regPhone} onChange={(event) => setRegPhone(event.target.value)} placeholder="9911 2233" className="w-full rounded-xl border border-[var(--glass-border)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
              </Field>
              <Field label="Нууц үг">
                <PasswordInput value={regPassword} onChange={setRegPassword} show={showRegPwd} setShow={setShowRegPwd} autoComplete="new-password" />
              </Field>
              <Field label="Нууц үг давтах">
                <input type={showRegPwd ? 'text' : 'password'} value={regConfirm} onChange={(event) => setRegConfirm(event.target.value)} autoComplete="new-password" className="w-full rounded-xl border border-[var(--glass-border)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
              </Field>
              <SubmitButton loading={isLoading} label="Бүртгүүлэх" loadingLabel="Бүртгэж байна..." />
            </form>
          )}

          {tab === 'register' && regSuccess && (
            <div className="py-8 text-center">
              <h3 className="mb-2 text-lg font-bold text-foreground">Бүртгэл амжилттай</h3>
              <p className="mb-6 text-sm text-foreground-muted">{regEmail} хаягаар бүртгэл үүслээ.</p>
              <button onClick={() => handleTabChange('login')} className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white">
                Нэвтрэх
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-foreground-muted">
          <Link href="/" className="transition-colors hover:text-brand">
            Нүүр хуудас руу буцах
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  setShow,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  setShow: (value: boolean) => void;
  autoComplete: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Хамгийн багадаа 8 тэмдэгт"
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-[var(--glass-border)] px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-brand"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl bg-brand py-3 font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark" />}>
      <LoginForm />
    </Suspense>
  );
}
