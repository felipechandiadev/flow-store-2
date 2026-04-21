import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #1C2046)',
        background: 'var(--color-background, #ffffff)',
        foreground: 'var(--color-foreground, #131615)',
        border: 'var(--color-border, #c1c1c2)',
        accent: 'var(--color-accent, #2563a8)',
        secondary: 'var(--color-secondary, #04C9E7)',
        muted: 'var(--color-muted, #6b7280)',
        success: 'var(--color-success, #4CAF50)',
        info: 'var(--color-info, #2196F3)',
        warning: 'var(--color-warning, #FFC107)',
        error: 'var(--color-error, #F44336)',
        neutral: 'var(--color-neutral, #F3F4F6)',
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      zIndex: {
        1000: '1000',
      },
    },
  },
  plugins: [],
};

export default config;
