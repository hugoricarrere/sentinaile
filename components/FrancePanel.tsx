'use client'
import { useEffect, useState } from 'react'

interface TrainsData {
  data: { results: { taux_de_ponctualite?: number; axe?: string }[] }
}
interface TrafficData { level: string; label: string }

const TRAFFIC_COLOR: Record<string, string> = {
  green: '#00c87a',
  orange: '#cc8820',
  red: '#cc3a20',
  black: '#FF0080',
}

const Row = ({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #0d1826' }}>
    <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 500, fontSize: 13, letterSpacing: '0.06em', color: '#4a6fa5' }}>
      {label}
    </span>
    <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 13, color: valueColor ?? '#8aaccc' }}>
      {value}
    </span>
  </div>
)

export default function FrancePanel() {
  const [trains, setTrains] = useState<TrainsData | null>(null)
  const [traffic, setTraffic] = useState<TrafficData | null>(null)

  useEffect(() => {
    const load = () => {
      fetch('/api/trains').then(r => r.json()).then(setTrains).catch(() => null)
      fetch('/api/traffic').then(r => r.json()).then(j => setTraffic(j.data)).catch(() => null)
    }
    load()
    const id = setInterval(load, 120_000)
    return () => clearInterval(id)
  }, [])

  const avgPonct = trains?.data?.results?.length
    ? Math.round(
        trains.data.results.reduce((s, r) => s + (r.taux_de_ponctualite ?? 0), 0) /
          trains.data.results.length
      )
    : null

  return (
    <div className="panel-fade-in" style={{ borderTop: '1px solid #1a2840' }}>
      <div style={{
        padding: '10px 16px 8px',
        background: '#040810',
        borderBottom: '1px solid #111c2e',
        fontFamily: 'var(--font-rajdhani)',
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: '0.25em',
        color: '#cc8820',
        textTransform: 'uppercase',
      }}>
        🇫🇷&nbsp; France
      </div>

      <div style={{ padding: '4px 16px 8px' }}>
        {avgPonct !== null && (
          <Row
            label="Ponctualité TGV"
            value={`${avgPonct}%`}
            valueColor={avgPonct > 85 ? '#00c87a' : '#cc8820'}
          />
        )}
        {traffic && (
          <Row
            label="Trafic autoroutes"
            value={traffic.label}
            valueColor={TRAFFIC_COLOR[traffic.level] ?? '#00c87a'}
          />
        )}
      </div>
    </div>
  )
}
