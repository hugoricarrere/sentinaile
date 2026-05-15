import { createSportRoute } from '@/lib/create-sport-route'

interface FlightPoint {
  id: string
  callsign: string
  origin: string
  longitude: number
  latitude: number
  altitudeM: number
  velocityMs: number
  headingDeg: number
  onGround: boolean
}

// OpenSky returns state vectors as arrays
// Index: [icao24, callsign, origin_country, time_pos, last_contact, lon, lat, baro_alt, on_ground, velocity, heading, vertical_rate, ...]
type OpenSkyState = [
  string,         // 0: icao24
  string,         // 1: callsign
  string,         // 2: origin_country
  number | null,  // 3: time_position
  number,         // 4: last_contact
  number | null,  // 5: longitude
  number | null,  // 6: latitude
  number | null,  // 7: baro_altitude
  boolean,        // 8: on_ground
  number | null,  // 9: velocity (m/s)
  number | null,  // 10: true_track (heading)
  ...unknown[]
]

async function fetchFlights(): Promise<FlightPoint[]> {
  const res = await fetch('https://opensky-network.org/api/states/all', {
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`)
  const raw: { states: OpenSkyState[] | null } = await res.json()
  if (!raw.states) return []
  return raw.states
    .filter(s => s[5] != null && s[6] != null && !s[8])
    .map(s => ({
      id: s[0],
      callsign: s[1]?.trim() || s[0],
      origin: s[2],
      longitude: s[5]!,
      latitude: s[6]!,
      altitudeM: s[7] ?? 0,
      velocityMs: s[9] ?? 0,
      headingDeg: s[10] ?? 0,
      onGround: s[8],
    }))
}

export const GET = createSportRoute('flights', fetchFlights, 30_000)
