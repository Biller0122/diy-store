'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit3, ImagePlus, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { vendureAdminFetch } from '@/lib/vendure';

type Banner = {
  id: string;
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  imageUrl?: string | null;
  accentColor: string;
  sortOrder: number;
  enabled: boolean;
};

type BannerForm = Omit<Banner, 'id'> & { id?: string };

const EMPTY_FORM: BannerForm = {
  title: '',
  subtitle: '',
  eyebrow: 'Онцлох санал',
  ctaLabel: 'Дэлгэрэнгүй',
  ctaHref: '/category',
  imageUrl: '',
  accentColor: '#ff4500',
  sortOrder: 0,
  enabled: true,
};

const BANNERS_QUERY = `
  query AdminHomepageBanners {
    adminHomepageBanners {
      id
      title
      subtitle
      eyebrow
      ctaLabel
      ctaHref
      imageUrl
      accentColor
      sortOrder
      enabled
    }
  }
`;

const CREATE_BANNER = `
  mutation CreateHomepageBanner($input: HomepageBannerInput!) {
    createHomepageBanner(input: $input) { id }
  }
`;

const UPDATE_BANNER = `
  mutation UpdateHomepageBanner($id: ID!, $input: HomepageBannerInput!) {
    updateHomepageBanner(id: $id, input: $input) { id }
  }
`;

const DELETE_BANNER = `
  mutation DeleteHomepageBanner($id: ID!) {
    deleteHomepageBanner(id: $id)
  }
`;

const UPLOAD_BANNER_IMAGE = `
  mutation UploadHomepageBannerImage($input: HomepageBannerImageInput!) {
    uploadHomepageBannerImage(input: $input)
  }
`;

function toInput(form: BannerForm) {
  return {
    title: form.title.trim(),
    subtitle: form.subtitle?.trim() || null,
    eyebrow: form.eyebrow?.trim() || null,
    ctaLabel: form.ctaLabel?.trim() || null,
    ctaHref: form.ctaHref?.trim() || null,
    imageUrl: form.imageUrl?.trim() || null,
    accentColor: form.accentColor || '#ff4500',
    sortOrder: Number(form.sortOrder) || 0,
    enabled: form.enabled,
  };
}

