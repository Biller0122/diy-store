'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Phone } from 'lucide-react';
import { useSupplierStore } from '@/lib/supplier-store';
import { vendureShopFetch } from '@/lib/vendure';

type PendingInfo = {
  supplierId?: string;
  businessName?: string;
  registrationNumber?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  district?: string;
  address?: string;
};

export default function SupplierPendingPage() {
  const router = useRouter();
  const { supplier, setSupplier } = useSupplierStore();
  const [info, setInfo] = useState<PendingInfo>({});

  async function refreshStatus() {
    if (!supplier) {
      window.location.reload();
      return;
    }
    const data = await vendureShopFetch<{ supplier: typeof supplier | null }>(`
      query Supplier($id: ID!) {
        supplier(id: $id) {
          id businessName slug logo ownerName phone email district
          status commissionRate rating reviewCount productCount
        }
      }
    `, { id: supplier.id });
    if (!data.supplier) return;
    setSupplier(data.supplier);
    if (data.supplier.status === 'ACTIVE') router.replace('/supplier/dashboard');
    if (data.supplier.status === 'SUSPENDED' || data.supplier.status === 'REJECTED') router.replace('/supplier/login');
  }

  useEffect(() => {
    const load = () => {
      if (supplier) {
        setInfo({
          supplierId: supplier.id,
          businessName: supplier.businessName,
          ownerName: supplier.ownerName,
          phone: supplier.phone,
          email: supplier.email,
          district: supplier.district,
        });
        return;
      }
      try {
        setInfo(JSON.parse(localStorage.getItem('diy-supplier-pending') || '{}'));
      } catch {
        setInfo({});
      }
    };
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [supplier]);

  return (
    <div className="min-h-screen bg-dark px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-[var(--glass-border)] bg-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber/15 text-amber">
            <Clock size={32} />
          </div>
          <h1 className="text-2xl font-black text-foreground">Таны бүртгэл хянагдаж байна</h1>
          <p className="mt-3 text-sm leading-7 text-foreground-muted">
            Манай баг 24-48 цагийн дотор бүртгэлийг шалгаж, утсаар холбогдох болно.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--glass-border)] bg-card p-5">
          <h2 className="mb-4 text-sm font-bold text-foreground">Илгээсэн мэдээлэл</h2>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            {[
              ['Бүртгэлийн дугаар', info.supplierId],
              ['Байгууллага', info.businessName],
              ['Регистр', info.registrationNumber],
              ['Эзэмшигч', info.ownerName],
              ['Утас', info.phone],
              ['И-мэйл', info.email],
              ['Дүүрэг', info.district],
              ['Хаяг', info.address],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-surface px-3 py-2">
                <p className="text-[10px] text-foreground-muted">{label}</p>
                <p className="text-foreground">{value || '-'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--glass-border)] bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Phone size={16} className="text-brand" /> Холбоо барих
          </p>
          <p className="mt-2 text-sm text-foreground-muted">Тусламж: 7700-XXXX · supplier@shoptool.mn</p>
          <Link href="/" className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white">
            Нүүр хуудас руу буцах
          </Link>
          <button
            onClick={() => void refreshStatus()}
            className="ml-3 mt-4 inline-flex rounded-xl border border-[var(--glass-border)] px-4 py-2.5 text-sm font-bold text-foreground-muted hover:text-foreground"
          >
            Статус шинэчлэх
          </button>
        </div>
      </div>
    </div>
  );
}
