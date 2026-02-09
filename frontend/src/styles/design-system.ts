/**
 * Design System for Assist (Fluxo de Caixa Pessoal)
 * Refactored for Glass + Calm Identity
 */

// ============================================
// COLOR PALETTE REFERENCE (Mapped to Tailwind)
// ============================================
// These are informational, as we use Tailwind classes directly in the components object.

export const colors = {
  brand: {
    ink: '#0B1220',
    slate: '#5B667A',
    mist: '#F0F4F8',
    blue: '#3A86FF',
  },
  semantic: {
    primary: 'var(--color-primary)', // Mapped to Blue
    success: '#22C55E',
    warning: '#FFBE0B',
    danger: '#FF5C8A',
    info: '#3A86FF',
  }
} as const;

// ============================================
// COMPONENT STYLES
// ============================================

export const components = {
  // Button variants
  button: {
    base: [
      'inline-flex items-center justify-center',
      'rounded-xl font-medium',
      'transition-all duration-300',
      'focus:outline-none focus:ring-2 focus:ring-blue/20',
      'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
      'active:scale-[0.98]',
      'whitespace-nowrap',
    ].join(' '),

    sizes: {
      sm: 'h-8 px-3 text-caption gap-1.5',
      md: 'h-11 px-5 text-body text-sm gap-2', // Slightly taller for modern touch
      lg: 'h-13 px-7 text-lg gap-2.5',
      icon: 'h-11 w-11 p-2.5',
      'icon-sm': 'h-8 w-8 p-1.5',
      'icon-lg': 'h-14 w-14 p-3',
    },

    variants: {
      primary: [
        'bg-blue text-white shadow-lg shadow-blue/20',
        'hover:bg-blue-hover hover:shadow-blue/30',
        'border border-transparent',
      ].join(' '),

      secondary: [
        'bg-white/60 backdrop-blur-md text-ink',
        'border border-white/40 shadow-glass',
        'hover:bg-white/80 hover:border-white/60',
      ].join(' '),

      outline: [
        'bg-transparent text-slate',
        'border border-slate/20',
        'hover:bg-slate/5 hover:text-ink hover:border-slate/40',
      ].join(' '),

      ghost: [
        'bg-transparent text-slate',
        'hover:bg-slate/5 hover:text-ink',
      ].join(' '),

      danger: [
        'bg-rose text-white shadow-lg shadow-rose/20',
        'hover:opacity-90',
        'border border-transparent',
      ].join(' '),

      success: [
        'bg-emerald text-white shadow-lg shadow-emerald/20',
        'hover:opacity-90',
        'border border-transparent',
      ].join(' '),

      warning: [
        'bg-amber text-ink shadow-lg shadow-amber/20',
        'hover:opacity-90',
        'border border-transparent',
      ].join(' '),

      link: [
        'bg-transparent text-blue',
        'hover:text-blue-hover hover:underline',
        'p-0 h-auto',
      ].join(' '),
    },
  },

  // Card styles (Glassmorphism default)
  card: {
    base: [
      'card-glass', // Uses the utility from index.css
      'relative overflow-hidden',
    ].join(' '),

    hoverable: 'hover:shadow-glass-hover transition-shadow duration-300',

    interactive: 'card-glass-interactive',

    sizes: {
      sm: 'p-4',
      md: 'p-4 sm:p-6',
      lg: 'p-6 sm:p-8',
    },

    header: [
      'flex flex-col space-y-1',
      'pb-4',
    ].join(' '),

    title: [
      'text-lg font-semibold',
      'text-ink',
      'leading-tight',
    ].join(' '),

    description: [
      'text-sm text-slate',
    ].join(' '),

    content: 'pt-2',

    footer: [
      'flex items-center justify-between',
      'pt-4 mt-2',
    ].join(' '),
  },

  // Input styles
  input: {
    base: [
      'flex w-full',
      'input-glass', // Uses utility from index.css
      'transition-all duration-200',
    ].join(' '),

    sizes: {
      sm: 'h-9 px-3 text-xs',
      md: 'h-11 px-4 text-sm',
      lg: 'h-13 px-5 text-base',
    },

    states: {
      error: 'border-rose text-rose placeholder:text-rose/50 focus:border-rose focus:ring-rose/20',
      success: 'border-emerald text-emerald placeholder:text-emerald/50 focus:border-emerald focus:ring-emerald/20',
    },

    label: [
      'block text-sm font-medium',
      'text-ink mb-1.5',
    ].join(' '),

    helper: [
      'mt-1.5 text-xs',
      'text-slate',
    ].join(' '),

    errorText: [
      'mt-1.5 text-xs',
      'text-rose font-medium',
    ].join(' '),
  },

  // Modal styles
  modal: {
    overlay: [
      'fixed inset-0 z-[1400]', // z-modal
      'bg-ink/20 backdrop-blur-sm', // Custom darker dimmer
      'flex items-center justify-center',
      'p-4',
      'animate-fade-in',
    ].join(' '),

    container: [
      'relative w-full max-w-lg',
      'bg-mist/90 backdrop-blur-xl', // Deep glass
      'border border-white/50',
      'rounded-3xl',
      'shadow-2xl',
      'animate-scale-in',
      'overflow-hidden',
    ].join(' '),

    header: [
      'flex items-center justify-between',
      'px-6 py-5 border-b border-slate/5',
    ].join(' '),

    title: [
      'text-xl font-semibold text-ink',
    ].join(' '),

    closeButton: [
      'p-2 rounded-full',
      'text-slate hover:text-ink',
      'hover:bg-slate/10',
      'transition-colors',
    ].join(' '),

    body: 'px-6 py-6',

    footer: [
      'flex items-center justify-end gap-3',
      'px-6 py-5 border-t border-slate/5 bg-white/30',
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
      default: 'bg-slate/10 text-slate',
      primary: 'bg-blue/10 text-blue',
      success: 'bg-emerald/10 text-emerald',
      warning: 'bg-amber/10 text-amber-default', // using default suffix if needed or just amber
      danger: 'bg-rose/10 text-rose',
      outline: 'border border-slate/20 text-slate',
    },
  },

  // Alert styles
  alert: {
    base: [
      'relative w-full rounded-2xl border p-4',
      'flex items-start gap-3',
      'backdrop-blur-md',
    ].join(' '),

    variants: {
      info: 'bg-blue-light/50 border-blue-light text-blue',
      success: 'bg-emerald-light/50 border-emerald-light text-emerald',
      warning: 'bg-amber-light/50 border-amber-light text-amber',
      error: 'bg-rose-light/50 border-rose-light text-rose',
    },

    title: 'font-semibold text-sm mb-1',
    description: 'text-sm opacity-90',
  },
} as const;

