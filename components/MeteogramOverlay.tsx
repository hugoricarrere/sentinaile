'use client'
import { useEffect, useState } from 'react'
import type { GeoPoint } from '@/lib/types'

// ── WMO weather code → emoji ───────────────────────────────────────────────
function wmoEmoji(code: number): string {
  if (code === 0)           return '☀️'
  if (code <= 2)            return '🌤️'
  if (code === 3)           return '☁️'
  if (code <= 48)           return '🌫️'
  if (code <= 55)           return '🌦️'
  if (code <= 67)           return '🌧️'
  if (code <= 77)           return '🌨️'
  if (code <= 82)           return '🌦️'
  if (code <= 94)           return '🌩️'
  return '⛈️'
}

const DAYS_FR   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun',
                   'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']

function parseDay(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return { day: DAYS_FR[date.getDay()], date: `${d} ${MONTHS_FR[m - 1]}` }
}

// ── SVG path builder ───────────────────────────────────────────────────────
function buildPath(
  values: number[],
  n: number,
  minV: number,
  maxV: number,
  x0: number, x1: number,
  y0: number, y1: number,
): string {
  const xRange = x1 - x0
  const yRange = y1 - y0
  const vRange = maxV - minV || 1
  return values.slice(0, n).map((v, i) => {
    const x = x0 + (i / (n - 1)) * xRange
    const y = y1 - ((v - minV) / vRange) * yRange
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Hourly {
  temperature_2m:   number[]
  precipitation:    number[]
  windspeed_10m:    number[]
  windspeed_700hPa: number[]
  windspeed_500hPa: number[]
  cloudcover:       number[]
}
interface Daily {
  time:                 string[]
  weathercode:          number[]
  temperature_2m_max:   number[]
  temperature_2m_min:   number[]
  precipitation_sum:    number[]
  windspeed_10m_max:    number[]
}
interface Forecast { hourly: Hourly; daily: Daily }

// ── Legend chip ────────────────────────────────────────────────────────────
function Chip({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 14, height: 2, background: color, borderRadius: 1, display: 'inline-block' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4a6fa5', letterSpacing: '0.04em' }}>
        {label}
      </span>
    </span>
  )
}

// ── Layer meta ─────────────────────────────────────────────────────────────
const LAYER_META: Record<string, { color: string; icon: string }> = {
  skydive:    { color: '#FF4500', icon: '🪂' },
  paragliding:{ color: '#9B59B6', icon: '🪂' },
  basejump:   { color: '#FF0080', icon: '🏔' },
}

// ── Main component ─────────────────────────────────────────────────────────
export default function MeteogramOverlay({
  point,
  onClose,
}: {
  point: GeoPoint
  onClose: () => void
}) {
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const meta      = LAYER_META[point.layerId] ?? { color: '#00D4FF', icon: '📍' }
  const name      = (point.data.name as string) ?? ''
  const icao      = (point.data.icao as string) ?? ''
  const isSkydive = point.layerId === 'skydive'
  const showAlti  = isSkydive || point.layerId === 'paragliding'

  // Use original data coords (not jittered render coords)
  const lat = (point.data.latitude as number | undefined) ?? point.latitude
  const lon = (point.data.longitude as number | undefined) ?? point.longitude

  useEffect(() => {
    setLoading(true)
    setError(null)
    setForecast(null)
    const params = new URLSearchParams({
      latitude:  lat.toString(),
      longitude: lon.toString(),
      hourly:    'temperature_2m,precipitation,windspeed_10m,windspeed_700hPa,windspeed_500hPa,cloudcover',
      daily:     'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max',
      forecast_days: '5',
      timezone:  'auto',
      windspeed_unit: 'kmh',
    })
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setForecast(data as Forecast); setLoading(false) })
      .catch(() => { setError('Météo indisponible'); setLoading(false) })
  }, [lat, lon])

  // ── SVG chart constants ──────────────────────────────────────────────────
  const SVG_W = 1200
  const SVG_H = 140
  const N     = 120                // 5 days × 24 h

  let tempPath  = ''
  let cloudPath = ''
  let wSurfPath = ''
  let w3000Path = ''
  let w6000Path = ''
  let precipEls: React.ReactNode[] = []

  if (forecast) {
    const h = forecast.hourly
    const temps = h.temperature_2m.slice(0, N)
    const minT  = Math.floor(Math.min(...temps) - 1)
    const maxT  = Math.ceil(Math.max(...temps)  + 1)

    // Temperature: top band y 2→80
    tempPath = buildPath(temps, N, minT, maxT, 0, SVG_W, 2, 80)

    // Cloud cover: filled area beneath temp line (decorative)
    const cloudY = h.cloudcover.slice(0, N).map((c, i) => {
      const x = (i / N) * SVG_W
      const y = 2 + (1 - c / 100) * 78
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
    cloudPath = `${cloudY} L${SVG_W},80 L0,80 Z`

    // Wind: bottom band y 85→125
    const winds10  = h.windspeed_10m.slice(0, N)
    const winds700 = h.windspeed_700hPa.slice(0, N)
    const winds500 = h.windspeed_500hPa.slice(0, N)
    const allWinds = [...winds10, ...winds700, ...(isSkydive ? winds500 : [])]
    const maxWind  = Math.max(...allWinds, 20)

    wSurfPath = buildPath(winds10,  N, 0, maxWind, 0, SVG_W, 85, 125)
    w3000Path = buildPath(winds700, N, 0, maxWind, 0, SVG_W, 85, 125)
    if (isSkydive)
      w6000Path = buildPath(winds500, N, 0, maxWind, 0, SVG_W, 85, 125)

    // Precipitation bars: last 15px (y 125→140)
    const maxP = Math.max(...h.precipitation.slice(0, N), 0.1)
    precipEls = h.precipitation.slice(0, N).map((p, i) => {
      if (p < 0.01) return null
      const bw = SVG_W / N
      const bh = Math.max(2, (p / maxP) * 14)
      return (
        <rect key={i}
          x={(i * bw).toFixed(1)} y={(SVG_H - bh).toFixed(1)}
          width={(bw - 1).toFixed(1)} height={bh.toFixed(1)}
          fill="#5599ff88"
        />
      )
    })
  }

  const d = forecast?.daily

  return (
    <div
      className="meteogram-slide-up"
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        background: 'rgba(5, 9, 20, 0.97)',
        backdropFilter: 'blur(10px)',
        borderTop: `1px solid ${meta.color}50`,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 300,
        userSelect: 'none',
      }}
    >

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 14px 6px',
        borderBottom: `1px solid #0d1826`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>{meta.icon}</span>
        <span style={{
          fontFamily: 'var(--font-rajdhani)', fontWeight: 700,
          fontSize: 13, letterSpacing: '0.1em',
          color: meta.color, textTransform: 'uppercase', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
        {icao && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4a6fa5',
            background: '#0d1826', padding: '1px 6px', borderRadius: 3,
            letterSpacing: '0.06em', flexShrink: 0,
          }}>
            {icao}
          </span>
        )}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, color: '#2a4a6a',
          flexShrink: 0, letterSpacing: '0.03em',
        }}>
          {lat.toFixed(3)}°N&nbsp;{Math.abs(lon).toFixed(3)}°{lon >= 0 ? 'E' : 'O'}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: '1px solid #1a2840', color: '#2a4a6a',
            width: 20, height: 20, borderRadius: 3, cursor: 'pointer',
            fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* ── Loading / error ── */}
      {loading && (
        <div style={{
          padding: '18px', textAlign: 'center',
          fontFamily: 'var(--font-rajdhani)', fontSize: 11,
          letterSpacing: '0.2em', color: '#2a4a6a',
        }}>
          CHARGEMENT MÉTÉO…
        </div>
      )}
      {error && (
        <div style={{
          padding: '10px 14px',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: '#FF4500',
        }}>
          {error}
        </div>
      )}

      {/* ── 5-day summary cards ── */}
      {d && (
        <div style={{
          display: 'flex', flexShrink: 0,
          borderBottom: '1px solid #0d1826',
        }}>
          {d.time.map((iso, i) => {
            const { day, date } = parseDay(iso)
            const wmo  = d.weathercode[i] ?? 0
            const tMax = Math.round(d.temperature_2m_max[i])
            const tMin = Math.round(d.temperature_2m_min[i])
            const wind = Math.round(d.windspeed_10m_max[i])
            const prec = d.precipitation_sum[i]
            return (
              <div key={i} style={{
                flex: 1, padding: '5px 3px',
                borderRight: i < 4 ? '1px solid #0d1826' : 'none',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2,
              }}>
                <span style={{
                  fontFamily: 'var(--font-rajdhani)', fontWeight: 600,
                  fontSize: 9, letterSpacing: '0.12em',
                  color: '#2a4a6a', textTransform: 'uppercase',
                }}>
                  {day} {date}
                </span>
                <span style={{ fontSize: 20, lineHeight: 1 }}>
                  {wmoEmoji(wmo)}
                </span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#e07030', fontWeight: 600 }}>
                    {tMax}°
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#3a5a80' }}>
                    {tMin}°
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#3a7a7a' }}>
                    ↙{wind}
                  </span>
                  {prec > 0.1 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4477cc' }}>
                      {prec.toFixed(1)}mm
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Hourly SVG chart ── */}
      {forecast && (
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>

          {/* Legend */}
          <div style={{
            position: 'absolute', top: 4, left: 8,
            display: 'flex', gap: 10, zIndex: 1,
          }}>
            <Chip color="#ff8844" label="Temp" />
            <Chip color="#44aaff" label="Vent sol" />
            {showAlti && <Chip color="#44ffaa" label="3 000m" />}
            {isSkydive && <Chip color="#ffcc44" label="6 000m" />}
            <Chip color="#5599ff" label="Précip" />
          </div>

          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            {/* Day separator lines */}
            {[1, 2, 3, 4].map(n => (
              <line key={n}
                x1={n * 240} y1={0} x2={n * 240} y2={SVG_H}
                stroke="#1a2840" strokeWidth={1} strokeDasharray="3,5"
              />
            ))}

            {/* Divider between temp and wind bands */}
            <line x1={0} y1={82} x2={SVG_W} y2={82}
              stroke="#111c2e" strokeWidth={1} />

            {/* Cloud cover background (subtle) */}
            {cloudPath && (
              <path d={cloudPath} fill="#1a2840" opacity={0.35} />
            )}

            {/* Precipitation bars */}
            {precipEls}

            {/* Wind 6000m */}
            {isSkydive && w6000Path && (
              <path d={w6000Path} fill="none" stroke="#ffcc44"
                strokeWidth={1.2} opacity={0.7} />
            )}

            {/* Wind 3000m */}
            {showAlti && w3000Path && (
              <path d={w3000Path} fill="none" stroke="#44ffaa"
                strokeWidth={1.5} opacity={0.85} />
            )}

            {/* Wind surface */}
            {wSurfPath && (
              <path d={wSurfPath} fill="none" stroke="#44aaff"
                strokeWidth={1.8} opacity={0.9} />
            )}

            {/* Temperature filled area */}
            {tempPath && (
              <path
                d={`${tempPath} L${SVG_W},80 L0,80 Z`}
                fill="#ff884418"
              />
            )}

            {/* Temperature line */}
            {tempPath && (
              <path d={tempPath} fill="none" stroke="#ff8844" strokeWidth={2} />
            )}

            {/* Day labels */}
            {d && d.time.map((iso, i) => {
              const { day } = parseDay(iso)
              return (
                <text key={i}
                  x={i * 240 + 6} y={SVG_H - 3}
                  fontSize={13} fill="#1e3050"
                  fontFamily="monospace"
                >
                  {day.toUpperCase()}
                </text>
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}
