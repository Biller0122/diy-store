import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(minor: number) {
  return `₮${Math.round(minor / 100).toLocaleString('mn-MN')}`;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('mn-MN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
}

export function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}
