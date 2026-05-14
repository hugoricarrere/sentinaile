import type { GeoPoint } from '@/lib/types'
import { parisHour } from '@/lib/time'

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
  hourlyConditions?: string[]
  blHeight?: number
  liftedIndex?: number
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

      {/* Barre go/no-go horaire */}
      {d.hourlyConditions && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: '#2a4a6a', marginBottom: 6 }}>
            FENÊTRE DE VOL — AUJOURD&apos;HUI
          </div>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            {Array.from({ length: 24 }, (_, h) => {
              if (h < 6 || h > 20) return null
              const condH = d.hourlyConditions![h]
              const color = condH === 'green' ? '#00FF88' : condH === 'yellow' ? '#FFB347' : '#FF6B35'
              const isNow = h === parisHour()
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

      <Row label="PAYS" value={d.country} />
      <Row label="TYPE" value={d.type} />
      <Row label="NIVEAU" value={d.level} />
      <Row label="ALTITUDE DÉCO" value={`${d.altitudeM} m`} />
      <Row label="VENT FAVORABLE" value={d.windDirections.join(', ')} />
      <Row label="VENT ACTUEL" value={`${Math.round(d.windKmh)} km/h`} />
      <Row label="RAFALES" value={`${Math.round(d.gustKmh)} km/h`} />
      <Row label="TEMP" value={`${Math.round(d.tempC)}°C`} />
      <Row label="COUCHE LIMITE" value={`${Math.round(d.blHeight ?? 0)} m`} />
      <Row label="LIFTED INDEX" value={`${d.liftedIndex?.toFixed(1) ?? '?'}`} />
    </div>
  )
}
