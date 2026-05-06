/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 표면(배경)
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised:  'rgb(var(--surface-raised) / <alpha-value>)',
          sunken:  'rgb(var(--surface-sunken) / <alpha-value>)',
          muted:   'rgb(var(--surface-muted) / <alpha-value>)',
        },
        // 텍스트
        text: {
          DEFAULT:  'rgb(var(--text) / <alpha-value>)',
          muted:    'rgb(var(--text-muted) / <alpha-value>)',
          subtle:   'rgb(var(--text-subtle) / <alpha-value>)',
          inverted: 'rgb(var(--text-inverted) / <alpha-value>)',
        },
        // 외곽선
        edge: {
          DEFAULT: 'rgb(var(--edge) / <alpha-value>)',
          strong:  'rgb(var(--edge-strong) / <alpha-value>)',
          subtle:  'rgb(var(--edge-subtle) / <alpha-value>)',
        },
        // 브랜드
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          hover:   'rgb(var(--brand-hover) / <alpha-value>)',
          muted:   'rgb(var(--brand-muted) / <alpha-value>)',
          fg:      'rgb(var(--brand-fg) / <alpha-value>)',
        },
        // 시맨틱 (성공/주의/위험)
        positive: {
          DEFAULT: 'rgb(var(--positive) / <alpha-value>)',
          fg:      'rgb(var(--positive-fg) / <alpha-value>)',
          muted:   'rgb(var(--positive-muted) / <alpha-value>)',
        },
        caution: {
          DEFAULT: 'rgb(var(--caution) / <alpha-value>)',
          fg:      'rgb(var(--caution-fg) / <alpha-value>)',
          muted:   'rgb(var(--caution-muted) / <alpha-value>)',
        },
        critical: {
          DEFAULT: 'rgb(var(--critical) / <alpha-value>)',
          fg:      'rgb(var(--critical-fg) / <alpha-value>)',
          muted:   'rgb(var(--critical-muted) / <alpha-value>)',
        },
        // 정보 액센트(보조)
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          fg:      'rgb(var(--info-fg) / <alpha-value>)',
          muted:   'rgb(var(--info-muted) / <alpha-value>)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      fontFamily: {
        sans: ['var(--font-ui)'],
        heading: ['var(--font-heading)'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
