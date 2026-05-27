'use client';

import { useState } from 'react';
import { useCustomerAddressStore, type CustomerAddress } from '@/lib/customer-address-store';

const UB_DISTRICTS = [
  'Баянгол', 'Баянзүрх', 'Чингэлтэй', 'Хан-Уул',
  'Сүхбаатар', 'Налайх', 'Багануур', 'Багахангай', 'Сонгинохайрхан',
];

const EMPTY_FORM: Omit<CustomerAddress, 'id' | 'isDefault'> = {
  label: '',
  fullName: '',
  phone: '',
  district: '',
  street: '',
  building: '',
  apartment: '',
};

export default function AddressesPage() {
  const { addresses, addAddress, updateAddress, deleteAddress, setDefault } = useCustomerAddressStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.fullName.trim()) e.fullName = 'Нэр оруулна уу';
    if (!form.phone.trim()) e.phone = 'Утас оруулна уу';
    if (!form.district) e.district = 'Дүүрэг сонгоно уу';
    if (!form.street.trim()) e.street = 'Гудамж оруулна уу';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (addr: CustomerAddress) => {
    setEditId(addr.id);
    setForm({
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      district: addr.district,
      street: addr.street,
      building: addr.building,
      apartment: addr.apartment,
    });
    setErrors({});
    setShowForm(true);
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editId) {
      updateAddress(editId, form);
    } else {
      addAddress(form);
    }
    setShowForm(false);
  };

  const field = (key: keyof typeof form, label: string, required = false) => (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand ${errors[key] ? 'border-red-400' : 'border-[var(--glass-border)]'}`}
      />
      {errors[key] && <p className="text-xs text-error mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Хаягууд</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors"
        >
          + Хаяг нэмэх
        </button>
      </div>

      {addresses.length === 0 && !showForm && (
        <div className="bg-card rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📍</p>
          <p className="text-foreground-muted font-medium">Хадгалсан хаяг байхгүй</p>
          <button
            onClick={openAdd}
            className="mt-4 px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold"
          >
            Хаяг нэмэх
          </button>
        </div>
      )}

      {/* Address cards */}
      <div className="grid gap-4">
        {addresses.map((addr) => (
          <div key={addr.id} className="bg-card rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-sm">
                      {addr.label || 'Хаяг'}
                    </p>
                    {addr.isDefault && (
                      <span className="text-xs bg-brand/10 text-brand-light px-2 py-0.5 rounded-full">
                        Үндсэн
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-1">{addr.fullName}</p>
                  <p className="text-xs text-foreground-muted">{addr.phone}</p>
                  <p className="text-xs text-foreground-muted mt-1">
                    {addr.district} дүүрэг, {addr.street}
                    {addr.building && `, ${addr.building}-р байр`}
                    {addr.apartment && `, ${addr.apartment}-р тоот`}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1 items-end shrink-0">
                <button
                  onClick={() => openEdit(addr)}
                  className="text-xs text-info hover:underline"
                >
                  Засах
                </button>
                <button
                  onClick={() => deleteAddress(addr.id)}
                  className="text-xs text-error hover:underline"
                >
                  Устгах
                </button>
                {!addr.isDefault && (
                  <button
                    onClick={() => setDefault(addr.id)}
                    className="text-xs text-foreground-muted hover:underline"
                  >
                    Үндсэн болгох
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground">
                {editId ? 'Хаяг засах' : 'Шинэ хаяг нэмэх'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-foreground-muted text-xl">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {field('label', 'Хаягийн нэр (жишээ: Гэр, Ажил)')}
              {field('fullName', 'Хүлээн авагчийн нэр', true)}
              {field('phone', 'Утасны дугаар', true)}

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Дүүрэг <span className="text-error">*</span>
                </label>
                <select
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand ${errors.district ? 'border-red-400' : 'border-[var(--glass-border)]'}`}
                >
                  <option value="">Дүүрэг сонгох</option>
                  {UB_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {errors.district && <p className="text-xs text-error mt-1">{errors.district}</p>}
              </div>

              {field('street', 'Гудамж / Хороо', true)}
              {field('building', 'Байрны дугаар')}
              {field('apartment', 'Тооцын дугаар')}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 border border-[var(--glass-border)] rounded-xl text-sm font-medium"
              >
                Болих
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors"
              >
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
