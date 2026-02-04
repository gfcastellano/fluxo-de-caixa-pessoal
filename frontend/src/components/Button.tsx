import { cn } from '../utils/cn';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { components } from '../styles/design-system';

/**
 * Button Variants
 * Primary: Main call-to-action buttons
 * Secondary: Alternative actions
 * Outline: Bordered buttons for less emphasis
 * Ghost: Minimal buttons for subtle actions
 * Danger: Destructive actions
 * Success: Positive confirmation actions
 * Warning: Cautionary actions
 * Link: Text-only button appearance
 */
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'link';

/**
 * Button Sizes
 * sm: Small buttons for compact UIs
 * md: Default size for most buttons
 * lg: Large buttons for prominent actions
 * icon: Square buttons for icon-only content
 * icon-sm: Small icon buttons
 * icon-lg: Large icon buttons
 */
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Button Component
 *
 * A versatile button component that supports multiple variants, sizes,
 * and states. Uses the design system for consistent styling across the app.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="danger" leftIcon={<TrashIcon />}>Delete</Button>
 * <Button variant="ghost" size="sm">Cancel</Button>
 * <Button isLoading>Loading...</Button>
 * ```
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Get base classes from design system
    const baseClasses = components.button.base;
    const sizeClasses = components.button.sizes[size];
    const variantClasses = components.button.variants[variant];

    // Loading spinner component
    const LoadingSpinner = () => (
      <svg
        className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          sizeClasses,
          variantClasses,
          // Loading state styles
          isLoading && 'cursor-wait opacity-80',
          // Disabled state (in addition to design system)
          (disabled || isLoading) && 'cursor-not-allowed',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        <span className="flex items-center gap-2 whitespace-nowrap">
          {isLoading && <LoadingSpinner />}
          {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children && <span className="whitespace-nowrap">{children}</span>}
          {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
