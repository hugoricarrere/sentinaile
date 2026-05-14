'use client'
import { useEffect, useState } from 'react'
import type { GeoPoint } from '@/lib/types'

// ── Layout constants ───────────────────────────────────────────────────────
const N          = 120      // 5 days × 24 h
const PX         = 8        // px per hour
const ML         = 46       // left margin  (Y-axis labels)
const MR         = 42       // right margin (secondary axis)
const CHART_W    = N * PX   // 960
const X0         = ML
const X1         = ML + CHART_W
const SVG_W      = ML + CHART_W + MR  // 1048

// Section Y bounds (top → bottom)
const CLD_Y0 = 2,  CLD_Y1 = 74   // cloud bands   72 px (3 × 24)
const SEP1   = 77
const TMP_Y0 = 82, TMP_Y1 = 172  // temperature   90 px
const SEP2   = 175
const WND_Y0 = 180, WND_Y1 = 230 // wind          50 px
const SEP3   = 233
const PRC_Y0 = 238, PRC_Y1 = 264 // precipitation 26 px
const XAX_Y  = 274               // x-axis labels
const SVG_H  = 285

// ── Helpers ────────────────────────────────────────────────────────────────
const hx = (i: number) => X0 + (i + 0.5) * PX  // centre of hour column

function vy(v: number, lo: number, hi: number, y0: number, y1: number) {
  return y1 - ((v - lo) / (hi - lo || 1)) * (y1 - y0)
}

function path(vals: number[], lo: number, hi: number, y0: number, y1: number): string {
  return vals.slice(0, N).map((v, i) =>
    `${i === 0 ? 'M' : 'L'}${hx(i).toFixed(1)},${vy(v, lo, hi, y0, y1).toFixed(1)}`
  ).join(' ')
}

function niceStep(range: number, n = 5) {
  const raw = range / n
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  return Math.ceil(raw / mag) * mag
}

function ticks(lo: number, hi: number, step: number): number[] {
  const out: number[] = []
  const start = Math.ceil(lo / step) * step
  for (let v = start; v <= hi + step * 0.01; v += step)
    out.push(Math.round(v * 10) / 10)
  return out
}

// ── WMO code → emoji ───────────────────────────────────────────────────────
function wmo(code: number) {
  if (code === 0)  return '☀️'
  if (code <= 2)   return '🌤️'
  if (code === 3)  return '☁️'
  if (code <= 48)  return '🌫️'
  if (code <= 55)  return '🌦️'
  if (code <= 67)  return '🌧️'
  if (code <= 77)  return '🌨️'
  if (code <= 82)  return '🌦️'
  if (code <= 94)  return '🌩️'
  return '⛈️'
}

const DAYS_FR   = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
const MONTHS_FR = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']
function fmtDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return { day: DAYS_FR[dt.getDay()], date: `${d} ${MONTHS_FR[m - 1]}` }
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Hourly {
  temperature_2m:   number[]
  precipitation:    number[]
  windspeed_10m:    number[]
  windspeed_700hPa: number[]   // ~3 000 m
  windspeed_600hPa: number[]   // ~4 000 m
  cloudcover_low:   number[]   // < 2 000 m  (stratus)
  cloudcover_mid:   number[]   // 2–6 000 m  (altocumulus)
  cloudcover_high:  number[]   // > 6 000 m  (cirrus)
  weathercode:      number[]
}
interface Daily {
  time:               string[]
  weathercode:        number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_sum:  number[]
  windspeed_10m_max:  number[]
}
interface Forecast { hourly: Hourly; daily: Daily }

// ── Layer meta ─────────────────────────────────────────────────────────────
const LAYER_META: Record<string, { color: string; icon: string }> = {
  skydive:     { color: '#FF4500', icon: '🪂' },
  paragliding: { color: '#9B59B6', icon: '🪂' },
  basejump:    { color: '#FF0080', icon: '🏔' },
}

