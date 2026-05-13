import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
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
    <div className="space-y-2">
      <p className="text-[#9B59B6] text-sm font-bold">{d.name}</p>
      <p className="text-[11px] font-bold" style={{ color: cond.color }}>{cond.label}</p>
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
