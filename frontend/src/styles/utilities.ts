/**
 * Utility Classes for Fluxo de Caixa Pessoal
 * Pre-built class combinations for common component patterns
 */

import { cn } from '../utils/cn';
import { components, layout } from './design-system';

// ============================================
// BUTTON UTILITIES
// ============================================

/**
 * Get button classes based on variant and size
 */
export function getButtonClasses(
  variant: keyof typeof components.button.variants = 'primary',
  size: keyof typeof components.button.sizes = 'md',
  className?: string
): string {
  return cn(
    components.button.base,
    components.button.sizes[size],
    components.button.variants[variant],
    className
  );
}

/**
 * Button variant classes only (without size)
 */
export const buttonVariants = {
  primary: components.button.variants.primary,
  secondary: components.button.variants.secondary,
  outline: components.button.variants.outline,
  ghost: components.button.variants.ghost,
  danger: components.button.variants.danger,
  success: components.button.variants.success,
  warning: components.button.variants.warning,
  link: components.button.variants.link,
};

/**
 * Button size classes only (without variant)
 */
export const buttonSizes = {
  sm: components.button.sizes.sm,
  md: components.button.sizes.md,
  lg: components.button.sizes.lg,
  icon: components.button.sizes.icon,
  'icon-sm': components.button.sizes['icon-sm'],
  'icon-lg': components.button.sizes['icon-lg'],
};

// ============================================
// CARD UTILITIES
// ============================================

/**
 * Get card classes with optional hover and interactive states
 */
export function getCardClasses(
  options: {
    size?: keyof typeof components.card.sizes;
    hoverable?: boolean;
    interactive?: boolean;
    className?: string;
  } = {}
): string {
  const { size = 'md', hoverable = false, interactive = false, className } = options;

  return cn(
    components.card.base,
    components.card.sizes[size],
    hoverable && components.card.hoverable,
    interactive && components.card.interactive,
    className
  );
}

/**
 * Card sub-component classes
 */
export const cardParts = {
  header: components.card.header,
  title: components.card.title,
  description: components.card.description,
  content: components.card.content,
  footer: components.card.footer,
};

// ============================================
// INPUT UTILITIES
// ============================================

/**
 * Get input classes with optional state
 */
export function getInputClasses(
  options: {
    size?: keyof typeof components.input.sizes;
    state?: 'default' | 'error' | 'success';
    className?: string;
  } = {}
): string {
  const { size = 'md', state = 'default', className } = options;

  return cn(
    components.input.base,
    components.input.sizes[size],
    state === 'error' && components.input.states.error,
    state === 'success' && components.input.states.success,
    className
  );
}

/**
 * Input related classes
 */
export const inputParts = {
  label: components.input.label,
  helper: components.input.helper,
  errorText: components.input.errorText,
};

// ============================================
// MODAL UTILITIES
// ============================================

/**
 * Get modal classes
 */
export function getModalClasses(
  size: keyof typeof components.modal.sizes = 'md',
  className?: string
): string {
  return cn(components.modal.container, components.modal.sizes[size], className);
}

/**
 * Modal sub-component classes
 */
export const modalParts = {
  overlay: components.modal.overlay,
  header: components.modal.header,
  title: components.modal.title,
  closeButton: components.modal.closeButton,
  body: components.modal.body,
  footer: components.modal.footer,
};

// ============================================
// BADGE UTILITIES
// ============================================

/**
 * Get badge classes based on variant
 */
export function getBadgeClasses(
  variant: keyof typeof components.badge.variants = 'default',
  className?: string
): string {
  return cn(
    components.badge.base,
    components.badge.variants[variant],
    className
  );
}

/**
 * Badge variant classes
 */
export const badgeVariants = components.badge.variants;

// ============================================
// ALERT UTILITIES
// ============================================

/**
 * Get alert classes based on variant
 */
export function getAlertClasses(
  variant: keyof typeof components.alert.variants = 'info',
  className?: string
): string {
  return cn(
    components.alert.base,
    components.alert.variants[variant],
    className
  );
}

/**
 * Alert sub-component classes
 */
export const alertParts = {
  title: components.alert.title,
  description: components.alert.description,
};

/**
 * Alert variant classes
 */
export const alertVariants = components.alert.variants;

// ============================================
// TABLE UTILITIES
// ============================================

import { table as tableStyles } from './design-system';

/**
 * Table classes
 */
export const tableClasses = {
  wrapper: tableStyles.wrapper,
  table: tableStyles.table,
  thead: tableStyles.thead,
  th: tableStyles.th,
  tbody: tableStyles.tbody,
  tr: tableStyles.tr,
  td: tableStyles.td,
};

// ============================================
// LAYOUT UTILITIES
// ============================================

/**
 * Container classes
 */
export const containerClasses = layout.container;

/**
 * Section padding classes
 */
export const sectionClasses = layout.section;

/**
 * Gap utilities
 */
export const gapClasses = layout.gap;

/**
 * Stack (vertical spacing) utilities
 */
export const stackClasses = layout.stack;

/**
 * Inline (horizontal spacing) utilities
 */
export const inlineClasses = layout.inline;

/**
 * Get container class based on size
 */
export function getContainerClass(
  size: keyof typeof layout.container = 'lg',
  className?: string
): string {
  return cn(layout.container[size], className);
}

// ============================================
// TYPOGRAPHY UTILITIES
// ============================================

/**
 * Heading styles
 */
