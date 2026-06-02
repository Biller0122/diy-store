'use client';

import Image from 'next/image';
import { useState, useRef } from 'react';

interface Asset {
  id: string;
  preview: string;
}

export default function ImageGallery({
  assets,
  productName,
}: {
  assets: Asset[];
  productName: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const main = assets[activeIdx] ?? assets[0];
  const mainSrc = main?.preview.startsWith('data:') ? main.preview : main ? `${main.preview}?preset=large` : '';

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        className="relative aspect-square overflow-hidden rounded-2xl bg-surface cursor-zoom-in"
      >
        {main && mainSrc.startsWith('data:') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainSrc}
            alt={productName}
            className="h-full w-full object-cover transition-transform duration-150"
            style={{
              transform: zoomed ? 'scale(2.2)' : 'scale(1)',
              transformOrigin: `${origin.x}% ${origin.y}%`,
            }}
          />
        ) : main ? (
          <Image
            src={mainSrc}
            alt={productName}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-150"
            style={{
              transform: zoomed ? 'scale(2.2)' : 'scale(1)',
              transformOrigin: `${origin.x}% ${origin.y}%`,
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl text-foreground-muted/30">
            📦
          </div>
        )}

        {/* Zoom hint */}
        {!zoomed && main && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
            🔍 Томруулах
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {assets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {assets.map((asset, i) => (
            <button
              key={asset.id}
              onClick={() => setActiveIdx(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                i === activeIdx
                  ? 'border-brand shadow-md'
                  : 'border-transparent hover:border-[var(--glass-border-hover)]'
              }`}
            >
              {asset.preview.startsWith('data:') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.preview} alt={`${productName} - зураг ${i + 1}`} className="h-full w-full object-cover" />
              ) : (
                <Image
                  src={`${asset.preview}?preset=thumb`}
                  alt={`${productName} - зураг ${i + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
