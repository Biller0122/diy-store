'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';

type Tab = 'login' | 'register';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/account';

  const { login, register, isLoading, error, clearError, customer } = useAuthStore();
  const [tab, setTab] = useState<Tab>('login');

  useEffect(() => {
    if (customer) router.replace(redirect);
  }, [customer, redirect, router]);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const handleTabChange = (t: Tab) => {
    setTab(t);
    clearError();
    setFormError('');
    setRegSuccess(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!loginEmail || !loginPassword) {
      setFormError('И-мэйл болон нууц үгээ оруулна уу');
      return;
    }
    const ok = await login(loginEmail, loginPassword);
    if (ok) router.replace(redirect);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!regFirstName || !regLastName || !regEmail || !regPassword) {
      setFormError('Бүх шаардлагатай талбарыг бөглөнө үү');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
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
  };

  const displayError = formError || error;

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-foreground">
            🔨 <span>DIY Store</span>
          </Link>
          <h1 className="text-xl font-black text-foreground mt-3">Нэвтрэх / Бүртгүүлэх</h1>
          <p className="text-sm text-foreground-muted mt-1">Монголын гар урлалын дэлгүүр</p>
        </div>

        <div className="bg-card rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex border-b border-[var(--glass-border)] mb-6">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'border-b-2 border-amber-500 text-brand'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {t === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}
              </button>
            ))}
          </div>

          {displayError && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl text-sm text-error">
              {displayError}
            </div>
          )}

          {/* Login */}
          {tab === 'login' && (
            <form data-testid="login-form" onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">И-мэйл</label>
                <input
                  data-testid="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="example@mail.com"
                  autoComplete="email"
                  className="w-full border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Нууц үг</label>
                <div className="relative">
                  <input
                    data-testid="login-password"
                    type={showLoginPwd ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-muted text-sm"
                  >
                    {showLoginPwd ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <button
                data-testid="login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-brand text-white rounded-xl font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
              </button>
            </form>
          )}

          {/* Register */}
          {tab === 'register' && !regSuccess && (
            <form data-testid="register-form" onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Нэр <span className="text-error">*</span>
                  </label>
                  <input
                    data-testid="reg-firstname"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="Болд"
                    className="w-full border border-[var(--glass-border)] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Овог <span className="text-error">*</span>
                  </label>
                  <input
                    data-testid="reg-lastname"
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder="Баатар"
                    className="w-full border border-[var(--glass-border)] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  И-мэйл <span className="text-error">*</span>
                </label>
                <input
                  data-testid="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="example@mail.com"
                  autoComplete="email"
                  className="w-full border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Утасны дугаар</label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="9911 2233"
                  className="w-full border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Нууц үг <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegPwd ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Хамгийн багадаа 8 тэмдэгт"
                    autoComplete="new-password"
                    className="w-full border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted text-sm"
                  >
                    {showRegPwd ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Нууц үг давтах <span className="text-error">*</span>
                </label>
                <input
                  type={showRegPwd ? 'text' : 'password'}
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  placeholder="Нууц үгийг дахин оруулна уу"
                  autoComplete="new-password"
                  className="w-full border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <p className="text-xs text-foreground-muted">
                Бүртгүүлснээр та манай{' '}
                <span className="text-brand cursor-pointer">үйлчилгээний нөхцөл</span>-тэй
                зөвшөөрч байна.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-brand text-white rounded-xl font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Бүртгэж байна...' : 'Бүртгүүлэх'}
              </button>
            </form>
          )}

          {/* Register success */}
          {tab === 'register' && regSuccess && (
            <div className="text-center py-8">
              <p className="text-5xl mb-4">✅</p>
              <h3 className="font-bold text-foreground text-lg mb-2">Бүртгэл амжилттай!</h3>
              <p className="text-sm text-foreground-muted mb-6">
                {regEmail} хаягаар бүртгэл үүслээ. Одоо нэвтэрч болно.
              </p>
              <button
                onClick={() => handleTabChange('login')}
                className="px-6 py-3 bg-brand text-white rounded-xl font-semibold text-sm"
              >
                Нэвтрэх
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-foreground-muted mt-6">
          <Link href="/" className="hover:text-brand transition-colors">
            ← Нүүр хуудас руу буцах
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark" />}>
      <LoginForm />
    </Suspense>
  );
}
