import type { GeoPoint } from '@/lib/types'
import { Row } from '@/components/ui/Row'

interface FlightData {
  callsign: string
  origin: string
  altitudeM: number
  velocityMs: number
  headingDeg: number
}

export default function FlightPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as FlightData
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 17, color: '#00D4FF', marginBottom: 4, lineHeight: 1.2 }}>
        {d.callsign || point.id.toUpperCase()}
      </p>
      <Row label="ICAO24" value={point.id} />
      <Row label="ORIGINE" value={d.origin} />
      <Row label="ALTITUDE" value={`${Math.round(d.altitudeM)} m`} />
      <Row label="VITESSE" value={`${Math.round(d.velocityMs * 3.6)} km/h`} />
      <Row label="CAP" value={`${Math.round(d.headingDeg)}°`} />
      <a
        href={`https://www.flightaware.com/live/flight/${encodeURIComponent(d.callsign)}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block', textAlign: 'center', marginTop: 12,
          fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 13,
          letterSpacing: '0.1em', textDecoration: 'none',
          color: '#4a6fa5', border: '1px solid #1a2840',
          padding: '6px 0', borderRadius: 3,
          transition: 'border-color 0.15s, color 0.15s',
        }}
      >
        FLIGHTAWARE →
      </a>
    </div>
  )
}
