import type { GeoPoint } from '@/lib/types'
import { Row } from '@/components/ui/Row'

interface ShipData {
  name: string; callSign: string; shipType: string; type_summary?: string
  speedKnots: number; courseDeg: number; headingDeg: number
  destination: string
}

const SHIP_TYPE_EMOJI: Record<string, string> = {
  Cargo: '🚢',
  Tanker: '🛢',
  Sailing: '⛵',
  Passenger: '🛳',
  Fishing: '🎣',
  Pleasure: '🚤',
}

function shipEmoji(typeSummary: string | undefined): string {
  if (!typeSummary) return '⚓'
  for (const [key, emoji] of Object.entries(SHIP_TYPE_EMOJI)) {
    if (typeSummary.includes(key)) return emoji
  }
  return '⚓'
}

export default function ShipPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as ShipData
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 17, color: '#00FF88', marginBottom: 4, lineHeight: 1.2 }}>
        {d.name}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 400, fontSize: 13, color: '#3a5a80', marginBottom: 6 }}>
        {d.shipType}
      </p>
      {(d.type_summary || d.shipType) && (
        <span style={{
          display: 'inline-block',
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 600,
          fontSize: 11,
          letterSpacing: '0.08em',
          color: '#00FF88',
          background: '#00FF8818',
          border: '1px solid #00FF8835',
          borderRadius: 3,
          padding: '2px 8px',
          marginBottom: 10,
        }}>
          {shipEmoji(d.type_summary ?? d.shipType)}&nbsp;{d.type_summary ?? d.shipType}
        </span>
      )}
      <Row label="MMSI"        value={point.id} />
      {d.callSign && <Row label="INDICATIF"  value={d.callSign} />}
      <Row label="VITESSE"     value={`${d.speedKnots.toFixed(1)} nœuds`} />
      <Row label="CAP"         value={`${Math.round(d.courseDeg)}°`} />
      <Row label="CAP PROUE"   value={`${Math.round(d.headingDeg)}°`} />
      {d.destination && <Row label="DESTINATION" value={d.destination} />}
    </div>
  )
}
