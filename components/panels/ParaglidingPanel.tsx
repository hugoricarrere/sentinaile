import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid #0d1826' }}>
      <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 500, fontSize: 13, letterSpacing: '0.06em', color: '#4a6fa5' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8aaccc', textAlign: 'right', maxWidth: '55%' }}>
        {value}
      </span>
    </div>
  )
}

const COND = {
  green: { label: '🟢 Vol possible', color: '#00FF88' },
  yellow: { label: '🟡 Conditions limites', color: '#FFB347' },
  red: { label: '🔴 Vol déconseillé', color: '#FF6B35' },
}

interface PGData {
  name: string; country: string; type: string; level: string
  altitudeM: number; windDirections: string[]
  windKmh: number; gustKmh: number; tempC: number
  condition: 'green' | 'yellow' | 'red'
}

export default function ParaglidingPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as PGData
  const cond = COND[d.condition]
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 17, color: '#9B59B6', marginBottom: 4, lineHeight: 1.2 }}>
        {d.name}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 15, color: cond.color, marginBottom: 10 }}>
        {cond.label}
      </p>
      <Row label="PAYS" value={d.country} />
      <Row label="TYPE" value={d.type} />
      <Row label="NIVEAU" value={d.level} />
      <Row label="ALTITUDE DÉCO" value={`${d.altitudeM} m`} />
      <Row label="VENT FAVORABLE" value={d.windDirections.join(', ')} />
      <Row label="VENT ACTUEL" value={`${Math.round(d.windKmh)} km/h`} />
      <Row label="RAFALES" value={`${Math.round(d.gustKmh)} km/h`} />
      <Row label="TEMP" value={`${Math.round(d.tempC)}°C`} />
    </div>
  )
}
