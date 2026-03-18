/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: {
      sm:    '480px',
      md:    '768px',
      lg:    '1024px',
      xl:    '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        'bg-deep':      'var(--bg-deep)',
        'bg-surface':   'var(--bg-surface)',
        'bg-hover':     'var(--bg-hover)',
        'border':       'var(--border)',
        'border-bright':'var(--border-bright)',
        'text-main':    'var(--text-main)',
        'text-muted':   'var(--text-muted)',
        'accent': {
          DEFAULT: 'var(--accent)',
          glow:    'var(--accent-glow)',
        },
        'success': 'var(--success)',
        'warning': 'var(--warning)',
        'error':   'var(--error)',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'dot-grid': "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        'dot-grid': '28px 28px',
      },
    }
  },
  plugins: []
}
