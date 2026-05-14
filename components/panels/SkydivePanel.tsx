import type { GeoPoint } from '@/lib/types'

function Row({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid #0d1826' }}>
      <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 500, fontSize: 13, letterSpacing: '0.06em', color: '#4a6fa5' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: highlight ? '#FFB347' : '#8aaccc', textAlign: 'right', maxWidth: '55%', fontWeight: highlight ? 700 : 400 }}>
        {value}
      </span>
    </div>
  )
}

const COND = {
  green: { label: '🟢 Favorable', color: '#00FF88' },
  yellow: { label: '🟡 Attention', color: '#FFB347' },
  red: { label: '🔴 Défavorable', color: '#FF6B35' },
}

interface SkydiveData {
  name: string; icao: string; altitudeM: number; radio: string
  phone: string; website: string; aircraft: string[]; maxAltitudeM: number
  windSurface: number; wind3000: number; wind4000: number; visibility: number
  precipFraction: number; cloudcoverLow: number; hasStorm: boolean
  condition: 'green' | 'yellow' | 'red'
  hourlyConditions?: string[]
  densityAltM?: number
  tempC?: number
}

export default function SkydivePanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as SkydiveData
  const cond = COND[d.condition]
  const safeUrl = d.website?.match(/^https?:\/\//) ? d.website : null
  const densityWarning = d.densityAltM !== undefined && d.altitudeM !== undefined
    ? d.densityAltM > d.altitudeM + 1000
    : false
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 17, color: '#FF4500', marginBottom: 4, lineHeight: 1.2 }}>
        {d.name}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 15, color: cond.color, marginBottom: 10 }}>
        {cond.label}
      </p>

      {/* Barre go/no-go horaire */}
      {d.hourlyConditions && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: '#2a4a6a', marginBottom: 6 }}>
            FENÊTRE DE SAUT — AUJOURD&apos;HUI
          </div>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            {Array.from({ length: 24 }, (_, h) => {
              if (h < 6 || h > 20) return null
              const condH = d.hourlyConditions![h]
              const color = condH === 'green' ? '#00FF88' : condH === 'yellow' ? '#FFB347' : '#FF6B35'
              const isNow = h === new Date().getHours()
              return (
                <div key={h} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{
                    width: isNow ? 10 : 8,
                    height: isNow ? 28 : 22,
                    borderRadius: 2,
                    background: color,
                    opacity: isNow ? 1 : 0.75,
                    border: isNow ? `1px solid ${color}` : 'none',
                    boxShadow: isNow ? `0 0 6px ${color}80` : 'none',
                  }} />
                  {(h % 3 === 0) && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#3a5a7a' }}>{h}h</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Row label="OACI" value={d.icao} />
      <Row label="ALT TERRAIN" value={`${d.altitudeM} m`} />
      <Row label="ALT LARGAGE" value={`${d.maxAltitudeM} m`} />
      <Row label="DENSITÉ ALTITUDE" value={d.densityAltM !== undefined ? `${d.densityAltM} m` : '?'} highlight={densityWarning} />
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

      {/* Section réglementaire */}
      {(() => {
        const ws = Math.round(d.windSurface)
        const levels = [
          { label: 'ÉTUDIANT (AFF)', limit: 25 },
          { label: 'A/B LICENCE', limit: 38 },
          { label: 'C/D LICENCE', limit: 55 },
        ]
        return (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #0d1826' }}>
            <div style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: '#2a4a6a', marginBottom: 6 }}>
              LIMITES PAR NIVEAU
            </div>
            {levels.map(({ label, limit }) => {
              const ok = ws <= limit
              return (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid #0d1826' }}>
                  <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 500, fontSize: 12, letterSpacing: '0.06em', color: '#4a6fa5' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: ok ? '#00FF88' : '#FF6B35', fontWeight: ok ? 400 : 700 }}>
                    {ok ? `✓ OK (< ${limit})` : `✗ ${ws} km/h`}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })()}

      <a
        href={`tel:${d.phone}`}
        style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4a6fa5', marginTop: 8, textDecoration: 'none' }}
      >
        {d.phone}
      </a>
      {safeUrl && (
        <a
          href={safeUrl}
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
