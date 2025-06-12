import { forwardRef } from 'react';
import { Button, type ButtonProps } from './Button';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon'> {
  /**
   * The icon to display
   */
  icon: React.ReactNode;
  
  /**
   * Whether the icon should be larger
   */
  large?: boolean;
  
  /**
   * Text for accessibility
   */
  ariaLabel: string;
}

/**
 * IconButton component for icon-only buttons
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 
    className, 
    icon,
    large = false,
    size = 'icon',
    ariaLabel,
    ...props 
  }, ref) => {
    return (
      <Button
        ref={ref}
        size={size}
        className={cn(
          "flex items-center justify-center",
          large && "text-lg",
          className
        )}
        aria-label={ariaLabel}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton'; 