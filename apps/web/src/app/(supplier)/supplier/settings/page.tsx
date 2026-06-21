'use client';

import { useState } from 'react';
import { Save, Store, CreditCard, Clock, MapPin } from 'lucide-react';
import { useSupplierStore } from '@/lib/supplier-store';
import { vendureShopFetch } from '@/lib/vendure';

const UPDATE_SUPPLIER = `
  mutation UpdateSupplierSettings($id: ID!, $input: UpdateSupplierInput!) {
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

export default function SupplierSettingsPage() {
  const { supplier, setSupplier } = useSupplierStore();

  const [businessName, setBusinessName] = useState(supplier?.businessName ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const email = supplier?.email ?? '';
  const [description, setDescription] = useState(supplier?.description ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [bankAccount, setBankAccount] = useState(supplier?.bankAccount ?? '');
  const [bankName, setBankName] = useState(supplier?.bankName ?? 'Хаан банк');
  const [weekdaysStart, setWeekdaysStart] = useState(supplier?.workingHours?.weekdays?.start ?? '09:00');
  const [weekdaysEnd, setWeekdaysEnd] = useState(supplier?.workingHours?.weekdays?.end ?? '18:00');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!supplier?.id) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const data = await vendureShopFetch<{ updateSupplier: NonNullable<typeof supplier> }>(UPDATE_SUPPLIER, {
        id: supplier.id,
        input: {
          businessName: businessName.trim(),
          description: description.trim(),
          phone: phone.trim(),
          address: address.trim(),
          bankAccount: bankAccount.trim(),
          bankName,
          workingHours: {
            weekdaysStart,
            weekdaysEnd,
            saturdayStart: supplier.workingHours?.saturday?.start ?? '10:00',
            saturdayEnd: supplier.workingHours?.saturday?.end ?? '17:00',
            sundayClosed: supplier.workingHours?.sunday?.closed ?? true,
          },
        },
      });
      setSupplier(data.updateSupplier);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Тохиргоо хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Тохиргоо</h2>
        <p className="text-sm text-foreground-muted mt-0.5">Дэлгүүрийн мэдээлэл засах</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {error && <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
        {/* Business info */}
        <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store size={16} className="text-brand" />
            <h3 className="text-sm font-semibold text-foreground">Дэлгүүрийн мэдээлэл</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Дэлгүүрийн нэр</label>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Тайлбар</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Дэлгүүрийн тухай товч тайлбар..." className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Утас</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Имэйл</label>
                <input type="email" value={email} readOnly title="Имэйл солихын тулд админтай холбогдоно уу" className="w-full px-3.5 py-2.5 rounded-xl bg-surface/60 border border-[var(--glass-border)] text-sm text-foreground-muted cursor-not-allowed" />
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-brand" />
            <h3 className="text-sm font-semibold text-foreground">Хаяг байршил</h3>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Дэлгэрэнгүй хаяг</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
        </div>

        {/* Working hours */}
        <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-brand" />
            <h3 className="text-sm font-semibold text-foreground">Ажлын цаг</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Нээх цаг</label>
              <input type="time" value={weekdaysStart} onChange={(event) => setWeekdaysStart(event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Хаах цаг</label>
              <input type="time" value={weekdaysEnd} onChange={(event) => setWeekdaysEnd(event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
          </div>
        </div>

        {/* Bank info */}
        <div className="bg-card border border-[var(--glass-border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={16} className="text-brand" />
            <h3 className="text-sm font-semibold text-foreground">Банкны мэдээлэл</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Банкны нэр</label>
              <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand">
                <option>Хаан банк</option>
                <option>Голомт банк</option>
                <option>TDB банк</option>
                <option>Хас банк</option>
                <option>Худалдаа хөгжлийн банк</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Дансны дугаар</label>
              <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="xxxxxxxxxxxxxxxx" className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-[var(--glass-border)] text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
          </div>
          <p className="text-xs text-foreground-muted mt-3">Сар бүрийн 20-нд дансанд шилжүүлнэ. Комисс: {supplier?.commissionRate ?? 10}%</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 ${saved ? 'bg-success text-white' : 'bg-brand text-white hover:bg-brand-hover shadow-lg shadow-brand/30'}`}
        >
          <Save size={16} />
          {saving ? 'Хадгалж байна...' : saved ? 'Хадгалагдлаа!' : 'Хадгалах'}
        </button>
      </form>
    </div>
  );
}
