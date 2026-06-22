export function isRenderableImageSrc(src?: string | null) {
  if (!src) return false;
  const trimmed = src.trim();
  return /^(https?:\/\/|\/|data:image\/)/i.test(trimmed);
}

export function withImagePreset(src: string, preset: string) {
  if (src.startsWith('data:')) return src;
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}preset=${encodeURIComponent(preset)}`;
}
