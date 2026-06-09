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
        src="/shoptool-icon.png"
        alt="shoptool.mn"
        width={44}
        height={44}
        className={cn('rounded-xl object-cover', imageClassName)}
        priority
      />
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={cn('flex min-w-0 items-center gap-3', className)}>
        <Image
          src="/shoptool-icon.png"
          alt="shoptool.mn"
          width={40}
          height={40}
          className={cn('h-10 w-10 shrink-0 rounded-xl object-cover shadow-lg shadow-brand/20', imageClassName)}
          priority
        />
        <div className="min-w-0">
          <Image
            src="/shoptool-logo.png"
            alt="shoptool.mn"
            width={180}
            height={40}
            className="h-auto w-32 object-contain"
            priority
          />
          {portalLabel && <p className="mt-0.5 text-[10px] text-foreground-muted">{portalLabel}</p>}
        </div>
      </div>
    );
  }

  return (
    <Image
      src="/shoptool-logo.png"
      alt="shoptool.mn"
      width={210}
      height={46}
      className={cn('h-auto w-36 object-contain sm:w-44', imageClassName)}
      priority
    />
  );
}