export default function AdminCmsPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const editing = Boolean(form.id);
  const activeCount = useMemo(() => banners.filter((banner) => banner.enabled).length, [banners]);

  async function loadBanners() {
    setLoading(true);
    setError('');
    try {
      const data = await vendureAdminFetch<{ adminHomepageBanners: Banner[] }>(BANNERS_QUERY);
      setBanners(data.adminHomepageBanners ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Баннер уншихад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBanners();
  }, []);

  function editBanner(banner: Banner) {
    setForm({
      ...banner,
      subtitle: banner.subtitle ?? '',
      eyebrow: banner.eyebrow ?? '',
      ctaLabel: banner.ctaLabel ?? '',
      ctaHref: banner.ctaHref ?? '',
      imageUrl: banner.imageUrl ?? '',
    });
    setMessage('');
    setError('');
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setMessage('');
    setError('');
  }

  async function saveBanner(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.title.trim()) {
      setError('Баннерийн гарчиг оруулна уу.');
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await vendureAdminFetch(UPDATE_BANNER, { id: form.id, input: toInput(form) });
        setMessage('Баннер шинэчлэгдлээ.');
      } else {
        await vendureAdminFetch(CREATE_BANNER, { input: toInput(form) });
        setMessage('Шинэ баннер нэмэгдлээ.');
      }
      setForm(EMPTY_FORM);
      await loadBanners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function deleteBanner(banner: Banner) {
    if (!window.confirm(`"${banner.title}" баннерийг устгах уу?`)) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await vendureAdminFetch(DELETE_BANNER, { id: banner.id });
      setMessage('Баннер устгагдлаа.');
      if (form.id === banner.id) setForm(EMPTY_FORM);
      await loadBanners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Устгахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function uploadBannerImage(file: File) {
    setError('');
    setMessage('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Зөвхөн PNG, JPG, WEBP зураг оруулна уу.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Зургийн хэмжээ 4MB-аас их байна.');
      return;
    }
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Зураг уншихад алдаа гарлаа'));
        reader.readAsDataURL(file);
      });
      const data = await vendureAdminFetch<{ uploadHomepageBannerImage: string }>(UPLOAD_BANNER_IMAGE, {
        input: {
          filename: file.name,
          mimeType: file.type,
          dataUrl,
        },
      });
      setForm((current) => ({ ...current, imageUrl: data.uploadHomepageBannerImage }));
      setMessage('Зураг амжилттай upload хийгдлээ.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Зураг upload хийхэд алдаа гарлаа');
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ImagePlus size={20} className="text-brand" />
            Нүүр хуудасны баннер
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Нүүр хуудсанд харагдах хөдөлгөөнтэй banner carousel-ийг эндээс удирдана.
          </p>
        </div>
        <button
          onClick={loadBanners}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] px-4 py-2 text-sm font-semibold text-foreground-muted hover:bg-white/5 hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Дахин унших
        </button>
      </div>

      {(error || message) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          error
            ? 'border-error/30 bg-error/10 text-error'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        }`}>
          {error || message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={saveBanner} className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">{editing ? 'Баннер засах' : 'Шинэ баннер'}</h3>
              <p className="text-xs text-foreground-muted">{activeCount} идэвхтэй баннер</p>
            </div>
            {editing && (
              <button type="button" onClick={resetForm} className="rounded-lg p-1.5 text-foreground-muted hover:bg-white/5 hover:text-foreground">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {[
              ['title', 'Гарчиг', 'Зуны засварын супер санал'],
              ['subtitle', 'Тайлбар', 'Бүх хэрэгтэй бараагаа нэг дороос аваарай'],
              ['eyebrow', 'Дээд жижиг текст', 'Онцлох санал'],
              ['ctaLabel', 'Товчны текст', 'Ангилал харах'],
              ['ctaHref', 'Товчны холбоос', '/category'],
              ['imageUrl', 'Зургийн URL', 'https://...'],
            ].map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">{label}</span>
                <input
                  value={String(form[key as keyof BannerForm] ?? '')}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand/60"
                />
              </label>
            ))}

            <div className="rounded-xl border border-[var(--glass-border)] bg-surface p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground-muted">Баннерийн зураг</p>
                  <p className="text-[11px] text-foreground-muted">PNG, JPG, WEBP · 4MB хүртэл</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--glass-border)] px-3 py-2 text-xs font-bold text-foreground hover:bg-white/5">
                  {uploadingImage ? <RefreshCw size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                  {uploadingImage ? 'Оруулж байна' : 'Зураг сонгох'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploadingImage}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadBannerImage(file);
                      event.target.value = '';
                    }}
                    className="sr-only"
                  />
                </label>
              </div>
              <div className="flex min-h-28 items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/10 bg-black/20">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" className="h-36 w-full object-cover" />
                ) : (
                  <div className="py-8 text-center text-xs text-foreground-muted">
                    Зураг сонгоогүй байна.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_110px] gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Accent color</span>
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(event) => setForm((current) => ({ ...current, accentColor: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-[var(--glass-border)] bg-surface px-2"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Дараалал</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand/60"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
              />
              Идэвхтэй
            </label>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : editing ? <Save size={16} /> : <Plus size={16} />}
              {editing ? 'Шинэчлэх' : 'Нэмэх'}
            </button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-card">
          <div className="border-b border-[var(--glass-border)] px-5 py-4">
            <h3 className="text-sm font-bold text-foreground">Баннерууд</h3>
            <p className="text-xs text-foreground-muted">{banners.length} banner</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={22} className="animate-spin text-brand" />
            </div>
          ) : banners.length === 0 ? (
            <div className="py-20 text-center text-sm text-foreground-muted">
              Баннер бүртгэгдээгүй байна.
            </div>
          ) : (
            <div className="divide-y divide-[var(--glass-border)]">
              {banners.map((banner) => (
                <div key={banner.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10" style={{ background: banner.accentColor }}>
                    {banner.imageUrl && <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{banner.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        banner.enabled ? 'bg-success/15 text-success' : 'bg-foreground-muted/15 text-foreground-muted'
                      }`}>
                        {banner.enabled ? 'Идэвхтэй' : 'Идэвхгүй'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-foreground-muted">
                      {banner.eyebrow || 'Онцлох санал'} · {banner.ctaHref || 'link алга'} · #{banner.sortOrder}
                    </p>
                  </div>
                  <button
                    onClick={() => editBanner(banner)}
                    className="rounded-lg p-2 text-foreground-muted hover:bg-white/5 hover:text-foreground"
                    aria-label="Засах"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => deleteBanner(banner)}
                    className="rounded-lg p-2 text-foreground-muted hover:bg-error/10 hover:text-error"
                    aria-label="Устгах"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
