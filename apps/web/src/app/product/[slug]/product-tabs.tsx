'use client';

import { useState } from 'react';
import ReviewSection from '@/components/reviews/ReviewSection';

interface FacetValue {
  id: string;
  name: string;
  facet: { id: string; name: string; code: string };
}

interface Variant {
  sku: string;
  name: string;
}

const TABS = [
  { id: 'features', label: 'Тайлбар' },
  { id: 'specs', label: 'Техникийн үзүүлэлт' },
  { id: 'reviews', label: 'Сэтгэгдэл' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── Tab content panels ─────────────────────────────────────

function FeaturesTab({ description }: { description: string }) {
  if (!description) {
    return (
      <p className="text-sm text-foreground-muted">Merchant бараа нэмэх хэсэгт тайлбар оруулаагүй байна.</p>
    );
  }
  return (
    <div
      className="prose prose-sm max-w-none text-foreground-muted"
      dangerouslySetInnerHTML={{ __html: description }}
    />
  );
}

function SpecsTab({
  facetValues,
  variants,
}: {
  facetValues: FacetValue[];
  variants: Variant[];
}) {
  const groups = facetValues.reduce<Record<string, { name: string; values: string[] }>>(
    (acc, fv) => {
      const code = fv.facet.code;
      if (!acc[code]) acc[code] = { name: fv.facet.name, values: [] };
      acc[code].values.push(fv.name);
      return acc;
    },
    {},
  );

  const rows: { label: string; value: string }[] = [
    ...Object.values(groups).map((g) => ({ label: g.name, value: g.values.join(', ') })),
    ...(variants.length > 0
      ? [{ label: 'Барааны код (SKU/slug)', value: variants.map((v) => v.sku).join(', ') }]
      : []),
    { label: 'Загварын тоо', value: String(variants.length || 1) },
  ];

  if (rows.length === 0) {
    return <p className="text-sm text-foreground-muted">Техникийн үзүүлэлт оруулаагүй байна.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--glass-border)]">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-dark' : 'bg-card'}>
              <td className="w-48 py-3 pl-4 pr-2 font-medium text-foreground-muted">{row.label}</td>
              <td className="py-3 pr-4 text-foreground">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewsTab({ productId }: { productId: string }) {
  return <ReviewSection productId={productId} />;
}

// ─── Main component ──────────────────────────────────────────

export default function ProductTabs({
  description,
  facetValues,
  variants,
  productId,
}: {
  description: string;
  facetValues: FacetValue[];
  variants: Variant[];
  productId: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('features');

  return (
    <div>
      {/* Tab headers — scrollable on mobile */}
      <div className="flex overflow-x-auto border-b border-[var(--glass-border)] scrollbar-none">
        {TABS.map((tab) => (
          <button
            data-testid={`tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 border-b-2 px-5 py-3.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? '-mb-px border-brand text-brand'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-6">
        <div data-testid={`tab-content-${activeTab}`}>
          {activeTab === 'features' && <FeaturesTab description={description} />}
          {activeTab === 'specs' && <SpecsTab facetValues={facetValues} variants={variants} />}
          {activeTab === 'reviews' && <ReviewsTab productId={productId} />}
        </div>
      </div>
    </div>
  );
}
