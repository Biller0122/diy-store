import { notFound } from 'next/navigation';
import { Phone, Building2 } from 'lucide-react';
import { fetchCompanyProfile } from '@/lib/company-profile';
import { resolveVendureAssetUrl } from '@/lib/vendure';

export const revalidate = 60;

export default async function CompanyPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await fetchCompanyProfile(decodeURIComponent(slug)).catch(() => null);
  if (!profile || !profile.isCompany || !profile.companyName) notFound();

  const coverSrc = resolveVendureAssetUrl(profile.companyCover);
  const logoSrc = resolveVendureAssetUrl(profile.companyLogo);
  const portfolio = profile.companyPortfolio ?? [];

  return (
    <div className="min-h-screen bg-dark pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Cover + logo */}
        <div className="relative mt-4 h-44 overflow-hidden rounded-2xl bg-surface sm:h-60">
          {coverSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverSrc} alt="cover" className="h-full w-full object-cover" />
          )}
        </div>

        <div className="-mt-12 flex flex-col items-start gap-4 px-2 sm:flex-row sm:items-end">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-dark bg-surface">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt={profile.companyName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Building2 className="h-9 w-9 text-foreground-muted" />
              </div>
            )}
          </div>
          <div className="flex-1 pb-1">
            <h1 className="text-2xl font-black text-foreground">{profile.companyName}</h1>
            <p className="text-sm text-foreground-muted">Барилгын компани</p>
          </div>
          {profile.companyPhone && (
            <a
              href={`tel:${profile.companyPhone}`}
              className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Phone className="h-4 w-4" /> {profile.companyPhone}
            </a>
          )}
        </div>

        {profile.companyDescription && (
          <section className="mt-6 rounded-2xl border border-[var(--glass-border)] bg-card p-5">
            <h2 className="mb-2 text-sm font-bold text-foreground">Бидний тухай</h2>
            <p className="whitespace-pre-line text-sm leading-6 text-foreground-muted">{profile.companyDescription}</p>
          </section>
        )}

        {portfolio.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-base font-bold text-foreground">Хийсэн ажил, үнийн санал</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {portfolio.map((url, i) => (
                <div key={`${url}-${i}`} className="aspect-square overflow-hidden rounded-xl border border-[var(--glass-border)] bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolveVendureAssetUrl(url)} alt={`Ажил ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
