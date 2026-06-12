export function formatPrice(value: number | null | undefined) {
  return String(Math.round((value ?? 0) / 100));
}

export function parsePrice(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Math.round(Number(digits) * 100);
}
