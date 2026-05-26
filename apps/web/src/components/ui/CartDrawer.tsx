'use client';

import { m, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, CreditCard, QrCode } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore, calcSubtotal, calcDeliveryFee, calcDiscount } from '@/lib/cart-store';
import { useUIStore } from '@/lib/ui-store';
import { fmt } from '@/lib/utils';
import { Button } from './Button';

export function CartDrawer() {
  const { cartOpen, closeCart } = useUIStore();
  const { items, promo, updateQty, removeItem } = useCartStore();

  const subtotal = calcSubtotal(items);
  const delivery = calcDeliveryFee(items);
  const discount = calcDiscount(subtotal, promo);
  const total = subtotal + delivery - discount;

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <m.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[90] w-full max-w-md flex flex-col bg-surface border-l border-[var(--glass-border)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-brand" />
                <h2 className="font-bold text-lg text-foreground">Сагс</h2>
                {items.length > 0 && (
                  <span className="bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {items.reduce((a, i) => a + i.qty, 0)}
                  </span>
                )}
              </div>
              <button onClick={closeCart} className="text-foreground-muted hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                  <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center text-4xl">🛒</div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">Сагс хоосон байна</p>
                    <p className="text-sm text-foreground-muted mt-1">Бараа нэмж эхэлнэ үү</p>
                  </div>
                  <Button variant="default" size="md" onClick={closeCart} asChild>
                    <Link href="/">Дэлгүүр үзэх</Link>
                  </Button>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <m.div
                      key={item.variantId}
                      layout
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 40, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex gap-3 p-3 rounded-xl bg-card border border-[var(--glass-border)]"
                    >
                      {/* Image */}
                      <div className="w-16 h-16 rounded-lg bg-dark overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={closeCart}
                          className="text-sm font-medium text-foreground hover:text-brand transition-colors line-clamp-2 leading-snug"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-foreground-muted mt-0.5">
                          {item.mode === 'pickup' ? '🏪 Салбараас' : '🚚 Хүргэлт'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => item.qty > 1 ? updateQty(item.variantId, item.qty - 1) : removeItem(item.variantId)}
                              className="w-6 h-6 rounded-lg glass flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-sm font-mono w-6 text-center">{item.qty}</span>
                            <button
                              onClick={() => updateQty(item.variantId, item.qty + 1)}
                              className="w-6 h-6 rounded-lg glass flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                          <span className="text-sm font-bold font-mono text-brand">
                            {fmt(item.price * item.qty)}
                          </span>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="text-foreground-muted hover:text-error transition-colors self-start mt-0.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </m.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-[var(--glass-border)] p-4 space-y-3">
                {/* Summary */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-foreground-muted">
                    <span>Дүн</span>
                    <span className="font-mono">{fmt(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Хөнгөлөлт</span>
                      <span className="font-mono">-{fmt(discount)}</span>
                    </div>
                  )}
                  {delivery > 0 && (
                    <div className="flex justify-between text-foreground-muted">
                      <span>Хүргэлт</span>
                      <span className="font-mono">{fmt(delivery)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-[var(--glass-border)]">
                    <span>Нийт</span>
                    <span className="font-mono text-brand">{fmt(total)}</span>
                  </div>
                </div>

                {/* Checkout buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" size="md" asChild>
                    <Link href="/cart" onClick={closeCart}>
                      Сагс харах
                    </Link>
                  </Button>
                  <Button variant="default" size="md" asChild>
                    <Link href="/checkout" onClick={closeCart}>
                      Захиалах
                    </Link>
                  </Button>
                </div>

                {/* Quick pay */}
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-colors text-xs font-semibold text-foreground">
                    <QrCode size={14} className="text-brand" /> QPay
                  </button>
                  <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-colors text-xs font-semibold text-foreground">
                    <CreditCard size={14} className="text-amber" /> MonPay
                  </button>
                </div>
              </div>
            )}
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
