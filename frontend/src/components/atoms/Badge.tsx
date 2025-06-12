import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 
  | 'primary' 
  | 'secondary' 
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Badge variant that controls the visual style
   */
  variant?: BadgeVariant;
}

/**
 * Badge component for displaying small bits of information
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => {
    const variantStyles = {
      primary: "bg-primary/10 text-primary border-primary/20",
      secondary: "bg-secondary/10 text-secondary border-secondary/20",
      success: "bg-green-100 text-green-800 border-green-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
      danger: "bg-red-100 text-red-800 border-red-200",
      outline: "bg-background text-foreground border-border",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge'; 