'use client';

import { m } from 'framer-motion';
import { Truck, BadgePercent, RotateCcw, MapPin } from 'lucide-react';

const ITEMS = [
  {
    icon: Truck,
    title: 'Хурдан хүргэлт',
    desc: 'УБ дотор 2–4 цагт',
    color: 'text-brand',
    bg: 'bg-brand/10',
  },
  {
    icon: BadgePercent,
    title: 'Үнэ тааруулалт',
    desc: 'Хамгийн хямд баталгаа',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: RotateCcw,
    title: '14 хоног буцаалт',
    desc: 'Асуудалгүй буцаалт',
    color: 'text-info',
    bg: 'bg-info/10',
  },
  {
    icon: MapPin,
    title: 'Pickup боломжтой',
    desc: '5 салбараас авах',
    color: 'text-amber',
    bg: 'bg-amber/10',
  },
];

export function TrustStrip() {
  return (
    <section className="py-8 border-y border-[var(--glass-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
          {ITEMS.map(({ icon: Icon, title, desc, color, bg }, i) => (
            <m.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex items-center gap-4 shrink-0 sm:shrink p-4 rounded-2xl bg-card border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all group"
            >
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <m.div
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <Icon size={20} className={color} />
                </m.div>
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground group-hover:text-white transition-colors">
                  {title}
                </p>
                <p className="text-xs text-foreground-muted mt-0.5">{desc}</p>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}
