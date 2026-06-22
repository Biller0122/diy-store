'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Loader2, Plus, X, ExternalLink, Building2 } from 'lucide-react';
import { resolveVendureAssetUrl } from '@/lib/vendure';
import {
  fetchMyCompanyProfile,
  updateCompanyProfile,
  uploadCompanyImage,
  fileToDataUrl,
  type CompanyProfile,
} from '@/lib/company-profile';

const MAX_PORTFOLIO = 12;
const ACCEPT = 'image/png,image/jpeg,image/webp';

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');

  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const portfolioRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMyCompanyProfile()
      .then((p) => {
        if (!p) {
          setLoggedOut(true);
          return;
        }
        setProfile(p);
        setName(p.companyName ?? '');
        setPhone(p.companyPhone ?? '');
        setDescription(p.companyDescription ?? '');
      })
      .catch(() => setLoggedOut(true))
      .finally(() => setLoading(false));
  }, []);

  async function saveDetails() {
    setSaving('details');
    setError('');
    setMessage('');
    try {
      const updated = await updateCompanyProfile({
        companyName: name.trim(),
        companyPhone: phone.trim(),
        companyDescription: description.trim(),
      });
      setProfile(updated);
      setMessage('Хадгалагдлаа.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Хадгалахад алдаа гарлаа');
    } finally {
      setSaving('');
    }
  }

  async function handleUpload(file: File, target: 'LOGO' | 'COVER' | 'PORTFOLIO') {
    setError('');
    setMessage('');
    if (!ACCEPT.split(',').includes(file.type)) {
      setError('Зөвхөн PNG, JPG, WEBP зураг сонгоно уу.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Зургийн хэмжээ 5MB-аас бага байна.');
      return;
    }
    setSaving(target);
    try {
      const dataUrl = await fileToDataUrl(file);
      await uploadCompanyImage({ filename: file.name, mimeType: file.type, dataUrl }, target);
      const refreshed = await fetchMyCompanyProfile();
      if (refreshed) setProfile(refreshed);
      setMessage('Зураг орлоо.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Зураг оруулахад алдаа гарлаа');
    } finally {
      setSaving('');
    }
  }

  async function removePortfolio(url: string) {
    if (!profile) return;
    setSaving('portfolio-remove');
    try {
      const next = profile.companyPortfolio.filter((u) => u !== url);
      const updated = await updateCompanyProfile({ companyPortfolio: next });
      setProfile(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Устгахад алдаа гарлаа');
    } finally {
      setSaving('');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  if (loggedOut) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Building2 className="mx-auto mb-4 h-10 w-10 text-foreground-muted" />
        <h2 className="mb-2 text-lg font-bold text-foreground">Нэвтэрнэ үү</h2>
        <p className="mb-5 text-sm text-foreground-muted">Компанийн профайл удирдахын тулд нэвтэрнэ үү.</p>
        <Link href="/account/login" className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">
          Нэвтрэх
        </Link>
      </div>
    );
  }

  const coverSrc = resolveVendureAssetUrl(profile?.companyCover);
  const logoSrc = resolveVendureAssetUrl(profile?.companyLogo);
  const portfolio = profile?.companyPortfolio ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Компанийн профайл</h1>
          <p className="text-sm text-foreground-muted">Өөрийн барилгын ажил, үнийн саналуудаа танилцуулна.</p>
        </div>
        {profile?.companySlug && (
          <Link
            href={`/companies/${profile.companySlug}`}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-semibold text-foreground hover:border-brand/40"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Нийтийн профайл
          </Link>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{error}</div>}
      {message && <div className="rounded-xl bg-green-500/10 px-4 py-3 text-sm font-medium text-green-600">{message}</div>}

      {/* Cover + logo */}
      <section className="overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-card">
        <div className="relative h-40 bg-surface sm:h-52">
          {coverSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverSrc} alt="cover" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
          >
            {saving === 'COVER' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Cover зураг
          </button>
        </div>
        <div className="flex items-center gap-4 p-4">
          <div className="relative -mt-12 h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-surface">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Building2 className="h-7 w-7 text-foreground-muted" />
              </div>
            )}
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"
              aria-label="Лого солих"
            >
              {saving === 'LOGO' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-foreground">{name || 'Компанийн нэр'}</p>
            <p className="text-xs text-foreground-muted">Профайл зураг (лого) ба cover зураг</p>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="space-y-4 rounded-2xl border border-[var(--glass-border)] bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">Компанийн мэдээлэл</h2>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground-muted">Компанийн нэр</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Жишээ: Эрдэнэт Барилга ХХК"
            className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground-muted">Утас</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="99xxxxxx"
            className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground-muted">Танилцуулга</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Компанийн тухай, туршлага, чиглэл..."
            className="w-full resize-none rounded-xl border border-[var(--glass-border)] bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand/50"
          />
        </div>
        <button
          type="button"
          onClick={saveDetails}
          disabled={saving === 'details' || !name.trim()}
          className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving === 'details' && <Loader2 className="h-4 w-4 animate-spin" />}
          Хадгалах
        </button>
      </section>

      {/* Portfolio */}
      <section className="space-y-4 rounded-2xl border border-[var(--glass-border)] bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Хийсэн ажил / үнийн санал</h2>
          <span className="text-xs text-foreground-muted">{portfolio.length}/{MAX_PORTFOLIO}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {portfolio.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--glass-border)] bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveVendureAssetUrl(url)} alt="ажил" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePortfolio(url)}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Устгах"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {portfolio.length < MAX_PORTFOLIO && (
            <button
              type="button"
              onClick={() => portfolioRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--glass-border)] text-foreground-muted hover:border-brand/40 hover:text-brand"
            >
              {saving === 'PORTFOLIO' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              <span className="text-xs font-medium">Зураг нэмэх</span>
            </button>
          )}
        </div>
      </section>

      <input ref={logoRef} type="file" accept={ACCEPT} className="hidden"
        onChange={(e) => e.target.files?.[0] && void handleUpload(e.target.files[0], 'LOGO')} />
      <input ref={coverRef} type="file" accept={ACCEPT} className="hidden"
        onChange={(e) => e.target.files?.[0] && void handleUpload(e.target.files[0], 'COVER')} />
      <input ref={portfolioRef} type="file" accept={ACCEPT} className="hidden"
        onChange={(e) => e.target.files?.[0] && void handleUpload(e.target.files[0], 'PORTFOLIO')} />
    </div>
  );
}
