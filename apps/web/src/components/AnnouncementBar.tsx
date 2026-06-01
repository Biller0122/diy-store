'use client';

import { X, Truck } from 'lucide-react';
import { useUIStore } from '@/lib/ui-store';

export function AnnouncementBar() {
  const { announcementDismissed, dismissAnnouncement } = useUIStore();
  if (announcementDismissed) return null;

  return (
    <div data-testid="announcement-bar" className="relative bg-brand text-white text-xs sm:text-sm py-2 px-4 text-center font-medium z-50">
      <div className="flex items-center justify-center gap-2 max-w-5xl mx-auto">
        <Truck size={14} className="shrink-0" />
        <span>
          <strong>Үнэгүй хүргэлт</strong> — ₮100,000-с дээш захиалгад УБ дотор үнэгүй хүргэнэ!
          <span className="ml-3 underline underline-offset-2 cursor-pointer opacity-80 hover:opacity-100">
            Дэлгэрэнгүй →
          </span>
        </span>
      </div>
      <button
        data-testid="announcement-close"
        onClick={dismissAnnouncement}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Хаах"
      >
        <X size={14} />
      </button>
    </div>
  );
}
