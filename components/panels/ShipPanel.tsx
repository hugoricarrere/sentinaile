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

interface ShipData {
  name: string; callSign: string; shipType: string
  speedKnots: number; courseDeg: number; headingDeg: number
  destination: string
}

export default function ShipPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as ShipData
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 17, color: '#00FF88', marginBottom: 4, lineHeight: 1.2 }}>
        {d.name}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 400, fontSize: 13, color: '#3a5a80', marginBottom: 10 }}>
        {d.shipType}
      </p>
      <Row label="MMSI"        value={point.id} />
      {d.callSign && <Row label="INDICATIF"  value={d.callSign} />}
      <Row label="VITESSE"     value={`${d.speedKnots.toFixed(1)} nœuds`} />
      <Row label="CAP"         value={`${Math.round(d.courseDeg)}°`} />
      <Row label="CAP PROUE"   value={`${Math.round(d.headingDeg)}°`} />
      {d.destination && <Row label="DESTINATION" value={d.destination} />}
    </div>
  )
}
