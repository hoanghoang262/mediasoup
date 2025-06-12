import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to add a hover effect
   */
  hoverable?: boolean;
  
  /**
   * Whether to add a border
   */
  bordered?: boolean;
  
  /**
   * Whether to add a shadow
   */
  shadowed?: boolean;
  
  /**
   * Whether to use glass effect
   */
  glass?: boolean;
}

/**
 * Card component for content containers
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    hoverable = false,
    bordered = true,
    shadowed = true,
    glass = false,
    children,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg p-4 bg-background",
          bordered && "border border-border",
          shadowed && "shadow-sm",
          hoverable && "transition-all duration-200 hover:shadow-md",
          glass && "bg-background/70 backdrop-blur-sm",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader component for card headers
 */
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("mb-4 pb-3 border-b border-border", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle component for card titles
 */
export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn("text-lg font-semibold", className)}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

/**
 * CardBody component for card content
 */
export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

/**
 * CardFooter component for card footers
 */
export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("mt-4 pt-3 border-t border-border", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter'; 