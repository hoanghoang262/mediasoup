import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'danger'
  | 'outline'
  | 'ghost';

export type ButtonSize = 
  | 'sm'
  | 'md'
  | 'lg'
  | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button variant that controls the visual style
   */
  variant?: ButtonVariant;
  
  /**
   * Button size
   */
  size?: ButtonSize;
  
  /**
   * Whether the button is currently loading
   */
  isLoading?: boolean;
  
  /**
   * Icon to display before the button text
   */
  leftIcon?: React.ReactNode;
  
  /**
   * Icon to display after the button text
   */
  rightIcon?: React.ReactNode;
}

/**
 * Button component for user interactions
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled,
    children,
    leftIcon,
    rightIcon,
    ...props 
  }, ref) => {
    // Base styles that apply to all buttons
    const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none";
    
    // Variant-specific styles
    const variantStyles = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 active:bg-secondary/80",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
      outline: "border border-border bg-background hover:bg-accent/10 hover:text-accent-foreground",
      ghost: "hover:bg-accent/10 hover:text-accent-foreground",
    };
    
    // Size-specific styles
    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-md",
      md: "h-10 px-4 py-2 text-sm rounded-md",
      lg: "h-12 px-6 text-base rounded-lg",
      icon: "h-10 w-10 rounded-full p-0",
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          isLoading && "opacity-70 cursor-progress",
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button'; 