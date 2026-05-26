'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/lib/ui-store';

type DeliveryStatus = 'SEARCHING' | 'OFFERED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface NotificationState {
  lastStatus: DeliveryStatus | null;
}

const STATUS_MESSAGES: Record<DeliveryStatus, { title: string; body: string; type: 'info' | 'success' | 'warning' | 'error' }> = {
  SEARCHING:   { title: 'Жолооч хайж байна',    body: 'Танд хамгийн ойрын жолоочийг хайж байна...', type: 'info' },
  OFFERED:     { title: 'Жолооч олдлоо!',        body: 'Жолооч таны захиалгыг хүлээж авах уу?',     type: 'info' },
  ACCEPTED:    { title: 'Жолооч хүлээж авлаа ✓', body: 'Жолооч таны барааг авахаар явж байна.',      type: 'success' },
  IN_PROGRESS: { title: 'Хүргэлт эхэллээ 🚚',   body: 'Таны бараа хүргэгдэж байна. Бэлэн байна уу?', type: 'info' },
  COMPLETED:   { title: 'Хүргэлт дууслаа ✓',    body: 'Таны захиалга амжилттай хүргэгдлээ!',        type: 'success' },
  CANCELLED:   { title: 'Цуцлагдлаа',            body: 'Захиалга цуцлагдсан байна.',                   type: 'error' },
};

export function useOrderNotifications(orderId: string | null, enabled = true) {
  const { addToast } = useUIStore();
  const state = useRef<NotificationState>({ lastStatus: null });
  const pushGranted = useRef(false);

  // Request push permission once
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission().then((perm) => {
        pushGranted.current = perm === 'granted';
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      pushGranted.current = true;
    }
  }, [enabled]);

  const notify = useCallback((status: DeliveryStatus) => {
    const msg = STATUS_MESSAGES[status];
    if (!msg) return;

    addToast({ type: msg.type, title: msg.title, message: msg.body });

    if (pushGranted.current && 'Notification' in window && document.visibilityState === 'hidden') {
      try {
        new Notification(msg.title, { body: msg.body, icon: '/icon-192.png' });
      } catch {
        // Push notification not supported in this context
      }
    }
  }, [addToast]);

  const handleStatusChange = useCallback((status: DeliveryStatus) => {
    if (status === state.current.lastStatus) return;
    state.current.lastStatus = status;
    notify(status);
  }, [notify]);

  return { handleStatusChange };
}
