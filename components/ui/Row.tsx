/**
 * Ligne label / valeur utilisée dans tous les panneaux de détail.
 * Le prop `highlight` colore la valeur en orange (alerte densité altitude, etc.)
 * Le prop `valueColor` permet de forcer une couleur spécifique sur la valeur.
 *
 * Design tokens (colors, fonts, spacing) are defined in `lib/styles.ts`.
 * Other panels still use inline values — migrate gradually as needed.
 */
import { COLOR, FONT, BORDER, SPACING } from '@/lib/styles'

export function Row({
  label,
  value,
  highlight,
  valueColor,
}: {
  label: string
  value: string | number
  highlight?: boolean
  valueColor?: string
}) {
  const color = valueColor ?? (highlight ? COLOR.yellow : COLOR.valuePrimary)
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: SPACING.rowPadding,
      borderBottom: BORDER.row,
    }}>
      <span style={{
        fontFamily: FONT.rajdhani,
        fontWeight: 500,
        fontSize: 14,
        letterSpacing: '0.06em',
        color: COLOR.labelPrimary,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: FONT.mono,
        fontSize: 13,
        color,
        textAlign: 'right',
        maxWidth: '55%',
        fontWeight: highlight ? 700 : 400,
      }}>
        {value}
      </span>
    </div>
  )
}
