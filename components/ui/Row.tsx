/**
 * Ligne label / valeur utilisée dans tous les panneaux de détail.
 * Le prop `highlight` colore la valeur en orange (alerte densité altitude, etc.)
 * Le prop `valueColor` permet de forcer une couleur spécifique sur la valeur.
 */
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
  const color = valueColor ?? (highlight ? '#FFB347' : '#8aaccc')
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: '5px 0',
      borderBottom: '1px solid #0d1826',
    }}>
      <span style={{
        fontFamily: 'var(--font-rajdhani)',
        fontWeight: 500,
        fontSize: 13,
        letterSpacing: '0.06em',
        color: '#4a6fa5',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
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
