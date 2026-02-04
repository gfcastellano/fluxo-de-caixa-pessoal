import { cn } from '../utils/cn';
import { type HTMLAttributes, forwardRef } from 'react';
import { components } from '../styles/design-system';

/**
 * Card Component
 *
 * A flexible container component that groups related content and actions.
 * Supports multiple sizes, hover states, and interactive modes.
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Card Title</CardTitle>
 *   </CardHeader>
 *   <CardContent>Card content goes here</CardContent>
 * </Card>
 *
 * <Card hoverable interactive onClick={handleClick}>
 *   Clickable card content
 * </Card>
 * ```
 */

// ============================================
// CARD COMPONENT
// ============================================

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Enable hover shadow effect */
  hoverable?: boolean;
  /** Enable interactive cursor and lift effect */
  interactive?: boolean;
  /** Remove default padding */
  noPadding?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      size = 'md',
      hoverable = false,
      interactive = false,
      noPadding = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base card styles from design system
          components.card.base,
          // Size padding (unless noPadding is set)
          !noPadding && components.card.sizes[size],
          // Optional hover effect
          hoverable && components.card.hoverable,
          // Optional interactive effect
          interactive && components.card.interactive,
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

// ============================================
// CARD HEADER
// ============================================

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Remove bottom border */
  noBorder?: boolean;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, noBorder = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col space-y-1.5',
          !noBorder && 'pb-4 border-b border-neutral-100',
          className
        )}
        {...props}
      />
    );
  }
);

CardHeader.displayName = 'CardHeader';

// ============================================
// CARD TITLE
// ============================================

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(components.card.title, className)}
        {...props}
      />
    );
  }
);

CardTitle.displayName = 'CardTitle';

// ============================================
// CARD DESCRIPTION
// ============================================

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(components.card.description, className)}
        {...props}
      />
    );
  }
);

CardDescription.displayName = 'CardDescription';

// ============================================
// CARD CONTENT
// ============================================

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Remove top padding when following a header */
  noTopPadding?: boolean;
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, noTopPadding = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          !noTopPadding && 'pt-4',
          className
        )}
        {...props}
      />
    );
  }
);

CardContent.displayName = 'CardContent';

// ============================================
// CARD FOOTER
// ============================================

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Remove top border */
  noBorder?: boolean;
  /** Align items to the start instead of between */
  alignStart?: boolean;
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, noBorder = false, alignStart = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3',
          !alignStart && 'justify-between',
          !noBorder && 'pt-4 mt-4 border-t border-neutral-100',
          className
        )}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';

// ============================================
// EXPORTS
// ============================================

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};

export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
};
