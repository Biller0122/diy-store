'use client';

import { useState, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  { name: 'Багаж хэрэгсэл', slug: 'bagaj', icon: '🔧', sub: ['Гар багаж', 'Цахилгаан багаж', 'Хэмжих хэрэгсэл'] },
  { name: 'Барилгын материал', slug: 'barilga', icon: '🧱', sub: ['Цемент', 'Тоосго', 'Ган материал'] },
  { name: 'Сантехник', slug: 'santekhnik', icon: '🚿', sub: ['Хоолой', 'Краан', 'Угаалтуур'] },
  { name: 'Цахилгаан', slug: 'tsakhilgaan', icon: '⚡', sub: ['Кабель', 'Унтраалга', 'Зального самбар'] },
  { name: 'Будаг ба засвар', slug: 'budag', icon: '🎨', sub: ['Дотор будаг', 'Гадна будаг', 'Хаяг'] },
  { name: 'Гэрэлтүүлэг', slug: 'gerel', icon: '💡', sub: ['LED чийдэн', 'Дандар', 'Хяналт'] },
  { name: 'Хаалга, цонх', slug: 'khaalga', icon: '🚪', sub: ['Модон хаалга', 'Металл хаалга', 'Цонхны хүрээ'] },
  { name: 'Шал ба хана', slug: 'shal', icon: '🏠', sub: ['Паркет', 'Плитка', 'Ханын цаас'] },
];

const FEATURED = [
  { name: 'Makita 18V Өрөм', slug: 'makita-drill', price: 289900 },
  { name: 'Dulux Будаг 4L', slug: 'dulux-paint', price: 59900 },
  { name: 'LED 100W Чийдэн', slug: 'led-100w', price: 12900 },
];

export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
          open ? 'text-brand bg-white/5' : 'text-foreground-muted hover:text-foreground hover:bg-white/5'
        }`}
      >
        Ангилал
        <m.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} />
        </m.div>
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed left-1/2 top-[5.75rem] z-50 w-[min(calc(100vw-2rem),720px)] max-h-[calc(100vh-6.5rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/15 bg-card/98 shadow-2xl shadow-black/70 backdrop-blur-2xl"
          >
            <div className="flex max-h-[calc(100vh-9.5rem)] overflow-hidden">
              {/* Left: Category list */}
              <div className="w-52 shrink-0 overflow-y-auto border-r border-white/10 bg-surface/80 py-3 sm:w-56">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    onMouseEnter={() => setActiveCategory(cat)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors sm:gap-3 sm:px-4 ${
                      activeCategory.slug === cat.slug
                        ? 'bg-white/8 text-brand'
                        : 'text-foreground hover:bg-white/5'
                    }`}
                  >
                    <span className="shrink-0 text-lg">{cat.icon}</span>
                    <span className="min-w-0 flex-1 whitespace-normal break-words font-medium leading-snug">{cat.name}</span>
                    <ArrowRight size={12} className="shrink-0 opacity-40" />
                  </button>
                ))}
              </div>

              {/* Right: Sub-categories + featured */}
              <div className="min-w-0 flex-1 overflow-y-auto bg-card/95 p-4 sm:p-5">
                <m.div
                  key={activeCategory.slug}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Link
                    href={`/category/${activeCategory.slug}`}
                    className="mb-4 flex min-w-0 items-center gap-2"
                    onClick={() => setOpen(false)}
                  >
                    <span className="shrink-0 text-2xl">{activeCategory.icon}</span>
                    <span className="min-w-0 break-words font-bold leading-snug text-foreground transition-colors hover:text-brand">
                      {activeCategory.name}
                    </span>
                    <ArrowRight size={14} className="shrink-0 text-brand" />
                  </Link>

                  <div className="mb-5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                    {activeCategory.sub.map((sub) => (
                      <Link
                        key={sub}
                        href={`/category/${activeCategory.slug}`}
                        onClick={() => setOpen(false)}
                        className="rounded-lg px-3 py-2 text-xs leading-snug text-foreground-muted transition-colors hover:bg-white/8 hover:text-foreground"
                      >
                        {sub}
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-[var(--glass-border)] pt-4">
                    <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider mb-3">
                      Онцлох бараа
                    </p>
                    <div className="space-y-2">
                      {FEATURED.map((item) => (
                        <Link
                          key={item.slug}
                          href={`/product/${item.slug}`}
                          onClick={() => setOpen(false)}
                          className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/8"
                        >
                          <span className="min-w-0 break-words text-sm leading-snug text-foreground transition-colors group-hover:text-brand">
                            {item.name}
                          </span>
                          <span className="shrink-0 text-xs font-mono font-bold text-brand">
                            ₮{Math.round(item.price / 100).toLocaleString('mn-MN')}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </m.div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/10 bg-surface/90 px-5 py-3">
              <p className="text-xs text-foreground">Бүх ангилалыг харах</p>
              <Link
                href="/category"
                onClick={() => setOpen(false)}
                className="text-xs text-brand hover:text-brand-light transition-colors flex items-center gap-1"
              >
                Ангилал руу очих <ArrowRight size={11} />
              </Link>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
