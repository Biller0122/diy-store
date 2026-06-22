'use client';

import { useEffect, useState } from 'react';
import { X, Truck } from 'lucide-react';
import { useUIStore } from '@/lib/ui-store';
import Link from 'next/link';
import { vendureShopFetch } from '@/lib/vendure';

type Announcement = {
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
};

const DEFAULT_ANNOUNCEMENT: Announcement = {
  title: 'Үнэгүй хүргэлт',
  message: '₮100,000-с дээш захиалгад УБ дотор үнэгүй хүргэнэ!',
  ctaLabel: 'Дэлгэрэнгүй →',
  ctaHref: '/trade',
};

const ANNOUNCEMENT_QUERY = `
  query SiteAnnouncement {
    siteAnnouncement {
      title
      message
      ctaLabel
      ctaHref
    }
  }
`;

export function AnnouncementBar() {
  const { announcementDismissed, dismissAnnouncement } = useUIStore();
  const [announcement, setAnnouncement] = useState<Announcement>(DEFAULT_ANNOUNCEMENT);

  useEffect(() => {
    let mounted = true;
    vendureShopFetch<{ siteAnnouncement: Announcement | null }>(ANNOUNCEMENT_QUERY, undefined, { revalidate: 0 })
      .then((data) => {
        if (mounted && data.siteAnnouncement) setAnnouncement(data.siteAnnouncement);
      })
      .catch(() => {
        // Keep the default copy if CMS is temporarily unavailable.
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (announcementDismissed) return null;

  return (
    <div data-announcement-bar data-testid="announcement-bar" className="relative bg-brand text-white text-xs sm:text-sm py-2 px-4 text-center font-medium z-50">
      <div className="flex items-center justify-center gap-2 max-w-5xl mx-auto">
        <Truck size={14} className="shrink-0" />
        <span>
          <strong>{announcement.title}</strong> — {announcement.message}
          <Link href={announcement.ctaHref || '/trade'} className="ml-3 underline underline-offset-2 opacity-80 hover:opacity-100">
            {announcement.ctaLabel}
          </Link>
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
