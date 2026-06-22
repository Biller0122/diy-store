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
  return (
    <div className={cn('flex min-w-0 flex-col items-start leading-none', className)} aria-label="shoptool.mn">
      <div className={cn(
        'inline-flex items-baseline rounded-sm font-display text-xl font-black tracking-tight text-foreground',
        variant === 'mark' && 'text-2xl',
        variant === 'sidebar' && 'text-2xl',
        imageClassName,
      )}>
        <span>SHOP</span>
        <span className="text-brand">TOOL</span>
        <span className="ml-0.5 text-xs font-black text-brand">.MN</span>
      </div>
      {(portalLabel || variant === 'header') && (
        <p className="mt-1 text-[10px] font-semibold text-foreground-muted">
          {portalLabel || 'Барилгын материалын платформ'}
        </p>
      )}
    </div>
  );
}
