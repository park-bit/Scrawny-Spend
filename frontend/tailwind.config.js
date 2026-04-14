/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"DM Sans"', 'sans-serif'],
        mono:  ['"DM Mono"', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
      },
      colors: {
        // Base surfaces - deeply black and obsidian
        navy: {
          950: '#000000',
          900: '#090a0f',
          800: '#11131a',
          700: '#1e212b',
          600: '#2b2f3e',
        },
        // Accent – amber / gold for money actions
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Semantic
        success:  '#22c55e',
        danger:   '#ef4444',
        warning:  '#f59e0b',
        info:     '#38bdf8',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 60%)',
      },
      boxShadow: {
        'card':  '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        'glow-amber': '0 0 20px rgba(251,191,36,0.15)',
        'glow-blue':  '0 0 20px rgba(56,189,248,0.12)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease both',
        'slide-up':    'slideUp 0.4s ease both',
        'slide-in-r':  'slideInRight 0.35s ease both',
        'pulse-slow':  'pulse 3s ease-in-out infinite',
        'spin-slow':   'spin 8s linear infinite',
        'shimmer':     'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:       { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:      { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
