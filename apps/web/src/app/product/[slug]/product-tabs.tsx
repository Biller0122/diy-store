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
  { id: 'docs', label: 'Баримт бичиг' },
  { id: 'warranty', label: 'Баталгаа' },
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

function DocsTab() {
  return (
    <div className="flex flex-col items-center py-12 text-foreground-muted">
      <span className="text-4xl">📄</span>
      <p className="mt-3 text-sm">Баримт бичиг байхгүй байна.</p>
      <p className="text-xs">Худалдагчтай холбогдон тодруулна уу.</p>
    </div>
  );
}

function WarrantyTab() {
  const items = [
    { icon: '🛡️', title: '12 сарын үйлдвэрийн баталгаа', desc: 'Үйлдвэрийн доголдолд 12 сарын хугацаанд үнэгүй засвар хийнэ.' },
    { icon: '🔧', title: 'Засварын үйлчилгээ', desc: 'Улаанбаатар хотод үнэгүй засварын үйлчилгээ үзүүлнэ.' },
    { icon: '↩️', title: '14 хоногийн буцаалт', desc: 'Гэмтэлгүй, анхны савлагаатай бол 14 хоногт буцааж болно.' },
    { icon: '📞', title: 'Техникийн дэмжлэг', desc: '7 хоногийн 7 хоног, өдрийн 9:00–21:00 цагт утсаар зөвлөгөө авна.' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="flex gap-3 rounded-xl bg-dark p-4">
          <span className="text-2xl">{item.icon}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-0.5 text-xs text-foreground-muted">{item.desc}</p>
          </div>
        </div>
      ))}
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
          {activeTab === 'docs' && <DocsTab />}
          {activeTab === 'warranty' && <WarrantyTab />}
          {activeTab === 'reviews' && <ReviewsTab productId={productId} />}
        </div>
      </div>
    </div>
  );
}
