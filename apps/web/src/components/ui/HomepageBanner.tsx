'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export type HomepageBannerData = {
  id: string;
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  imageUrl?: string | null;
  accentColor: string;
};

const AUTOPLAY_MS = 5000;

function BannerImage({ banner }: { banner: HomepageBannerData }) {
  if (banner.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 h-full w-full object-cover" />;
  }
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${banner.accentColor}, #0b0b14 75%)` }}
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 text-4xl">🛠️</div>
        <BrandLogo imageClassName="mx-auto w-48" />
      </div>
    </div>
  );
}

export function HomepageBanner({ banners }: { banners: HomepageBannerData[] }) {
  const [active, setActive] = useState(0);
  const count = banners.length;

  const next = useCallback(() => setActive((i) => (i + 1) % Math.max(1, count)), [count]);
  const prev = useCallback(() => setActive((i) => (i - 1 + count) % Math.max(1, count)), [count]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, next, active]);

  if (count === 0) return null;

  const secondary = banners[(active + 1) % count];

  return (
    <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[1.9fr_1fr]">
        {/* ── Main carousel ── */}
        <div className="group relative h-[280px] overflow-hidden rounded-[24px] border border-[var(--glass-border)] bg-card shadow-2xl shadow-black/30 sm:h-[340px]">
          {banners.map((banner, index) => (
            <Link
              key={banner.id}
              href={banner.ctaHref || '#'}
              className={`absolute inset-0 transition-opacity duration-700 ${index === active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
              aria-hidden={index !== active}
            >
              <BannerImage banner={banner} />
              {/* Readability overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
              {/* Text */}
              <div className="absolute inset-0 flex flex-col justify-center gap-3 p-6 sm:p-10">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  <Sparkles size={12} /> {banner.eyebrow || 'Онцлох санал'}
                </span>
                <h2 className="max-w-xl font-display text-2xl font-black leading-tight text-white drop-shadow sm:text-4xl">
                  {banner.title}
                </h2>
                {banner.subtitle && (
                  <p className="max-w-md text-sm text-white/85 sm:text-base">{banner.subtitle}</p>
                )}
                {banner.ctaLabel && (
                  <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/30">
                    {banner.ctaLabel}
                  </span>
                )}
              </div>
            </Link>
          ))}

          {/* Arrows */}
          {count > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Өмнөх"
                className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white opacity-0 shadow-lg transition-opacity hover:bg-brand-hover group-hover:opacity-100"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={next}
                aria-label="Дараах"
                className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white opacity-0 shadow-lg transition-opacity hover:bg-brand-hover group-hover:opacity-100"
              >
                <ChevronRight size={20} />
              </button>
              {/* Dots */}
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    onClick={() => setActive(index)}
                    aria-label={`Banner ${index + 1}`}
                    className={`h-2 rounded-full transition-all ${index === active ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Secondary banner (peek of next) ── */}
        {count > 1 && (
          <Link
            href={secondary.ctaHref || '#'}
            className="relative hidden h-[340px] overflow-hidden rounded-[24px] border border-[var(--glass-border)] bg-card shadow-2xl shadow-black/30 lg:block"
          >
            <BannerImage banner={secondary} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                {secondary.eyebrow || 'Дараагийн'}
              </span>
              <h3 className="mt-2 font-display text-lg font-black leading-tight text-white drop-shadow">
                {secondary.title}
              </h3>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