// ── Legend item ────────────────────────────────────────────────────────────
function Leg({ color, label, rect }: { color: string; label: string; rect?: boolean }) {
  return (
    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
      <span style={{
        width: rect ? 10 : 14, height: rect ? 10 : 2,
        background: color, borderRadius: 1, display:'inline-block', flexShrink:0,
      }} />
      <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'#4a6fa5', letterSpacing:'0.03em' }}>
        {label}
      </span>
    </span>
  )
}

// ── Axis label (SVG text) ──────────────────────────────────────────────────
function ALabel({ x, y, v, anchor = 'end' }: { x:number; y:number; v:string; anchor?:'start'|'middle'|'end'|'inherit' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={9} fill="#3a5a7a" fontFamily="monospace">
      {v}
    </text>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function MeteogramOverlay({
  point, onClose,
}: { point: GeoPoint; onClose: () => void }) {
  const [fc,      setFc]      = useState<Forecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const meta      = LAYER_META[point.layerId] ?? { color: '#00D4FF', icon: '📍' }
  const name      = (point.data.name  as string) ?? ''
  const icao      = (point.data.icao  as string) ?? ''
  const showAlti  = point.layerId === 'skydive' || point.layerId === 'paragliding'
  const lat = (point.data.latitude  as number | undefined) ?? point.latitude
  const lon = (point.data.longitude as number | undefined) ?? point.longitude

  useEffect(() => {
    setLoading(true); setError(null); setFc(null)
    const p = new URLSearchParams({
      latitude:  lat.toString(),
      longitude: lon.toString(),
      hourly: [
        'temperature_2m','precipitation','windspeed_10m',
        'windspeed_700hPa','windspeed_600hPa',
        'cloudcover_low','cloudcover_mid','cloudcover_high','weathercode',
      ].join(','),
      daily:         'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max',
      forecast_days: '5',
      timezone:      'auto',
      windspeed_unit:'kmh',
    })
    fetch(`https://api.open-meteo.com/v1/forecast?${p}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setFc(data as Forecast); setLoading(false) })
      .catch(() => { setError('Météo indisponible'); setLoading(false) })
  }, [lat, lon])

  const h = fc?.hourly
  const d = fc?.daily

  // ── Derived scales ─────────────────────────────────────────────────────
  let minT = 0, maxT = 30
  let maxW = 80
  let maxP = 2
  let tPath = '', wSPath = '', w3Path = '', w4Path = ''
  let tempTickVals: number[] = []
  let windTickVals: number[] = []
  let precTickVals: number[] = []

  if (h) {
    const temps = h.temperature_2m.slice(0, N)
    minT = Math.floor(Math.min(...temps) - 1)
    maxT = Math.ceil(Math.max(...temps)  + 1)
    const tStep = niceStep(maxT - minT, 5)
    tempTickVals = ticks(minT, maxT, tStep)

    tPath  = path(temps,               minT, maxT, TMP_Y0, TMP_Y1)

    const w10  = h.windspeed_10m.slice(0, N)
    const w700 = h.windspeed_700hPa.slice(0, N)
    const w600 = h.windspeed_600hPa.slice(0, N)
    maxW = Math.max(...w10, ...w700, ...(showAlti ? w600 : []), 20)
    const wStep = niceStep(maxW, 4)
    windTickVals = ticks(0, maxW, wStep)

    wSPath = path(w10,  0, maxW, WND_Y0, WND_Y1)
    w3Path = path(w700, 0, maxW, WND_Y0, WND_Y1)
    if (showAlti) w4Path = path(w600, 0, maxW, WND_Y0, WND_Y1)

    const precips = h.precipitation.slice(0, N)
    maxP = Math.max(...precips, 0.5)
    const pStep = niceStep(maxP, 3)
    precTickVals = ticks(0, maxP, pStep).filter(v => v > 0)
  }

  return (
    <div className="meteogram-slide-up" style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'rgba(5, 9, 20, 0.97)',
      backdropFilter: 'blur(10px)',
      borderTop: `1px solid ${meta.color}50`,
      zIndex: 10, display: 'flex', flexDirection: 'column',
      maxHeight: 460, userSelect: 'none',
    }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:10,
        padding:'7px 14px 6px', borderBottom:'1px solid #0d1826', flexShrink:0 }}>
        <span style={{ fontSize:15 }}>{meta.icon}</span>
        <span style={{ fontFamily:'var(--font-rajdhani)', fontWeight:700, fontSize:13,
          letterSpacing:'0.1em', color:meta.color, textTransform:'uppercase',
          flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {name}
        </span>
        {icao && (
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#4a6fa5',
            background:'#0d1826', padding:'1px 6px', borderRadius:3,
            letterSpacing:'0.06em', flexShrink:0 }}>{icao}</span>
        )}
        <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'#2a4a6a', flexShrink:0 }}>
          {lat.toFixed(3)}°N&nbsp;{Math.abs(lon).toFixed(3)}°{lon >= 0 ? 'E' : 'O'}
        </span>
        <button onClick={onClose} style={{
          background:'none', border:'1px solid #1a2840', color:'#2a4a6a',
          width:20, height:20, borderRadius:3, cursor:'pointer', fontSize:13,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>×</button>
      </div>

      {/* ── States ───────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ padding:'18px', textAlign:'center',
          fontFamily:'var(--font-rajdhani)', fontSize:11,
          letterSpacing:'0.2em', color:'#2a4a6a' }}>CHARGEMENT MÉTÉO…</div>
      )}
      {error && (
        <div style={{ padding:'10px 14px',
          fontFamily:'var(--font-mono)', fontSize:11, color:'#FF4500' }}>{error}</div>
      )}

      {/* ── 5-day summary ────────────────────────────────────────────────── */}
      {d && (
        <div style={{ display:'flex', flexShrink:0, borderBottom:'1px solid #0d1826' }}>
          {d.time.map((iso, i) => {
            const { day, date } = fmtDay(iso)
            const prec = d.precipitation_sum[i]
            return (
              <div key={i} style={{
                flex:1, padding:'5px 3px',
                borderRight: i < 4 ? '1px solid #0d1826' : 'none',
                display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              }}>
                <span style={{ fontFamily:'var(--font-rajdhani)', fontWeight:600,
                  fontSize:9, letterSpacing:'0.12em', color:'#2a4a6a', textTransform:'uppercase' }}>
                  {day} {date}
                </span>
                <span style={{ fontSize:20, lineHeight:1 }}>{wmo(d.weathercode[i] ?? 0)}</span>
                <div style={{ display:'flex', gap:4, alignItems:'baseline' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'#e07030', fontWeight:600 }}>
                    {Math.round(d.temperature_2m_max[i])}°
                  </span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#3a5a80' }}>
                    {Math.round(d.temperature_2m_min[i])}°
                  </span>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'#3a7a7a' }}>
                    ↙{Math.round(d.windspeed_10m_max[i])}km/h
                  </span>
                  {prec > 0.1 && (
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'#4477cc' }}>
                      {prec.toFixed(1)}mm
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Legend row ───────────────────────────────────────────────────── */}
      {fc && (
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
          padding:'4px 14px', borderBottom:'1px solid #0d1826',
          background:'#030609', flexShrink:0 }}>
          <Leg color="#ff8844" label="Température (°C)" />
          <Leg color="#44aaff" label="Vent surface" />
          {showAlti && <Leg color="#44ffaa" label="Vent 3 000m" />}
          {showAlti && <Leg color="#ffcc44" label="Vent 4 000m" />}
          <span style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <Leg color="rgba(140,185,225,0.8)"  label="Cirrus (>6km)"       rect />
            <Leg color="rgba(80,120,165,0.85)"  label="Altocumulus (2-6km)" rect />
            <Leg color="rgba(40,65,105,0.9)"    label="Stratus (<2km)"      rect />
          </span>
        </div>
      )}

      {/* ── SVG Chart ────────────────────────────────────────────────────── */}
      {h && d && (
        <div style={{ flex:1, minHeight:0, overflow:'hidden' }}>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none"
            style={{ width:'100%', height:'100%', display:'block' }}>

            {/* ── Section backgrounds ── */}
            <rect x={X0} y={CLD_Y0} width={CHART_W} height={CLD_Y1 - CLD_Y0 + 1} fill="#07101c" />
            <rect x={X0} y={TMP_Y0} width={CHART_W} height={TMP_Y1 - TMP_Y0 + 1} fill="#060910" />
            <rect x={X0} y={WND_Y0} width={CHART_W} height={WND_Y1 - WND_Y0 + 1} fill="#060910" />
            <rect x={X0} y={PRC_Y0} width={CHART_W} height={PRC_Y1 - PRC_Y0 + 1} fill="#060910" />

            {/* ── Cloud bands (3 altitude layers per hour) ── */}
            {Array.from({ length: N }, (_, i) => {
              const x   = X0 + i * PX
              const bh  = (CLD_Y1 - CLD_Y0) / 3
              const lo  = (h.cloudcover_low[i]  ?? 0) / 100
              const mi  = (h.cloudcover_mid[i]  ?? 0) / 100
              const hi  = (h.cloudcover_high[i] ?? 0) / 100
              return (
                <g key={i}>
                  {/* High (cirrus) — top band */}
                  <rect x={x} y={CLD_Y0}         width={PX} height={bh}
                    fill={`rgba(140,185,225,${(hi * 0.8).toFixed(2)})`} />
                  {/* Mid (altocumulus) — middle band */}
                  <rect x={x} y={CLD_Y0 + bh}    width={PX} height={bh}
                    fill={`rgba(80,120,165,${(mi * 0.88).toFixed(2)})`} />
                  {/* Low (stratus) — bottom band */}
                  <rect x={x} y={CLD_Y0 + bh * 2} width={PX} height={bh}
                    fill={`rgba(40,65,105,${(lo * 0.92).toFixed(2)})`} />
                </g>
              )
            })}

            {/* Cloud section labels */}
            <ALabel x={X0 - 3} y={CLD_Y0 + 14}  v=">6km" />
            <ALabel x={X0 - 3} y={CLD_Y0 + 38}  v="2-6" />
            <ALabel x={X0 - 3} y={CLD_Y0 + 62}  v="<2km" />

            {/* Storm highlight */}
            {h.weathercode.slice(0, N).map((code, i) =>
              code < 95 ? null : (
                <rect key={i} x={X0 + i * PX} y={CLD_Y0}
                  width={PX} height={CLD_Y1 - CLD_Y0}
                  fill="rgba(255,80,0,0.14)" />
              )
            )}

            {/* ── Day separators (full chart height) ── */}
            {[1, 2, 3, 4].map(n => (
              <line key={n}
                x1={X0 + n * 24 * PX} y1={CLD_Y0}
                x2={X0 + n * 24 * PX} y2={XAX_Y}
                stroke="#1a2840" strokeWidth={0.8} strokeDasharray="3,4" />
            ))}

            {/* ── Section separators ── */}
            {[SEP1, SEP2, SEP3].map((y, i) => (
              <line key={i} x1={X0} y1={y} x2={X1} y2={y}
                stroke="#1a2840" strokeWidth={1} />
            ))}

            {/* ── Temperature — Y axis (left) ── */}
            <ALabel x={X0 - 3} y={TMP_Y0 - 3} v="°C" />
            {tempTickVals.map(t => {
              const y = vy(t, minT, maxT, TMP_Y0, TMP_Y1)
              if (y < TMP_Y0 || y > TMP_Y1) return null
              return (
                <g key={t}>
                  <line x1={X0} y1={y} x2={X1} y2={y}
                    stroke="#0d1826" strokeWidth={0.8} />
                  <ALabel x={X0 - 3} y={y + 3} v={`${t}°`} />
                </g>
              )
            })}
            {/* 0°C dashed line */}
            {minT < 0 && (() => {
              const y = vy(0, minT, maxT, TMP_Y0, TMP_Y1)
              return <line x1={X0} y1={y} x2={X1} y2={y}
                stroke="#2255aa" strokeWidth={0.8} strokeDasharray="6,3" />
            })()}
            {/* Fill under curve */}
            {tPath && (
              <path d={`${tPath} L${X1},${TMP_Y1} L${X0},${TMP_Y1} Z`}
                fill="#ff884412" />
            )}
            {/* Temp curve */}
            {tPath && <path d={tPath} fill="none" stroke="#ff8844" strokeWidth={2} />}

            {/* ── Wind — Y axis (right) ── */}
            <ALabel x={X1 + 3} y={WND_Y0 - 3} v="km/h" anchor="start" />
            {windTickVals.map(w => {
              const y = vy(w, 0, maxW, WND_Y0, WND_Y1)
              if (y < WND_Y0 || y > WND_Y1) return null
              return (
                <g key={w}>
                  <line x1={X0} y1={y} x2={X1} y2={y}
                    stroke="#0d1826" strokeWidth={0.8} />
                  <ALabel x={X1 + 3} y={y + 3} v={`${w}`} anchor="start" />
                </g>
              )
            })}
            {showAlti && w4Path && (
              <path d={w4Path} fill="none" stroke="#ffcc44" strokeWidth={1.2} opacity={0.75} />
            )}
            {showAlti && w3Path && (
              <path d={w3Path} fill="none" stroke="#44ffaa" strokeWidth={1.5} opacity={0.85} />
            )}
            {wSPath && <path d={wSPath} fill="none" stroke="#44aaff" strokeWidth={2} />}

            {/* ── Precipitation — Y axis (right) ── */}
            <ALabel x={X1 + 3} y={PRC_Y0 - 3} v="mm" anchor="start" />
            {precTickVals.map(p => {
              const y = PRC_Y1 - ((p / maxP) * (PRC_Y1 - PRC_Y0))
              if (y < PRC_Y0 || y > PRC_Y1) return null
              return (
                <g key={p}>
                  <line x1={X0} y1={y} x2={X1} y2={y}
                    stroke="#0d1826" strokeWidth={0.8} />
                  <ALabel x={X1 + 3} y={y + 3} v={`${p % 1 === 0 ? p : p.toFixed(1)}`} anchor="start" />
                </g>
              )
            })}
            {h.precipitation.slice(0, N).map((p, i) => {
              if (p < 0.01) return null
              const bh = Math.max(1.5, (p / maxP) * (PRC_Y1 - PRC_Y0))
              return (
                <rect key={i} x={X0 + i * PX} y={PRC_Y1 - bh}
                  width={PX - 1} height={bh} fill="#5599ffaa" />
              )
            })}

            {/* ── X axis: hour ticks + labels ── */}
            {Array.from({ length: N + 1 }, (_, i) => {
              const h24 = i % 24
              if (h24 !== 0 && h24 !== 6 && h24 !== 12 && h24 !== 18) return null
              const x = X0 + i * PX
              return (
                <g key={i}>
                  <line x1={x} y1={PRC_Y1} x2={x} y2={PRC_Y1 + 3}
                    stroke="#1a2840" strokeWidth={0.8} />
                  <text x={x} y={XAX_Y - 2} textAnchor="middle"
                    fontSize={8} fill="#2a4a6a" fontFamily="monospace">
                    {String(h24).padStart(2, '0')}h
                  </text>
                </g>
              )
            })}

            {/* Day names (centred) */}
            {d.time.map((iso, i) => {
              const { day } = fmtDay(iso)
              return (
                <text key={i} x={X0 + i * 24 * PX + 12 * PX}
                  y={XAX_Y + 9} textAnchor="middle"
                  fontSize={10} fill="#3a5a7a" fontFamily="monospace"
                  fontWeight="bold">
                  {day.toUpperCase()}
                </text>
              )
            })}

            {/* Chart border */}
            <rect x={X0} y={CLD_Y0} width={CHART_W} height={XAX_Y - CLD_Y0}
              fill="none" stroke="#0d1826" strokeWidth={1} />
          </svg>
        </div>
      )}
    </div>
  )
}
