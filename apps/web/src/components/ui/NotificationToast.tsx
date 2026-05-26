'use client';

import { m, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useUIStore, type ToastType } from '@/lib/ui-store';

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-success" />,
  error:   <XCircle size={18} className="text-error" />,
  info:    <Info size={18} className="text-info" />,
  warning: <AlertTriangle size={18} className="text-amber" />,
};

const BORDERS: Record<ToastType, string> = {
  success: 'border-success/30',
  error:   'border-error/30',
  info:    'border-info/30',
  warning: 'border-amber/30',
};

export function NotificationToast() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-24 left-4 z-[100] flex flex-col gap-2 md:bottom-6">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <m.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: -60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`glass glass-strong rounded-xl p-4 flex items-start gap-3 min-w-[280px] max-w-[360px] border ${BORDERS[toast.type]} shadow-xl`}
          >
            <div className="mt-0.5 shrink-0">{ICONS[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-foreground-muted mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-foreground-muted hover:text-foreground transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
