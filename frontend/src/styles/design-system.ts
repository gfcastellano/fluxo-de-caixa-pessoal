/**
 * Design System for Fluxo de Caixa Pessoal
 * A comprehensive design system for consistent UI/UX across the application
 */

// ============================================
// COLOR PALETTE
// ============================================

export const colors = {
  // Primary - Blue (trust, finance, stability)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Secondary - Indigo (complementary, premium feel)
  secondary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },

  // Success - Emerald (positive financial actions)
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },

  // Warning - Amber (cautions, pending states)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Danger - Rose (errors, expenses, negative values)
  danger: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519',
  },

  // Neutral - Slate (text, backgrounds, borders)
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Income - Green (positive cash flow)
  income: {
    light: '#86efac',
    DEFAULT: '#22c55e',
    dark: '#15803d',
  },

  // Expense - Red (negative cash flow)
  expense: {
    light: '#fca5a5',
    DEFAULT: '#ef4444',
    dark: '#b91c1c',
  },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  // Font family
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
  },

  // Font sizes
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
    '5xl': ['3rem', { lineHeight: '1' }],         // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],      // 60px
  },

  // Font weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================
// SPACING SCALE
// ============================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  // Custom shadows for specific use cases
  card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  dropdown: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  modal: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  focus: '0 0 0 3px rgb(59 130 246 / 0.5)',
} as const;

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// ANIMATIONS
// ============================================