export const headings = {
  h1: 'text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl',
  h2: 'text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl',
  h3: 'text-2xl font-semibold tracking-tight text-neutral-900',
  h4: 'text-xl font-semibold tracking-tight text-neutral-900',
  h5: 'text-lg font-semibold tracking-tight text-neutral-900',
  h6: 'text-base font-semibold tracking-tight text-neutral-900',
};

/**
 * Text styles
 */
export const text = {
  body: 'text-base text-neutral-600 leading-relaxed',
  bodySmall: 'text-sm text-neutral-600 leading-relaxed',
  bodyLarge: 'text-lg text-neutral-600 leading-relaxed',
  muted: 'text-sm text-neutral-500',
  caption: 'text-xs text-neutral-500',
  label: 'text-sm font-medium text-neutral-700',
  overline: 'text-xs font-semibold uppercase tracking-wider text-neutral-500',
};

/**
 * Get heading class
 */
export function getHeadingClass(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  className?: string
): string {
  const key = `h${level}` as keyof typeof headings;
  return cn(headings[key], className);
}

// ============================================
// FINANCE-SPECIFIC UTILITIES
// ============================================

/**
 * Amount color classes based on value
 */
export function getAmountClasses(amount: number, className?: string): string {
  return cn(
    'font-semibold tabular-nums',
    amount >= 0 ? 'text-income' : 'text-expense',
    className
  );
}

/**
 * Transaction type indicators
 */
export const transactionIndicators = {
  income: 'text-income bg-income-light/20 border-income',
  expense: 'text-expense bg-expense-light/20 border-expense',
};

/**
 * Status badge classes
 */
export const statusBadges = {
  pending: 'bg-warning-100 text-warning-800 border-warning-200',
  completed: 'bg-success-100 text-success-800 border-success-200',
  failed: 'bg-danger-100 text-danger-800 border-danger-200',
  cancelled: 'bg-neutral-100 text-neutral-800 border-neutral-200',
};

// ============================================
// VISUAL UTILITIES
// ============================================

/**
 * Gradient backgrounds
 */
export const gradients = {
  primary: 'bg-gradient-to-br from-primary-500 to-primary-700',
  secondary: 'bg-gradient-to-br from-secondary-500 to-secondary-700',
  success: 'bg-gradient-to-br from-success-500 to-success-700',
  danger: 'bg-gradient-to-br from-danger-500 to-danger-700',
  warning: 'bg-gradient-to-br from-warning-400 to-warning-600',
  neutral: 'bg-gradient-to-br from-neutral-100 to-neutral-200',
};

/**
 * Glass morphism effect
 */
export const glass = {
  light: 'bg-white/80 backdrop-blur-md border border-white/20',
  dark: 'bg-neutral-900/80 backdrop-blur-md border border-neutral-800/20',
};

/**
 * Focus ring utilities
 */
export const focusRings = {
  primary: 'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2',
  danger: 'focus:outline-none focus:ring-2 focus:ring-danger-500/20 focus:ring-offset-2',
  success: 'focus:outline-none focus:ring-2 focus:ring-success-500/20 focus:ring-offset-2',
};

// ============================================
// ANIMATION UTILITIES
// ============================================

/**
 * Animation classes
 */
export const animations = {
  fadeIn: 'animate-fade-in',
  slideInBottom: 'animate-slide-in-bottom',
  slideInTop: 'animate-slide-in-top',
  scaleIn: 'animate-scale-in',
  spin: 'animate-spin',
  pulse: 'animate-pulse',
};

/**
 * Transition classes
 */
export const transitions = {
  colors: 'transition-colors duration-200',
  transform: 'transition-transform duration-200',
  opacity: 'transition-opacity duration-200',
  shadow: 'transition-shadow duration-200',
  all: 'transition-all duration-200',
};

// ============================================
// ACCESSIBILITY UTILITIES
// ============================================

/**
 * Screen reader only
 */
export const srOnly = 'sr-only';

/**
 * Skip link
 */
export const skipLink = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-skip-link focus:px-4 focus:py-2 focus:bg-white focus:text-neutral-900 focus:rounded-lg focus:shadow-lg';

/**
 * Focus visible utilities
 */
export const focusVisible = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';

// ============================================
// UTILITY EXPORTS
// ============================================

/**
 * Combine multiple utility objects
 */
export const utilities = {
  button: {
    getClasses: getButtonClasses,
    variants: buttonVariants,
    sizes: buttonSizes,
  },
  card: {
    getClasses: getCardClasses,
    parts: cardParts,
  },
  input: {
    getClasses: getInputClasses,
    parts: inputParts,
  },
  modal: {
    getClasses: getModalClasses,
    parts: modalParts,
  },
  badge: {
    getClasses: getBadgeClasses,
    variants: badgeVariants,
  },
  alert: {
    getClasses: getAlertClasses,
    parts: alertParts,
    variants: alertVariants,
  },
  table: tableClasses,
  layout: {
    container: getContainerClass,
    containers: containerClasses,
    sections: sectionClasses,
    gaps: gapClasses,
    stacks: stackClasses,
    inlines: inlineClasses,
  },
  typography: {
    headings,
    text,
    getHeading: getHeadingClass,
  },
  finance: {
    getAmountClasses,
    transactionIndicators,
    statusBadges,
  },
  visual: {
    gradients,
    glass,
    focusRings,
  },
  animations,
  transitions,
  accessibility: {
    srOnly,
    skipLink,
    focusVisible,
  },
};

export default utilities;
