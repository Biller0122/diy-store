import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
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

export function HomepageBanner({ banners }: { banners: HomepageBannerData[] }) {
  if (banners.length === 0) return null;
  const animated = banners.length > 1;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
      <div className="relative overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-card shadow-2xl shadow-black/30">
        <div className="absolute inset-0 opacity-70">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 ${animated ? 'animate-banner-fade' : 'opacity-100'}`}
              style={{
                animationDelay: animated ? `${index * 5}s` : undefined,
                animationDuration: animated ? `${Math.max(1, banners.length) * 5}s` : undefined,
                background: `radial-gradient(circle at ${25 + index * 18}% 30%, ${banner.accentColor}55, transparent 34%), linear-gradient(120deg, ${banner.accentColor}22, transparent 55%)`,
              }}
            />
          ))}
        </div>
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full border border-white/10" />
        <div className="relative grid min-h-[320px] items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-[230px]">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`absolute inset-0 flex flex-col justify-center ${animated ? 'animate-banner-slide' : 'opacity-100'}`}
                style={{
                  animationDelay: animated ? `${index * 5}s` : undefined,
                  animationDuration: animated ? `${Math.max(1, banners.length) * 5}s` : undefined,
                }}
              >
                <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  <Sparkles size={13} />
                  {banner.eyebrow || 'Онцлох санал'}
                </div>
                <h2 className="max-w-2xl font-display text-3xl font-black leading-tight text-white sm:text-5xl">
                  {banner.title}
                </h2>
                {banner.subtitle && (
                  <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                    {banner.subtitle}
                  </p>
                )}
                {banner.ctaHref && banner.ctaLabel && (
                  <Link
                    href={banner.ctaHref}
                    className="mt-6 inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-dark transition-transform hover:scale-105"
                  >
                    {banner.ctaLabel}
                    <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            ))}
          </div>
          <div className="relative hidden min-h-[260px] lg:block">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`absolute inset-0 ${animated ? 'animate-banner-card' : 'opacity-100'}`}
                style={{
                  animationDelay: animated ? `${index * 5}s` : undefined,
                  animationDuration: animated ? `${Math.max(1, banners.length) * 5}s` : undefined,
                }}
              >
                <div className="relative h-full overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl bg-black/20">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 text-5xl">
                          🛠️
                        </div>
                        <BrandLogo imageClassName="mx-auto w-56" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
