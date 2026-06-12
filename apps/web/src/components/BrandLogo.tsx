import Image from 'next/image';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  variant?: 'header' | 'sidebar' | 'mark';
  portalLabel?: string;
};

export function BrandLogo({
  className,
  imageClassName,
  variant = 'header',
  portalLabel,
}: BrandLogoProps) {
  if (variant === 'mark') {
    return (
      <Image
        src="/shoptool-logo.png"
        alt="shoptool.mn"
        width={210}
        height={131}
        className={cn('h-auto w-24 object-contain', imageClassName)}
        priority
      />
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={cn('flex min-w-0 flex-col items-start', className)}>
        <Image
          src="/shoptool-logo.png"
          alt="shoptool.mn"
          width={210}
          height={131}
          className={cn('h-auto w-36 object-contain', imageClassName)}
          priority
        />
        {portalLabel && <p className="mt-0.5 text-[10px] text-foreground-muted">{portalLabel}</p>}
      </div>
    );
  }

  return (
    <Image
      src="/shoptool-logo.png"
      alt="shoptool.mn"
      width={210}
      height={131}
      className={cn('h-9 w-36 object-contain sm:h-10 sm:w-44', imageClassName)}
      priority
    />
  );
}
