import React from "react";
import { cn } from "@/lib/utils";

// Button variants directly defined here
const buttonVariants = {
  default: "bg-blue-600 hover:bg-blue-500 text-white",
  secondary: "bg-gray-600 hover:bg-gray-500 text-white",
  destructive: "bg-red-600 hover:bg-red-500 text-white",
  outline: "border border-gray-300 hover:bg-gray-100 text-gray-900",
  ghost: "hover:bg-gray-100 text-gray-900",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "default",
  size = "md",
  className,
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        "disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
