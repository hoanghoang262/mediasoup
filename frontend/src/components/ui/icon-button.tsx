import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { Button, buttonVariants } from "./button"
import { cn } from "@/lib/utils"

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    VariantProps<typeof buttonVariants> {
  /**
   * The icon to display
   */
  icon: React.ReactNode
  
  /**
   * Accessibility label (required for icon-only buttons)
   */
  ariaLabel: string
  
  /**
   * Whether the button is loading
   */
  loading?: boolean
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 
    icon, 
    ariaLabel, 
    className, 
    variant = "default", 
    size = "icon",
    loading = false,
    ...props 
  }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("shrink-0", className)}
        aria-label={ariaLabel}
        loading={loading}
        {...props}
      >
        {!loading && icon}
      </Button>
    )
  }
)
IconButton.displayName = "IconButton"

export { IconButton } 