'use client';

import Link from 'next/link';
import { m } from 'framer-motion';
import { Clock, CheckCircle2, Phone } from 'lucide-react';
import { useDriverStore } from '@/lib/driver-store';

const STEPS = [
  { label: 'Бүртгэл илгээсэн', done: true },
  { label: 'Баримт шалгагдаж байна', done: true },
  { label: 'Манай баг холбогдоно', done: false },
  { label: 'Сургалтанд хамрагдана', done: false },
  { label: 'Идэвхжүүлэгдэнэ', done: false },
];

export default function DriverPendingPage() {
  const { driver, logout } = useDriverStore();

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark px-4 py-12">
      <div className="w-full max-w-md text-center">
        <m.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/15 border border-amber-500/30"
        >
          <Clock size={36} className="text-amber-400" />
        </m.div>

        <h1 className="text-2xl font-black text-foreground">Бүртгэл хянагдаж байна</h1>
        {driver && (
          <p className="mt-2 text-sm text-foreground-muted">
            Сайн байна уу, <span className="font-semibold text-foreground">{driver.firstName}</span>!
          </p>
        )}
        <p className="mt-3 text-sm text-foreground-muted leading-6">
          Таны бүртгэлийг хянаж байна. Манай баг <strong>24–48 цагийн</strong> дотор
          холбогдож, дараагийн алхмуудыг мэдэгдэх болно.
        </p>

        {/* Progress steps */}
        <div className="mt-8 bg-card border border-[var(--glass-border)] rounded-2xl p-5 text-left space-y-3">
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide mb-4">Үйл явц</p>
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                step.done ? 'bg-success/20 border border-success/40' : 'bg-white/5 border border-white/10'
              }`}>
                {step.done
                  ? <CheckCircle2 size={14} className="text-success" />
                  : <span className="text-[10px] text-foreground-muted">{i + 1}</span>
                }
              </div>
              <span className={`text-sm ${step.done ? 'text-foreground font-medium' : 'text-foreground-muted'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-4 bg-card border border-[var(--glass-border)] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
            <Phone size={18} className="text-success" />
          </div>
          <div className="text-left">
            <p className="text-xs text-foreground-muted">Асуулт байвал холбогдоно уу</p>
            <p className="text-sm font-bold text-foreground">7700-8899</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
          >
            Статус шинэчлэх
          </button>
          <button
            onClick={() => { logout(); window.location.href = '/driver/login'; }}
            className="w-full py-3 rounded-xl border border-[var(--glass-border)] text-foreground-muted text-sm font-semibold hover:text-foreground transition-colors"
          >
            Гарах
          </button>
          <Link href="/" className="text-xs text-foreground-muted hover:text-brand transition-colors">
            Нүүр хуудас руу буцах
          </Link>
        </div>
      </div>
    </div>
  );
}