export default { components, colors };

// ============================================
// LAYOUT STYLES
// ============================================

export const layout = {
  container: {
    sm: 'max-w-screen-sm mx-auto px-4',
    md: 'max-w-screen-md mx-auto px-4',
    lg: 'max-w-screen-lg mx-auto px-4',
    xl: 'max-w-screen-xl mx-auto px-4',
    '2xl': 'max-w-screen-2xl mx-auto px-4',
    full: 'w-full px-4',
  },
  section: {
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12',
    xl: 'py-16',
  },
  gap: {
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8',
    10: 'gap-10',
    12: 'gap-12',
  },
  stack: {
    0: 'space-y-0',
    1: 'space-y-1',
    2: 'space-y-2',
    3: 'space-y-3',
    4: 'space-y-4',
    5: 'space-y-5',
    6: 'space-y-6',
    8: 'space-y-8',
    10: 'space-y-10',
    12: 'space-y-12',
  },
  inline: {
    0: 'space-x-0',
    1: 'space-x-1',
    2: 'space-x-2',
    3: 'space-x-3',
    4: 'space-x-4',
    5: 'space-x-5',
    6: 'space-x-6',
    8: 'space-x-8',
    10: 'space-x-10',
    12: 'space-x-12',
  },
} as const;

// ============================================
// TABLE STYLES
// ============================================

export const table = {
  wrapper: 'w-full overflow-x-auto',
  table: 'w-full text-left border-collapse',
  thead: 'border-b border-slate/10',
  th: 'py-3 px-4 text-sm font-medium text-slate uppercase tracking-wider',
  tbody: 'divide-y divide-slate/5',
  tr: 'hover:bg-slate/5 transition-colors',
  td: 'py-3 px-4 text-sm text-ink',
} as const;
