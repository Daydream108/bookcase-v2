import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: 'var(--paper)',
          2: 'var(--paper-2)',
          3: 'var(--paper-3)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
          4: 'var(--ink-4)',
        },
        pulp: {
          DEFAULT: 'var(--pulp)',
          deep: 'var(--pulp-deep)',
          soft: 'var(--pulp-soft)',
        },
        moss: {
          DEFAULT: 'var(--moss)',
          soft: 'var(--moss-soft)',
        },
        blush: 'var(--blush)',
        plum: 'var(--plum)',
        sky: 'var(--sky)',
        gold: 'var(--gold)',
        border: 'var(--border)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Geist', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Instrument Serif', 'Times New Roman', 'serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        pulp: 'var(--shadow-pulp)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
    },
  },
  plugins: [],
}

export default config
