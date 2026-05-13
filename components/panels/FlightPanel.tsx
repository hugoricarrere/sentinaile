import type { GeoPoint } from '@/lib/types'

interface FlightData {
  callsign: string
  origin: string
  altitudeM: number
  velocityMs: number
  headingDeg: number
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
    </div>
  )
}

export default function FlightPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as FlightData
  return (
    <div className="space-y-2">
      <p className="text-[#00D4FF] text-sm font-bold">
        {d.callsign || point.id.toUpperCase()}
      </p>
      <Row label="ICAO24" value={point.id} />
      <Row label="ORIGINE" value={d.origin} />
      <Row label="ALTITUDE" value={`${Math.round(d.altitudeM)} m`} />
      <Row label="VITESSE" value={`${Math.round(d.velocityMs * 3.6)} km/h`} />
      <Row label="CAP" value={`${Math.round(d.headingDeg)}°`} />
      <a
        href={`https://www.flightaware.com/live/flight/${d.callsign}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-3 text-center text-[10px] tracking-wider text-[#4a6fa5] border border-[#1a2840] py-1 hover:border-[#00D4FF] hover:text-[#00D4FF] transition-colors"
      >
        FLIGHTAWARE →
      </a>
    </div>
  )
}
