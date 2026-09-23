import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08090b',
          900: '#0c0e12',
          800: '#12151a',
          700: '#1a1e25',
          600: '#242932',
          500: '#333a46',
        },
        mist: {
          100: '#f5f6f8',
          200: '#e7e9ee',
          300: '#c7ccd6',
          400: '#9aa2b1',
          500: '#6b7280',
        },
        signal: {
          300: '#6ee7c7',
          400: '#3ddc97',
          500: '#22b981',
          600: '#189a6b',
        },
        ion: {
          300: '#b3a6ff',
          400: '#8b7cf6',
          500: '#6f5ce8',
          600: '#5744c4',
        },
        ember: {
          400: '#ff8a76',
          500: '#ff6b5d',
          600: '#e64f43',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'aurora-radial':
          'radial-gradient(60% 60% at 50% 0%, rgba(139,124,246,0.20) 0%, rgba(61,220,151,0.10) 45%, rgba(8,9,11,0) 80%)',
        'signal-ion': 'linear-gradient(135deg, #3ddc97 0%, #8b7cf6 100%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px -8px rgba(61,220,151,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
