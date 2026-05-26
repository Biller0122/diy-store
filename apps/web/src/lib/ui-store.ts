'use client';

import { create } from 'zustand';

// ─── Toast ────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// ─── UI State ─────────────────────────────────────────────────

interface UIState {
  cartOpen: boolean;
  searchOpen: boolean;
  announcementDismissed: boolean;
  toasts: Toast[];

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  openSearch: () => void;
  closeSearch: () => void;

  dismissAnnouncement: () => void;

  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  cartOpen: false,
  searchOpen: false,
  announcementDismissed: false,
  toasts: [],

  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen })),

  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),

  dismissAnnouncement: () => set({ announcementDismissed: true }),

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    const duration = toast.duration ?? 3000;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
