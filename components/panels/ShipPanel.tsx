import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
    </div>
  )
}

interface ShipData {
  name: string; flag: string; type: string
  speedKnots: number; courseDeg: number; destination: string; eta: string
}

export default function ShipPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as ShipData
  return (
    <div className="space-y-2">
      <p className="text-[#00FF88] text-sm font-bold">{d.name}</p>
      <Row label="MMSI" value={point.id} />
      <Row label="PAVILLON" value={d.flag || '—'} />
      <Row label="TYPE" value={d.type} />
      <Row label="VITESSE" value={`${d.speedKnots.toFixed(1)} nœuds`} />
      <Row label="CAP" value={`${Math.round(d.courseDeg)}°`} />
      {d.destination && <Row label="DESTINATION" value={d.destination} />}
      {d.eta && <Row label="ETA" value={d.eta} />}
    </div>
  )
}
