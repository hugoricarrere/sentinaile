/** Shared design tokens — avoid duplicating inline style values across components */

export const FONT = {
  rajdhani: 'var(--font-rajdhani)',
  mono: 'var(--font-mono)',
} as const

export const COLOR = {
  // Condition colors
  green: '#00FF88',
  yellow: '#FFB347',
  red: '#FF6B35',
  // UI text hierarchy
  title: '#ffffff',
  labelPrimary: '#4a6fa5',
  labelSecondary: '#2a4a6a',
  valuePrimary: '#8aaccc',
  // Borders
  border: '#1a2840',
  borderSubtle: '#0d1826',
  // Backgrounds
  bgDeep: '#040810',
  bgPanel: '#060c18',
  bgElevated: '#0B1120',
} as const

export const BORDER = {
  row: `1px solid ${COLOR.borderSubtle}`,
  section: `1px solid ${COLOR.border}`,
} as const

export const SPACING = {
  rowPadding: '5px 0',
  sectionGap: 12,
} as const
