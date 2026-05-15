import type { GeoPoint } from '@/lib/types'
import { Row } from '@/components/ui/Row'

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
