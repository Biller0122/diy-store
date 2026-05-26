'use client';

import Image from 'next/image';
import { useState } from 'react';

// Category → fallback emoji mapping
const CATEGORY_ICONS: Record<string, string> = {
  bagaj:       '🔧',
  barilga:     '🧱',
  santekhnik:  '🚿',
  tsakhilgaan: '⚡',
  budag:       '🎨',
  gerel:       '💡',
  khaalga:     '🚪',
  shal:        '🏠',
};

interface LazyImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  category?: string;
  priority?: boolean;
}

export function LazyImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  className,
  category,
  priority = false,
}: LazyImageProps) {
  const [error, setError] = useState(false);
  const fallbackIcon = (category && CATEGORY_ICONS[category]) ?? '📦';

  if (error || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center text-4xl bg-surface">
        {fallbackIcon}
      </div>
    );
  }

  const imageProps = fill
    ? { fill: true as const, sizes: sizes ?? '(max-width: 768px) 100vw, 50vw' }
    : { width: width ?? 400, height: height ?? 400 };

  return (
    <Image
      src={src}
      alt={alt}
      {...imageProps}
      className={className}
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTExMTE4Ii8+PC9zdmc+"
      onError={() => setError(true)}
      priority={priority}
    />
  );
}
