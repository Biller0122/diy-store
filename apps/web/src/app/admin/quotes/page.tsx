'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Building2, Mail, Phone, Send } from 'lucide-react';
import { MOCK_QUOTES, type AdminQuote } from '@/lib/admin-data';

const STATUS: Record<AdminQuote['status'], { label: string; cls: string }> = {
  NEW: { label: 'Шинэ', cls: 'bg-blue-500/15 text-blue-400' },
  PROCESSING: { label: 'Боловсруулж буй', cls: 'bg-amber-500/15 text-amber-400' },
  RESPONDED: { label: 'Хариу өгсөн', cls: 'bg-purple-500/15 text-purple-400' },
  DONE: { label: 'Дууссан', cls: 'bg-emerald-500/15 text-emerald-400' },
};

export default function AdminQuotesPage() {
  const [activeId, setActiveId] = useState(MOCK_QUOTES[0]?.id ?? '');
  const [response, setResponse] = useState('');
  const active = useMemo(() => MOCK_QUOTES.find((quote) => quote.id === activeId) ?? MOCK_QUOTES[0], [activeId]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <section className="rounded-2xl border border-[var(--glass-border)] bg-card">
        <div className="border-b border-[var(--glass-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Trade саналын хүсэлт</h2>
          <p className="text-xs text-foreground-muted">Байгууллагын үнийн санал, бөөн худалдан авалт</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--glass-border)] text-left text-xs text-foreground-muted">
                <th className="px-4 py-3">Компани</th>
                <th className="px-4 py-3">Регистр</th>
                <th className="px-4 py-3">Холбоо барих</th>
                <th className="px-4 py-3">Утас</th>
                <th className="px-4 py-3">Огноо</th>
                <th className="px-4 py-3">Төлөв</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {MOCK_QUOTES.map((quote) => (
                <tr key={quote.id} onClick={() => setActiveId(quote.id)} className={`cursor-pointer border-b border-[var(--glass-border)] last:border-0 hover:bg-white/[0.03] ${activeId === quote.id ? 'bg-brand/5' : ''}`}>
                  <td className="px-4 py-3 text-xs font-semibold text-foreground">{quote.companyName}</td>
                  <td className="px-4 py-3 text-xs text-foreground-muted">{quote.registerNo}</td>
                  <td className="px-4 py-3 text-xs text-foreground-muted">{quote.contactName}</td>
                  <td className="px-4 py-3 text-xs text-foreground-muted">{quote.phone}</td>
                  <td className="px-4 py-3 text-xs text-foreground-muted">{new Date(quote.createdAt).toLocaleDateString('mn-MN')}</td>
                  <td className="px-4 py-3"><span className={`rounded-lg px-2 py-0.5 text-[10px] ${STATUS[quote.status].cls}`}>{STATUS[quote.status].label}</span></td>
                  <td className="px-4 py-3"><ArrowRight size={14} className="text-foreground-muted" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {active && (
        <aside className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground">{active.companyName}</h3>
              <p className="text-xs text-foreground-muted">РД: {active.registerNo}</p>
            </div>
            <span className={`ml-auto rounded-lg px-2 py-0.5 text-[10px] ${STATUS[active.status].cls}`}>{STATUS[active.status].label}</span>
          </div>

          <div className="mb-4 grid gap-2 text-xs text-foreground-muted">
            <p className="flex items-center gap-2"><Phone size={13} /> {active.contactName} · {active.phone}</p>
            <p className="flex items-center gap-2"><Mail size={13} /> {active.email}</p>
          </div>

          <div className="rounded-xl bg-surface p-3">
            <p className="mb-1 text-xs font-semibold text-foreground">Хүсэлтийн тайлбар</p>
            <p className="text-sm leading-6 text-foreground-muted">{active.description}</p>
          </div>

          <label className="mt-4 block space-y-1.5">
            <span className="text-xs text-foreground-muted">Үнийн хариу</span>
            <textarea value={response || active.response || ''} onChange={(e) => setResponse(e.target.value)} rows={8} className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand/50" placeholder="Бараа тус бүрийн үнэ, хүчинтэй хугацаа, хүргэлтийн нөхцөл..." />
          </label>

          <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-hover">
            <Send size={15} /> И-мэйлээр хариу илгээх
          </button>
        </aside>
      )}
    </div>
  );
}
