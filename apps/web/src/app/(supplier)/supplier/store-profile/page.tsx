'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  Eye,
  ImagePlus,
  MapPin,
  Package,
  Pencil,
  Phone,
  Play,
  Plus,
  Share2,
  Sparkles,
  Star,
  Store,
  Video,
  X,
} from 'lucide-react';
import { useSupplierStore } from '@/lib/supplier-store';
import { resolveVendureAssetUrl, vendureShopFetch } from '@/lib/vendure';
import { formatPrice } from '@/lib/price';

type ProfileProduct = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  price: number;
  stock: number;
};

const SUPPLIER_PRODUCTS_QUERY = `
  query StoreProfileProducts($supplierId: String) {
    supplierProducts(supplierId: $supplierId) {
      items { id name slug image price stock }
    }
  }
`;

const UPDATE_SUPPLIER_PROFILE = `
  mutation UpdateSupplierProfile($id: ID!, $input: UpdateSupplierInput!) {
    updateSupplier(id: $id, input: $input) {
      id businessName slug logo coverImage youtubeUrl posterUrls description ownerName phone email
      address district bankAccount bankName workingHours {
        weekdays { start end }
        saturday { start end }
        sunday { closed start end }
      }
      status commissionRate rating reviewCount productCount
    }
  }
`;

const UPLOAD_SUPPLIER_PROFILE_IMAGE = `
  mutation UploadSupplierProfileImage($supplierId: ID!, $input: SupplierProfileImageInput!) {
    uploadSupplierProfileImage(supplierId: $supplierId, input: $input)
  }
`;

const posterIdeas = [
  {
    eyebrow: 'ЭНЭ 7 ХОНОГТ',
    title: 'Багажны шинэ сонголт',
    note: 'Шинээр ирсэн бараануудаа нэг дор онцлоорой',
    style: 'from-[#ff4b00] via-[#ff6b00] to-[#ff9d2f]',
  },
  {
    eyebrow: 'БАГЦЫН САНАЛ',
    title: 'Мастер багц',
    note: 'Хамт авбал илүү ашигтай барааны багц',
    style: 'from-[#101827] via-[#243653] to-[#3e5b83]',
  },
  {
    eyebrow: 'ШИНЭ БАРАА',
    title: '2026 цуглуулга',
    note: 'Шинэ бүтээгдэхүүний танилцуулга постер',
    style: 'from-[#0b6958] via-[#11967c] to-[#42c69f]',
  },
];

