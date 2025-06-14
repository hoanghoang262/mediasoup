import { type ClassValue, clsx } from 'clsx';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx functionality with conditional class application
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Conditional className helper
 */
export function conditionalClass(
  condition: boolean,
  trueClass: string,
  falseClass = ''
): string {
  return condition ? trueClass : falseClass;
}

/**
 * Variant-based className selector
 */
export function variantClass<T extends string>(
  variant: T,
  variants: Record<T, string>
): string {
  return variants[variant] || '';
} 