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
  green: { label: '🟢 Favorable', color: '#00FF88' },
  yellow: { label: '🟡 Attention', color: '#FFB347' },
  red: { label: '🔴 Fermé', color: '#FF6B35' },
}

interface SkydiveData {
  name: string; icao: string; altitudeM: number; radio: string
  phone: string; website: string; aircraft: string[]; maxAltitudeM: number
  windSurface: number; wind3000: number; wind4000: number; visibility: number
  precipFraction: number; cloudcoverLow: number; hasStorm: boolean
  condition: 'green' | 'yellow' | 'red'
}

export default function SkydivePanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as SkydiveData
  const cond = COND[d.condition]
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 17, color: '#FF4500', marginBottom: 4, lineHeight: 1.2 }}>
        {d.name}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 15, color: cond.color, marginBottom: 10 }}>
        {cond.label}
      </p>
      <Row label="OACI" value={d.icao} />
      <Row label="ALT TERRAIN" value={`${d.altitudeM} m`} />
      <Row label="ALT LARGAGE" value={`${d.maxAltitudeM} m`} />
      <Row label="VENT SOL" value={`${Math.round(d.windSurface)} km/h`} />
      <Row label="VENT 3 000m" value={`${Math.round(d.wind3000)} km/h`} />
      <Row label="VENT 4 000m" value={`${Math.round(d.wind4000)} km/h`} />
      <Row label="VISIBILITÉ" value={`${d.visibility.toFixed(1)} km`} />
      <Row label="NUAGES BAS" value={`${Math.round(d.cloudcoverLow)} %`} />
      <Row label="PRÉCIP JOUR" value={
        d.hasStorm
          ? '⛈ Orage'
          : d.precipFraction > 0
          ? `${Math.round(d.precipFraction * 100)} % du jour`
          : 'Sec'
      } />
      <Row label="FRÉQUENCE" value={d.radio} />
      <Row label="AVIONS" value={d.aircraft.join(', ')} />
      <a
        href={`tel:${d.phone}`}
        style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4a6fa5', marginTop: 8, textDecoration: 'none' }}
      >
        {d.phone}
      </a>
      {d.website && (
        <a
          href={d.website}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', textAlign: 'center', marginTop: 12,
            fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 13,
            letterSpacing: '0.1em', textDecoration: 'none',
            color: '#4a6fa5', border: '1px solid #1a2840',
            padding: '6px 0', borderRadius: 3,
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          SITE WEB →
        </a>
      )}
    </div>
  )
}
