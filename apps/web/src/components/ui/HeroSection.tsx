'use client';

import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Zap, Shield, Star } from 'lucide-react';
import { Button } from './Button';

const TYPEWRITER_TEXTS = [
  'Хамгийн шилдэг багажийг олоорой.',
  'Мэргэжлийн чанарын бараа нийлүүлэгч.',
  'Барилгын материалын ухаалаг шийдэл.',
  'Барилга. Засвар. Бүтээл.',
];

const FLOATING_CARDS = [
  { emoji: '🔧', label: 'Багаж', price: '₮24,900', x: -80, y: -40, delay: 0 },
  { emoji: '💡', label: 'LED чийдэн', price: '₮12,900', x: 80, y: 20, delay: 0.8 },
  { emoji: '🎨', label: 'Акриль будаг', price: '₮59,900', x: -60, y: 80, delay: 1.6 },
];

export function HeroSection() {
  const [textIdx, setTextIdx] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const target = TYPEWRITER_TEXTS[textIdx];
    if (typing) {
      if (displayText.length < target.length) {
        const t = setTimeout(() => setDisplayText(target.slice(0, displayText.length + 1)), 45);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTyping(false), 2500);
        return () => clearTimeout(t);
      }
    } else {
      if (displayText.length > 0) {
        const t = setTimeout(() => setDisplayText(displayText.slice(0, -1)), 25);
        return () => clearTimeout(t);
      } else {
        setTextIdx((i) => (i + 1) % TYPEWRITER_TEXTS.length);
        setTyping(true);
      }
    }
  }, [displayText, typing, textIdx]);

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden gradient-mesh">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <m.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,69,0,0.15), transparent 70%)' }}
        />
        <m.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-1/4 -right-20 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.1), transparent 70%)' }}
        />
        <m.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)' }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Content */}
        <div>
          {/* Badge */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-semibold text-brand border border-brand/20 mb-6"
          >
            <span className="dot-brand animate-pulse-glow" />
            Шинэ бараа ирлээ — 2025 оны хамгийн шилдэг багаж
          </m.div>

          {/* Heading */}
          <m.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-black text-5xl sm:text-6xl lg:text-7xl text-foreground leading-none tracking-tight mb-6"
          >
            Барилга.{' '}
            <span className="gradient-text">Засвар.</span>{' '}
            Бүтээл.
          </m.h1>

          {/* Typewriter */}
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg text-foreground-muted mb-8 min-h-[2rem] font-body"
          >
            {displayText}
            <span className="inline-block w-0.5 h-5 bg-brand ml-0.5 animate-pulse align-middle" />
          </m.p>

          {/* CTAs */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-3 mb-12"
          >
            <Button size="xl" variant="default" asChild>
              <Link href="/category" className="group">
                Дэлгүүр үзэх
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="/trade">
                Trade данс нээх
              </Link>
            </Button>
          </m.div>

          {/* Trust badges */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            {[
              { icon: Zap, text: '2 цагт хүргэлт' },
              { icon: Shield, text: '14 хоног баталгаа' },
              { icon: Star, text: '10,000+ бараа' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-sm text-foreground-muted">
                <Icon size={14} className="text-brand" />
                <span>{text}</span>
              </div>
            ))}
          </m.div>
        </div>

        {/* Right: Floating cards */}
        <div className="hidden lg:flex items-center justify-center relative h-[480px]">
          {/* Central glow */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{ background: 'radial-gradient(circle at center, rgba(255,69,0,0.08), transparent 70%)' }}
          />

          {/* Main product showcase */}
          <m.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="glass-strong rounded-3xl p-8 text-center border border-brand/20 glow-brand"
            style={{ width: 260 }}
          >
            <div className="text-8xl mb-4">🔨</div>
            <p className="font-bold text-foreground text-lg">Makita DTD153</p>
            <p className="text-foreground-muted text-sm mb-4">18V Цохих өрөм</p>
            <div className="text-2xl font-black font-mono text-brand">₮289,900</div>
            <div className="mt-4 w-full py-2 rounded-xl bg-brand text-white text-sm font-semibold">
              Сагсанд нэмэх
            </div>
          </m.div>

          {/* Floating mini cards */}
          {FLOATING_CARDS.map((card, i) => (
            <m.div
              key={i}
              animate={{ y: [0, card.y > 0 ? -6 : 6, 0] }}
              transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut', delay: card.delay }}
              className="absolute glass rounded-xl p-3 flex items-center gap-2 border border-[var(--glass-border)] shadow-xl"
              style={{ left: `calc(50% + ${card.x}px)`, top: `calc(50% + ${card.y - 80}px)` }}
            >
              <span className="text-2xl">{card.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-foreground">{card.label}</p>
                <p className="text-xs font-mono text-brand">{card.price}</p>
              </div>
            </m.div>
          ))}

          {/* Rating badge */}
          <m.div
            animate={{ y: [6, -6, 6] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute bottom-12 right-0 glass rounded-xl px-3 py-2 border border-amber/20"
          >
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-amber fill-amber" />
              <span className="text-sm font-bold text-foreground">4.9</span>
              <span className="text-xs text-foreground-muted">(2,847 үнэлгээ)</span>
            </div>
          </m.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <m.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-foreground-muted">Доош гүйлгэх</span>
        <div className="w-5 h-8 rounded-full border border-[var(--glass-border)] flex items-start justify-center p-1">
          <m.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1 h-2 rounded-full bg-brand"
          />
        </div>
      </m.div>
    </section>
  );
}
