import type { Config } from 'tailwindcss';

/**
 * Design tokens — single source of truth.
 * Mantenha 1:1 com docs/PROMPT_CLAUDE_DESIGNER.md §design_tokens.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic aliases — 1:1 com docs/design-prototype/styles.css :root
        bg: {
          DEFAULT:     '#09090B', // --bg
          surface:     '#18181B', // --surface
          'surface-hi':'#1F1F23', // --surface-hi (hover, depth)
          subtle:      '#27272A',
        },
        border: {
          DEFAULT: '#27272A', // --border
          strong:  '#3F3F46', // --border-hi
        },
        text: {
          DEFAULT:   '#FAFAFA', // --text
          secondary: '#A1A1AA', // --text-2
          muted:     '#52525B', // --text-3
        },
        primary: {
          DEFAULT: '#3B82F6', // --primary
          hover:   '#60A5FA', // --primary-hi
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger:  '#EF4444',
        grade: {
          excellent: '#10B981',
          good:      '#3B82F6',
          fair:      '#F59E0B',
          poor:      '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs:   ['12px', { lineHeight: '16px' }],
        sm:   ['13px', { lineHeight: '18px' }],
        base: ['14px', { lineHeight: '20px' }],
        md:   ['16px', { lineHeight: '24px' }],
        lg:   ['20px', { lineHeight: '28px' }],
        xl:   ['24px', { lineHeight: '32px' }],
        '2xl':['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        '3xl':['48px', { lineHeight: '56px', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        sm:  '6px',
        DEFAULT: '8px',
        lg: '12px',
        pill: '9999px',
      },
      boxShadow: {
        subtle:   '0 1px 3px rgba(0,0,0,0.4)',
        elevated: '0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)',
      },
      transitionDuration: {
        fast: '100ms',
        DEFAULT: '150ms',
        medium: '200ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