export const animations = {
  // Durations
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easings
  easing: {
    linear: 'linear',
    ease: 'ease',
    'ease-in': 'ease-in',
    'ease-out': 'ease-out',
    'ease-in-out': 'ease-in-out',
    // Custom easings
    'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  // Keyframe animations
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    fadeOut: {
      '0%': { opacity: '1' },
      '100%': { opacity: '0' },
    },
    slideInFromBottom: {
      '0%': { transform: 'translateY(10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    slideInFromTop: {
      '0%': { transform: 'translateY(-10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    scaleIn: {
      '0%': { transform: 'scale(0.95)', opacity: '0' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
    spin: {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' },
    },
    bounce: {
      '0%, 100%': { transform: 'translateY(-25%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
      '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
    },
  },

  // Animation utilities
  animation: {
    'fade-in': 'fadeIn 200ms ease-out',
    'fade-out': 'fadeOut 200ms ease-in',
    'slide-in-bottom': 'slideInFromBottom 300ms ease-out',
    'slide-in-top': 'slideInFromTop 300ms ease-out',
    'scale-in': 'scaleIn 200ms ease-out',
    'spin-slow': 'spin 3s linear infinite',
    'spin': 'spin 1s linear infinite',
    'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    'bounce': 'bounce 1s infinite',
  },
} as const;

// ============================================
// COMPONENT STYLES
// ============================================

export const components = {
  // Button variants
  button: {
    // Base styles applied to all buttons
    base: [
      'inline-flex items-center justify-center',
      'rounded-md font-medium',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
      'active:scale-[0.98]',
      'whitespace-nowrap',
    ].join(' '),

    // Size variants
    sizes: {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-base gap-2',
      lg: 'h-12 px-6 text-lg gap-2',
      icon: 'h-10 w-10 p-2',
      'icon-sm': 'h-8 w-8 p-1.5',
      'icon-lg': 'h-12 w-12 p-3',
    },

    // Color variants
    variants: {
      primary: [
        'bg-primary-600 text-white',
        'hover:bg-primary-700',
        'focus:ring-primary-500',
        'shadow-sm hover:shadow-md',
      ].join(' '),

      secondary: [
        'bg-neutral-100 text-neutral-900',
        'hover:bg-neutral-200',
        'focus:ring-neutral-500',
        'border border-neutral-200',
      ].join(' '),

      outline: [
        'bg-transparent text-neutral-700',
        'border-2 border-neutral-300',
        'hover:bg-neutral-50 hover:border-neutral-400',
        'focus:ring-neutral-400',
      ].join(' '),

      ghost: [
        'bg-transparent text-neutral-700',
        'hover:bg-neutral-100',
        'focus:ring-neutral-400',
      ].join(' '),

      danger: [
        'bg-danger-600 text-white',
        'hover:bg-danger-700',
        'focus:ring-danger-500',
        'shadow-sm hover:shadow-md',
      ].join(' '),

      success: [
        'bg-success-600 text-white',
        'hover:bg-success-700',
        'focus:ring-success-500',
        'shadow-sm hover:shadow-md',
      ].join(' '),

      warning: [
        'bg-warning-500 text-white',
        'hover:bg-warning-600',
        'focus:ring-warning-500',
        'shadow-sm hover:shadow-md',
      ].join(' '),

      // Link style button
      link: [
        'bg-transparent text-primary-600',
        'hover:text-primary-700 hover:underline',
        'focus:ring-primary-500',
        'p-0 h-auto',
      ].join(' '),
    },
  },

  // Card styles
  card: {
    base: [
      'rounded-xl border border-neutral-200',
      'bg-white',
      'shadow-sm',
      'transition-shadow duration-200',
    ].join(' '),

    hoverable: 'hover:shadow-md hover:border-neutral-300',

    interactive: 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',

    sizes: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },

    header: [
      'flex flex-col space-y-1.5',
      'pb-4 border-b border-neutral-100',
    ].join(' '),

    title: [
      'text-lg font-semibold',
      'text-neutral-900',
      'leading-tight tracking-tight',
    ].join(' '),

    description: [
      'text-sm text-neutral-500',
    ].join(' '),

    content: 'pt-4',

    footer: [
      'flex items-center justify-between',
      'pt-4 mt-4 border-t border-neutral-100',
    ].join(' '),
  },

  // Input styles
  input: {
    base: [
      'flex w-full',
      'rounded-lg border border-neutral-300',
      'bg-white px-3 py-2',
      'text-sm text-neutral-900',
      'placeholder:text-neutral-400',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50',
    ].join(' '),

    sizes: {
      sm: 'h-8 px-2.5 text-xs',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base',
    },

    states: {
      error: 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
      success: 'border-success-500 focus:border-success-500 focus:ring-success-500/20',
    },

    label: [
      'block text-sm font-medium',
      'text-neutral-700',
      'mb-1.5',
    ].join(' '),

    helper: [
      'mt-1.5 text-xs',
      'text-neutral-500',
    ].join(' '),

    errorText: [
      'mt-1.5 text-xs',
      'text-danger-600',
    ].join(' '),
  },

  // Modal styles
  modal: {
    overlay: [
      'fixed inset-0 z-50',
      'bg-neutral-900/50 backdrop-blur-sm',
      'flex items-center justify-center',
      'p-4',
      'animate-fade-in',
    ].join(' '),

    container: [
      'relative w-full max-w-lg',
      'bg-white rounded-2xl',
      'shadow-2xl',
      'animate-scale-in',
      'overflow-hidden',
    ].join(' '),

    header: [
      'flex items-center justify-between',
      'px-6 py-4 border-b border-neutral-100',
    ].join(' '),

    title: [
      'text-lg font-semibold text-neutral-900',
    ].join(' '),

    closeButton: [
      'p-2 rounded-lg',
      'text-neutral-400 hover:text-neutral-600',
      'hover:bg-neutral-100',
      'transition-colors',
    ].join(' '),

    body: 'px-6 py-4',

    footer: [
      'flex items-center justify-end gap-3',
      'px-6 py-4 border-t border-neutral-100 bg-neutral-50/50',
    ].join(' '),

    sizes: {
      sm: 'max-w-sm',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-full mx-4',
    },
  },

  // Badge styles
  badge: {
    base: [
      'inline-flex items-center',
      'px-2.5 py-0.5',
      'rounded-full text-xs font-medium',
      'transition-colors',
    ].join(' '),

    variants: {
      default: 'bg-neutral-100 text-neutral-800',
      primary: 'bg-primary-100 text-primary-800',
      success: 'bg-success-100 text-success-800',
      warning: 'bg-warning-100 text-warning-800',
      danger: 'bg-danger-100 text-danger-800',
      outline: 'border border-neutral-300 text-neutral-700',
    },
  },

  // Alert styles
  alert: {
    base: [
      'relative w-full rounded-lg border p-4',
      'flex items-start gap-3',
    ].join(' '),

    variants: {
      info: 'bg-primary-50 border-primary-200 text-primary-900',
      success: 'bg-success-50 border-success-200 text-success-900',
      warning: 'bg-warning-50 border-warning-200 text-warning-900',
      error: 'bg-danger-50 border-danger-200 text-danger-900',
    },

    title: 'font-semibold text-sm mb-1',
    description: 'text-sm opacity-90',
  },

  // Table styles
  table: {
    wrapper: 'w-full overflow-x-auto rounded-lg border border-neutral-200',
    table: 'w-full text-sm text-left',
    thead: 'bg-neutral-50 text-neutral-700 uppercase text-xs font-semibold',
    th: 'px-4 py-3',
    tbody: 'divide-y divide-neutral-200 bg-white',
    tr: 'hover:bg-neutral-50/50 transition-colors',
    td: 'px-4 py-3 text-neutral-900',
  },
} as const;

// ============================================
// LAYOUT UTILITIES
// ============================================

export const layout = {
  // Container widths
  container: {
    sm: 'max-w-screen-sm mx-auto px-4',
    md: 'max-w-screen-md mx-auto px-4 sm:px-6',
    lg: 'max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8',
    xl: 'max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8',
    '2xl': 'max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8',
  },

  // Page sections
  section: {
    sm: 'py-6',
    md: 'py-8',
    lg: 'py-12',
    xl: 'py-16',
  },

  // Grid gaps
  gap: {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },

  // Stack spacing (vertical)
  stack: {
    xs: 'space-y-2',
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8',
  },

  // Inline spacing (horizontal)
  inline: {
    xs: 'space-x-2',
    sm: 'space-x-3',
    md: 'space-x-4',
    lg: 'space-x-6',
    xl: 'space-x-8',
  },
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================

export const zIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
  property: {
    none: 'none',
    all: 'all',
    DEFAULT: 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
    colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
    opacity: 'opacity',
    shadow: 'box-shadow',
    transform: 'transform',
  },
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  timing: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================
// OPACITY SCALE
// ============================================

export const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  25: '0.25',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  75: '0.75',
  80: '0.8',
  90: '0.9',
  95: '0.95',
  100: '1',
} as const;

// ============================================
// BLUR VALUES
// ============================================

export const blur = {
  none: '0',
  sm: '4px',
  DEFAULT: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
  '3xl': '64px',
} as const;

// ============================================
// EXPORT ALL AS DEFAULT
// ============================================

const designSystem = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  animations,
  components,
  layout,
  zIndex,
  transitions,
  opacity,
  blur,
};

export default designSystem;
