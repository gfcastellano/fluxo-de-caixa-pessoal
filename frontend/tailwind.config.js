/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Custom responsive breakpoints
    screens: {
      'sm': '640px',    // Tablet portrait
      'md': '768px',    // Tablet landscape
      'lg': '1024px',   // Desktop
      'xl': '1280px',   // Large desktop
      '2xl': '1536px',  // Extra large desktop
    },
    extend: {
      // Z-index scale for layering
      zIndex: {
        'sticky': '100',
        'docked': '200',
        'dropdown': '300',
        'overlay': '400',
        'modal': '500',
        'popover': '600',
        'tooltip': '700',
      },
      colors: {
        // Brand Base
        ink: {
          DEFAULT: '#0B1220', // Texto principal
          light: '#1A2333',
        },
        slate: {
          DEFAULT: '#5B667A', // Texto secundário
          light: '#8D99AE',
        },
        mist: {
          DEFAULT: '#F0F4F8', // Background principal (Cooler/Blueish gray)
          dark: '#D9E2EC',
        },

        // Brand Accents
        blue: {
          DEFAULT: '#3A86FF', // Primary / Ação / Voz (New Brand Color)
          hover: '#2563EB',
          light: '#E6F0FF', // Backgrounds de tint
        },
        teal: {
          DEFAULT: '#2EC4B6', // Secondary / Legacy
          hover: '#25A094',
          light: '#E0F7F6',
        },
        amber: {
          DEFAULT: '#FFBE0B', // Atenção
          light: '#FFF8E1',
        },
        rose: {
          DEFAULT: '#FF5C8A', // Alerta / Risco / Expense
          light: '#FFF0F4',
        },
        emerald: {
          DEFAULT: '#22C55E', // Positivo / Income
          light: '#E6F8ED',
        },

        // Semantic Aliases (Mapping for refactoring ease)
        background: '#F0F4F8', // Mist
        surface: 'rgba(255, 255, 255, 0.65)', // Glass base (Slightly more opaque for calmness)
        primary: '#3A86FF', // Blue
        text: {
          primary: '#0B1220', // Ink
          secondary: '#5B667A', // Slate
        },
        income: '#22C55E',   // Emerald
        expense: '#FF5C8A',  // Rose
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Mobile-first sizes
        'caption': ['12px', { lineHeight: '16px' }],
        'body': ['16px', { lineHeight: '24px' }],
        'h2': ['22px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        'h1': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],

        // Monetary specific
        'balance': ['36px', { lineHeight: '1', fontWeight: '600', letterSpacing: '-0.03em' }],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      boxShadow: {
        'glass': '0 4px 24px -1px rgba(0, 0, 0, 0.04), 0 0 1px 0 rgba(0, 0, 0, 0.06)',
        'glass-hover': '0 8px 32px -2px rgba(0, 0, 0, 0.08), 0 0 1px 0 rgba(0, 0, 0, 0.08)',
        'float-button': '0 12px 36px -4px rgba(58, 134, 255, 0.35)', // Blue shadow
      },
      animation: {
        'wave': 'wave 2s infinite',
        'highlight': 'highlight 1.5s ease-in-out infinite',
      },
      keyframes: {
        highlight: {
          '0%, 100%': { backgroundColor: 'transparent', boxShadow: 'inset 0 0 0 0 rgba(58, 134, 255, 0)' },
          '50%': { backgroundColor: 'rgba(58, 134, 255, 0.1)', boxShadow: 'inset 0 0 0 1px rgba(58, 134, 255, 0.3)' },
        },
        wave: {
          '0%': { transform: 'scale(0.95)', opacity: '0.6' },
          '50%': { transform: 'scale(1.05)', opacity: '0.3' },
          '100%': { transform: 'scale(0.95)', opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
