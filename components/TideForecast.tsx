'use client'
import { useEffect, useState } from 'react'

interface TidePoint { time: string; heightM: number }

export function TideForecast({ harborCode, color }: { harborCode: string; color: string }) {
  const [tides, setTides] = useState<TidePoint[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/tides?harbor=${encodeURIComponent(harborCode)}`)
      .then(r => r.json())
      .then((d: { tides?: TidePoint[] }) => { if (d.tides) setTides(d.tides); else setError(true) })
      .catch(() => setError(true))
  }, [harborCode])

  if (error) return null // silent fail
  if (!tides) return (
    <div style={{ height: 40, background: '#060c18', borderRadius: 3, marginTop: 8, animation: 'pulse 1.5s infinite' }} />
  )

  // Show next 12 hours as a mini tide chart
  const now = new Date()
  const next12 = tides.filter(t => {
    const d = new Date(t.time)
    return d >= now && d <= new Date(now.getTime() + 12 * 3600_000)
  }).slice(0, 12)

  if (next12.length === 0) return null

  const maxH = Math.max(...next12.map(t => t.heightM))
  const minH = Math.min(...next12.map(t => t.heightM))
  const range = maxH - minH || 1

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: '#2a4a6a', marginBottom: 4 }}>
        MARÉES — 12H
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
        {next12.map((t, i) => {
          const pct = (t.heightM - minH) / range
          const h = Math.round(4 + pct * 28)
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', height: h, background: color, opacity: 0.7, borderRadius: '2px 2px 0 0' }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#2a4a6a' }}>{minH.toFixed(1)}m</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#2a4a6a' }}>{maxH.toFixed(1)}m</span>
      </div>
    </div>
  )
}
