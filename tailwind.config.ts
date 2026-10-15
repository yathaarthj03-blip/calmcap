import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    fontSize: {
      xs: ['12px', '16px'],
      sm: ['14px', '20px'],
      base: ['16px', '24px'],
      lg: ['18px', '26px'],
      xl: ['22px', '30px'],
      '2xl': ['28px', '34px'],
      '3xl': ['36px', '42px'],
      '4xl': ['56px', '60px'],
    },
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        accent: v('accent'),
        'on-accent': v('on-accent'),
        safe: v('safe'),
        mid: v('mid'),
        long: v('accent'),
        loss: v('loss'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        ctl: '12px',
        panel: '16px',
      },
      maxWidth: {
        content: '1200px',
        prose: '65ch',
      },
    },
  },
  plugins: [],
} satisfies Config;
