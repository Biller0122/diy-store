import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40 disabled:cursor-not-allowed select-none',
  {
    variants: {
      variant: {
        default:
          'bg-brand text-white hover:bg-brand-hover active:scale-95 shadow-lg shadow-brand/20',
        ghost:
          'glass glass-hover text-foreground hover:text-white active:scale-95',
        outline:
          'border border-[var(--glass-border)] text-foreground hover:border-[var(--glass-border-hover)] hover:bg-white/5 active:scale-95',
        amber:
          'bg-amber text-dark hover:bg-amber/90 active:scale-95 shadow-lg shadow-amber/20',
        destructive:
          'bg-error/10 border border-error/30 text-error hover:bg-error/20 active:scale-95',
        link:
          'text-brand hover:text-brand-light underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm:   'h-8 px-3 text-xs rounded-lg',
        md:   'h-10 px-4 text-sm rounded-xl',
        lg:   'h-12 px-6 text-base rounded-xl',
        xl:   'h-14 px-8 text-base rounded-2xl',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