export default function StoreProfileDesignPage() {
  const router = useRouter();
  const { supplier, setSupplier } = useSupplierStore();
  const [products, setProducts] = useState<ProfileProduct[]>([]);
  const [loading, setLoading] = useState(Boolean(supplier?.id));
  const [coverImage, setCoverImage] = useState(supplier?.coverImage ?? '');
  const [posterUrls, setPosterUrls] = useState<string[]>(supplier?.posterUrls ?? []);
  const [youtubeUrl, setYoutubeUrl] = useState(supplier?.youtubeUrl ?? '');
  const [youtubeDraft, setYoutubeDraft] = useState(supplier?.youtubeUrl ?? '');
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const youtubeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    if (!supplier?.id) {
      return;
    }

    vendureShopFetch<{ supplierProducts: { items: ProfileProduct[] } }>(
      SUPPLIER_PRODUCTS_QUERY,
      { supplierId: supplier.id },
    )
      .then((data) => {
        if (mounted) setProducts(data.supplierProducts.items.slice(0, 4));
      })
      .catch(() => {
        if (mounted) setProducts([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [supplier?.id]);

  async function updateProfile(input: Record<string, unknown>) {
    if (!supplier?.id) throw new Error('Нийлүүлэгчийн мэдээлэл олдсонгүй');
    const data = await vendureShopFetch<{ updateSupplier: NonNullable<typeof supplier> }>(
      UPDATE_SUPPLIER_PROFILE,
      { id: supplier.id, input },
    );
    setSupplier(data.updateSupplier);
    router.refresh();
    window.setTimeout(() => {
      router.refresh();
      if (data.updateSupplier.slug) router.prefetch(`/suppliers/${data.updateSupplier.slug}`);
    }, 3000);
    return data.updateSupplier;
  }

  async function uploadImage(file: File, target: 'logo' | 'cover' | 'poster') {
    if (!supplier?.id) return;
    setError('');
    setMessage('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Зөвхөн PNG, JPG, WEBP зураг сонгоно уу.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Зургийн хэмжээ 5MB-аас бага байна.');
      return;
    }

    setSaving(target);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Зураг уншихад алдаа гарлаа'));
        reader.readAsDataURL(file);
      });
      const upload = await vendureShopFetch<{ uploadSupplierProfileImage: string }>(
        UPLOAD_SUPPLIER_PROFILE_IMAGE,
        { supplierId: supplier.id, input: { filename: file.name, mimeType: file.type, dataUrl } },
      );
      const url = upload.uploadSupplierProfileImage;
      if (target === 'logo') {
        await updateProfile({ logo: url });
      } else if (target === 'cover') {
        await updateProfile({ coverImage: url });
        setCoverImage(url);
      } else {
        const nextPosters = [...posterUrls, url].slice(0, 6);
        await updateProfile({ posterUrls: nextPosters });
        setPosterUrls(nextPosters);
      }
      setMessage('Зураг амжилттай хадгалагдлаа.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Зураг upload хийхэд алдаа гарлаа');
    } finally {
      setSaving('');
    }
  }

  async function saveYoutubeUrl() {
    setError('');
    setMessage('');
    const trimmed = youtubeDraft.trim();
    if (trimmed && !getYoutubeId(trimmed)) {
      setError('YouTube холбоос зөв биш байна.');
      return;
    }
    setSaving('youtube');
    try {
      await updateProfile({ youtubeUrl: trimmed });
      setYoutubeUrl(trimmed);
      setMessage('YouTube бичлэг хадгалагдлаа.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'YouTube холбоос хадгалахад алдаа гарлаа');
    } finally {
      setSaving('');
    }
  }

  async function removePoster(url: string) {
    setSaving('poster');
    setError('');
    try {
      const nextPosters = posterUrls.filter((poster) => poster !== url);
      await updateProfile({ posterUrls: nextPosters });
      setPosterUrls(nextPosters);
      setMessage('Постер хасагдлаа.');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Постер хасахад алдаа гарлаа');
    } finally {
      setSaving('');
    }
  }

  async function shareStoreProfile() {
    const publicUrl = `${window.location.origin}/suppliers/${supplier?.slug ?? ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: storeName, url: publicUrl });
      } else {
        await navigator.clipboard.writeText(publicUrl);
        setMessage('Дэлгүүрийн холбоос хуулагдлаа.');
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setError('Холбоос хуваалцахад алдаа гарлаа.');
    }
  }

  function focusYoutubeInput() {
    document.getElementById('about-video')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => youtubeInputRef.current?.focus(), 350);
  }

  function openPosterPicker() {
    document.getElementById('posters')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    posterInputRef.current?.click();
  }

  const storeName = supplier?.businessName || 'Таны дэлгүүр';
  const youtubeId = getYoutubeId(youtubeUrl);
  const coverImageSrc = resolveVendureAssetUrl(coverImage);
  const logoSrc = resolveVendureAssetUrl(supplier?.logo);
  const initials = storeName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-brand">
            <Sparkles size={14} /> PROFILE DESIGN PREVIEW
          </div>
          <h2 className="text-2xl font-bold text-foreground">Дэлгүүрийн шинэ нүүр хуудас</h2>
          <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
            Профайл зураг, танилцуулга бичлэг, сурталчилгааны постер болон бараагаа нэг дор харуулах загвар.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/suppliers/${supplier?.slug ?? ''}`} target="_blank" className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-brand/40">
            <Eye size={16} /> Хэрэглэгчээр харах
          </Link>
          <Link href="/supplier/settings" className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-hover">
            <Pencil size={16} /> Профайл засах
          </Link>
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${error ? 'border-error/30 bg-error/10 text-error' : 'border-success/30 bg-success/10 text-success'}`}>
          {error || message}
        </div>
      )}

      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadImage(event.target.files[0], 'logo')} />
      <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadImage(event.target.files[0], 'cover')} />
      <input ref={posterInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadImage(event.target.files[0], 'poster')} />

      <section id="profile-home" className="scroll-mt-20 overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-card shadow-xl shadow-black/5">
        <div className="relative h-48 overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,.22),transparent_25%),linear-gradient(120deg,#111827_0%,#233553_45%,#ff4b00_140%)] md:h-64">
          {coverImageSrc && <Image src={coverImageSrc} alt="Дэлгүүрийн cover" fill priority className="object-cover" />}
          {coverImageSrc && <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-black/10" />}
          <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full border-[48px] border-white/5" />
          <div className="absolute bottom-0 right-0 hidden w-[52%] -skew-x-12 bg-brand/90 py-20 md:block" />
          <div className="absolute left-6 top-6 max-w-md text-white md:left-10 md:top-10">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[0.2em] backdrop-blur">ТАНЫ БРЭНДИЙН ОРОН ЗАЙ</span>
            <p className="mt-4 text-2xl font-black leading-tight md:text-4xl">Чанартай бараа.<br />Найдвартай үйлчилгээ.</p>
          </div>
          <button type="button" onClick={() => coverInputRef.current?.click()} disabled={Boolean(saving)} className="absolute right-4 top-4 flex items-center gap-2 rounded-xl bg-black/45 px-3 py-2 text-xs font-semibold text-white backdrop-blur disabled:opacity-60 md:right-6 md:top-6">
            <Camera size={15} /> {saving === 'cover' ? 'Оруулж байна...' : 'Cover зураг солих'}
          </button>
        </div>

        <div className="relative px-5 pb-6 md:px-9">
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="relative -mt-14 h-28 w-28 shrink-0 rounded-[26px] border-4 border-card bg-gradient-to-br from-brand to-[#ff8b33] shadow-lg md:-mt-16 md:h-32 md:w-32">
              {logoSrc ? (
                <Image src={logoSrc} alt={storeName} fill className="rounded-[22px] object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">{initials || <Store />}</div>
              )}
              <button type="button" onClick={() => logoInputRef.current?.click()} disabled={Boolean(saving)} className="absolute -bottom-2 -right-2 rounded-full border-4 border-card bg-brand p-2 text-white shadow disabled:opacity-60">
                <Camera size={15} />
              </button>
            </div>

            <div className="min-w-0 flex-1 pt-4 md:pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-2xl font-black text-foreground md:text-3xl">{storeName}</h3>
                <CheckCircle2 size={20} className="fill-brand text-white" />
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">Нээлттэй</span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
                {supplier?.description || 'Мэргэжлийн багаж, барилгын материалын сонголтыг нэг дороос. Энд дэлгүүр өөрийн товч танилцуулгаа бичнэ.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground-muted">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-brand" />{supplier?.district || 'Байршил оруулах'}</span>
                <span className="flex items-center gap-1.5"><Phone size={14} className="text-brand" />{supplier?.phone || 'Утас оруулах'}</span>
                <span className="flex items-center gap-1.5"><Star size={14} className="fill-amber-400 text-amber-400" />{supplier?.rating || 'Шинэ'} үнэлгээ</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 md:pt-5">
              <a href={`tel:${supplier?.phone ?? ''}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white md:flex-none">
                <Phone size={16} /> Холбогдох
              </a>
              <button type="button" onClick={() => void shareStoreProfile()} className="rounded-xl border border-[var(--glass-border)] p-3 text-foreground-muted" aria-label="Дэлгүүрийн холбоос хуваалцах"><Share2 size={17} /></button>
            </div>
          </div>

          <div className="mt-6 flex gap-6 overflow-x-auto border-t border-[var(--glass-border)] pt-4 text-sm font-semibold text-foreground-muted">
            <a href="#profile-home" className="border-b-2 border-brand pb-3 text-brand">Нүүр</a>
            <a href="#products" className="whitespace-nowrap pb-3 hover:text-brand">Бүх бараа</a>
            <a href="#posters" className="whitespace-nowrap pb-3 hover:text-brand">Постерууд</a>
            <a href="#about-video" className="whitespace-nowrap pb-3 hover:text-brand">Дэлгүүрийн тухай</a>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,.65fr)]">
        <div className="space-y-5">
          <section id="about-video" className="scroll-mt-20 rounded-3xl border border-[var(--glass-border)] bg-card p-4 md:p-6">
            <div className="mb-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground"><CirclePlay size={20} className="text-brand" /> Манай дэлгүүрийн тухай</h3>
                <p className="mt-1 text-xs text-foreground-muted">YouTube дээр байршуулсан танилцуулга бичлэгийн URL оруулна</p>
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                ref={youtubeInputRef}
                type="url"
                value={youtubeDraft}
                onChange={(event) => setYoutubeDraft(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="min-w-0 flex-1 rounded-xl border border-[var(--glass-border)] bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand"
              />
              <button type="button" onClick={() => void saveYoutubeUrl()} disabled={saving === 'youtube'} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {saving === 'youtube' ? 'Хадгалж байна...' : 'URL хадгалах'}
              </button>
            </div>

            <div className="group relative aspect-video overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_78%_28%,rgba(255,75,0,.65),transparent_22%),linear-gradient(135deg,#0b1220,#253652)]">
              {youtubeId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                  title={`${storeName} танилцуулга`}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand shadow-2xl shadow-brand/40"><Play size={25} fill="currentColor" /></div>
                  <p className="text-lg font-bold">{storeName}-тай танилцаарай</p>
                  <p className="mt-1 text-xs text-white/60">YouTube URL оруулахад бичлэг энд харагдана</p>
                </div>
              )}
            </div>
          </section>

          <section id="posters" className="scroll-mt-20 rounded-3xl border border-[var(--glass-border)] bg-card p-4 md:p-6">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Онцлох сурталчилгаа</h3>
                <p className="mt-1 text-xs text-foreground-muted">Улирлын санал, шинэ бараа, багцын постеруудаа байрлуулна</p>
              </div>
              <button type="button" onClick={() => posterInputRef.current?.click()} disabled={Boolean(saving) || posterUrls.length >= 6} className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-brand disabled:opacity-50"><ImagePlus size={15} /> {saving === 'poster' ? 'Оруулж байна...' : 'Постер нэмэх'}</button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {posterUrls.length ? posterUrls.map((url, index) => (
                <article key={url} className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface">
                  <Image src={resolveVendureAssetUrl(url)} alt={`Сурталчилгааны постер ${index + 1}`} fill className="object-cover" />
                  <button type="button" onClick={() => void removePoster(url)} className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100" aria-label="Постер хасах"><X size={14} /></button>
                </article>
              )) : posterIdeas.map((poster) => (
                <article key={poster.title} className={`relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br ${poster.style} p-5 text-white`}>
                  <div className="absolute -bottom-14 -right-12 h-40 w-40 rounded-full border-[28px] border-white/10" />
                  <p className="text-[10px] font-black tracking-[0.18em] text-white/70">{poster.eyebrow}</p>
                  <h4 className="mt-3 max-w-[10rem] text-2xl font-black leading-tight">{poster.title}</h4>
                  <p className="absolute bottom-5 left-5 right-5 text-xs leading-relaxed text-white/75">{poster.note}</p>
                  <button type="button" onClick={() => posterInputRef.current?.click()} className="absolute right-3 top-3 rounded-lg bg-black/20 p-2 backdrop-blur" aria-label="Постер зураг оруулах"><Pencil size={13} /></button>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-[var(--glass-border)] bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">Профайлын бэлэн байдал</h3>
              <span className="text-sm font-black text-brand">60%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full w-3/5 rounded-full bg-brand" /></div>
            <div className="mt-5 space-y-3 text-sm">
              <ProfileTask done label="Дэлгүүрийн мэдээлэл" href="/supplier/settings" />
              <ProfileTask done={Boolean(supplier?.logo)} label="Профайл зураг" onClick={() => logoInputRef.current?.click()} />
              <ProfileTask done={Boolean(youtubeId)} label="Танилцуулга бичлэг" onClick={focusYoutubeInput} />
              <ProfileTask done={posterUrls.length >= 3} label="3 сурталчилгааны постер" onClick={openPosterPicker} />
            </div>
          </section>

          <section className="rounded-3xl border border-brand/20 bg-gradient-to-br from-brand/15 to-transparent p-5">
            <Video size={22} className="text-brand" />
            <h3 className="mt-3 font-bold text-foreground">Media зөвлөмж</h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-foreground-muted">
              <li>Cover зураг: 1600 x 500 px</li>
              <li>Profile зураг: 400 x 400 px</li>
              <li>Видео: YouTube URL, 16:9 харьцаа</li>
              <li>Постер: 1080 x 1350 px</li>
            </ul>
          </section>
        </aside>
      </div>

      <section id="products" className="scroll-mt-20 rounded-3xl border border-[var(--glass-border)] bg-card p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground"><Package size={19} className="text-brand" /> Манай бараанууд</h3>
            <p className="mt-1 text-xs text-foreground-muted">Нэмсэн бараанууд profile дээр автоматаар харагдана</p>
          </div>
          <Link href="/supplier/products" className="flex items-center gap-1 text-xs font-bold text-brand">Бүгдийг харах <ChevronRight size={15} /></Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="aspect-[4/5] animate-pulse rounded-2xl bg-surface" />)}
          </div>
        ) : products.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {products.map((product) => (
              <Link href={`/product/${product.slug}`} key={product.id} className="overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-surface transition-transform hover:-translate-y-0.5">
                <div className="relative aspect-square bg-white">
                  {resolveVendureAssetUrl(product.image) ? (
                    <Image src={resolveVendureAssetUrl(product.image)} alt={product.name} fill className="object-contain p-3" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-foreground-muted"><Package size={30} /></div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="line-clamp-2 min-h-10 text-sm font-semibold text-foreground">{product.name}</h4>
                  <p className="mt-2 font-black text-brand">₮{formatPrice(product.price)}</p>
                  <p className="mt-1 text-[10px] text-foreground-muted">Үлдэгдэл {product.stock}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--glass-border)] py-10 text-center">
            <Package size={28} className="text-foreground-muted" />
            <p className="mt-3 text-sm font-semibold text-foreground">Одоогоор бараа алга</p>
            <Link href="/supplier/products/new" className="mt-3 flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white"><Plus size={14} /> Бараа нэмэх</Link>
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileTask({ done = false, label, href, onClick }: { done?: boolean; label: string; href?: string; onClick?: () => void }) {
  return (
    <div className="flex items-center gap-2.5">
      {done ? <CheckCircle2 size={17} className="text-success" /> : <span className="h-[17px] w-[17px] rounded-full border-2 border-foreground-muted/35" />}
      <span className={done ? 'text-foreground' : 'text-foreground-muted'}>{label}</span>
      {href ? (
        <Link href={href} className="ml-auto text-[11px] font-bold text-brand">{done ? 'Засах' : 'Нэмэх'}</Link>
      ) : (
        <button type="button" onClick={onClick} className="ml-auto text-[11px] font-bold text-brand">{done ? 'Солих' : 'Нэмэх'}</button>
      )}
    </div>
  );
}

function getYoutubeId(value: string) {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] ?? '';
    if (!url.hostname.endsWith('youtube.com')) return '';
    if (url.pathname === '/watch') return url.searchParams.get('v') ?? '';
    const parts = url.pathname.split('/').filter(Boolean);
    if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1] ?? '';
    return '';
  } catch {
    return '';
  }
}
