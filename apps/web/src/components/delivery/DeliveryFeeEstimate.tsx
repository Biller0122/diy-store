'use client';

import { useEffect, useMemo, useState } from 'react';

const DISTRICT_FEES: Record<string, number> = {
  Баянзүрх: 3000,
  Сүхбаатар: 3500,
  'Хан-Уул': 4000,
  Чингэлтэй: 3500,
  Баянгол: 3500,
  Сонгинохайрхан: 4500,
  Налайх: 9000,
};

export function DeliveryFeeEstimate({
  customerDistrict,
  supplierIds,
  totalWeightKg,
}: {
  customerDistrict: string;
  supplierIds: string[];
  totalWeightKg: number;
}) {
  const [loading, setLoading] = useState(true);

  const fee = useMemo(() => {
    const base = DISTRICT_FEES[customerDistrict] ?? 5000;
    const multiStop = Math.max(0, supplierIds.length - 1) * 2000;
    const weight = totalWeightKg > 50 ? 3000 : 0;
    return Math.ceil((base + multiStop + weight) / 500) * 500;
  }, [customerDistrict, supplierIds.length, totalWeightKg]);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 50);
    return () => window.clearTimeout(timer);
  }, [fee]);

  if (loading) {
    return <p className="text-sm text-foreground-muted">Хүргэлтийн төлбөр тооцоолж байна...</p>;
  }

  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-card p-3">
      <p className="text-xs text-foreground-muted">Хүргэлтийн төлбөр</p>
      <p className="text-lg font-black text-brand">₮{fee.toLocaleString()}</p>
    </div>
  );
}
