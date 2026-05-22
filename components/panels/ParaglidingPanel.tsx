import type { GeoPoint } from '@/lib/types'
import { parisHour } from '@/lib/time'
import { Row } from '@/components/ui/Row'
import { FlyForecast } from '@/components/FlyForecast'

const COND = {
  green:  { label: '🟢 ● Vol possible',         color: '#00FF88' },
  yellow: { label: '🟡 ▲ Conditions limites',   color: '#FFB347' },
  red:    { label: '🔴 ■ Vol déconseillé',      color: '#FF6B35' },
}

/** Convert bearing degrees to 8-point compass rose */
function bearingToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}

interface PGData {
  name: string; country: string; type: string; level: string
  altitudeM: number; windDirections: string[]
  windKmh: number; gustKmh: number; windDeg?: number; tempC: number
  condition: 'green' | 'yellow' | 'red'
  hourlyConditions?: string[]
  hourlyWindDirs?: number[]
  blHeight?: number
  liftedIndex?: number
  ffvlId?: number
}

/** Tiny SVG arrow pointing where wind blows TO (rotated by windDir degrees) */
function WindArrow({ deg, active }: { deg: number; active: boolean }) {
  return (
    <svg
      width={8} height={9} viewBox="0 0 8 9"
      style={{ display: 'block', transform: `rotate(${deg}deg)`, transformOrigin: '50% 50%' }}
    >
      <path
        d="M4 0.5 L6.5 7.5 L4 6 L1.5 7.5 Z"
        fill={active ? '#00D4FF' : '#2a4a6a'}
      />
    </svg>
  )
}

export default function ParaglidingPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as PGData
  const cond = COND[d.condition]
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 19, color: '#9B59B6', marginBottom: 4, lineHeight: 1.2 }}>
        {d.name}
      </p>
      <p aria-label={`Condition : ${cond.label}`} style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 16, color: cond.color, marginBottom: 10 }}>
        {cond.label}
      </p>

      {/* Barre go/no-go horaire */}
      {d.hourlyConditions && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 11, letterSpacing: '0.2em', color: '#2a4a6a', marginBottom: 6 }}>
            FENÊTRE DE VOL — AUJOURD&apos;HUI
          </div>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            {Array.from({ length: 24 }, (_, h) => {
              if (h < 6 || h > 20) return null
              const condH = d.hourlyConditions![h]
              const color = condH === 'green' ? '#00FF88' : condH === 'yellow' ? '#FFB347' : '#FF6B35'
              const isNow = h === parisHour()
              const showLabel = h % 3 === 0
              const windDir = d.hourlyWindDirs?.[h]
              return (
                <div key={h} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  {isNow && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#00D4FF', letterSpacing: 0 }}>▼</span>
                  )}
                  {windDir !== undefined && (
                    <WindArrow deg={windDir} active={isNow} />
                  )}
                  <div style={{
                    width: isNow ? 10 : 8,
                    height: isNow ? 28 : 22,
                    borderRadius: 2,
                    background: color,
                    opacity: isNow ? 1 : 0.75,
                    border: isNow ? `1px solid ${color}` : 'none',
                    boxShadow: isNow ? `0 0 6px ${color}80` : 'none',
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8,
                    color: isNow ? '#00D4FF' : showLabel ? '#3a5a7a' : 'transparent',
                    fontWeight: isNow ? 700 : 400,
                  }}>
                    {h}h
                  </span>
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
      <Row
        label="VENT ACTUEL"
        value={d.windDeg != null
          ? `${Math.round(d.windKmh)} km/h ${bearingToCompass(d.windDeg)} (${Math.round(d.windDeg)}°)`
          : `${Math.round(d.windKmh)} km/h`}
      />
      <Row label="RAFALES" value={`${Math.round(d.gustKmh)} km/h`} />
      <Row label="TEMP" value={`${Math.round(d.tempC)}°C`} />
      <Row label="COUCHE LIMITE" value={`${Math.round(d.blHeight ?? 0)} m`} />
      <Row label="LIFTED INDEX" value={`${d.liftedIndex?.toFixed(1) ?? '?'}`} />
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #0d1826' }}>
        <FlyForecast lat={point.latitude} lng={point.longitude} />
      </div>
      {/* SpotAiR deep link */}
      <a
        href={d.ffvlId
          ? `https://www.spotair.mobi/spotpg/ffvl/${d.ffvlId}`
          : `https://www.spotair.mobi/#14/${point.latitude.toFixed(4)}/${point.longitude.toFixed(4)}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          marginTop: 10,
          fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 13,
          letterSpacing: '0.1em', textDecoration: 'none',
          color: '#4a6fa5', border: '1px solid #1a2840',
          padding: '6px 0', borderRadius: 3,
          transition: 'border-color 0.15s, color 0.15s',
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        VOIR SUR SPOTAIR
      </a>
      {/* PushAlertButton: requires VAPID keys + persistent store — disabled until configured */}
    </div>
  )
}
