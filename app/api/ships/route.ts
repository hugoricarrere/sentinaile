import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

interface ShipPoint {
  id: string
  name: string
  callSign: string
  destination: string
  shipType: string
  longitude: number
  latitude: number
  speedKnots: number
  courseDeg: number
  headingDeg: number
}

// ITU ship type codes → human-readable
function shipTypeLabel(code: number): string {
  if (code >= 70 && code < 80) return 'Cargo'
  if (code >= 80 && code < 90) return 'Tanker'
  if (code >= 60 && code < 70) return 'Passenger'
  if (code >= 30 && code < 40) return 'Fishing'
  if (code >= 50 && code < 60) return 'Service'
  if (code >= 40 && code < 50) return 'High Speed'
  if (code >= 20 && code < 30) return 'WIG'
  if (code === 0)               return 'Unknown'
  return 'Other'
}

interface VesselMeta {
  mmsi: number; name?: string; callSign?: string
  destination?: string; shipType?: number
}

interface LocationFeature {
  mmsi: number
  geometry: { coordinates: [number, number] }
  properties: { sog?: number; cog?: number; heading?: number }
}

async function fetchShips(): Promise<ShipPoint[]> {
  // Digitraffic (Finnish Transport Infrastructure Agency) — free, no key
  // Requires Accept-Encoding: gzip; Node/undici decompresses automatically
  const headers = { 'Accept-Encoding': 'gzip', 'Digitraffic-User': 'sentinaile/1.0' }

  const [posRes, metaRes] = await Promise.all([
    fetch('https://meri.digitraffic.fi/api/ais/v1/locations?from=0', { headers, next: { revalidate: 0 } }),
    fetch('https://meri.digitraffic.fi/api/ais/v1/vessels',          { headers, next: { revalidate: 0 } }),
  ])

  if (!posRes.ok)  throw new Error(`Digitraffic positions ${posRes.status}`)
  if (!metaRes.ok) throw new Error(`Digitraffic vessels ${metaRes.status}`)

  const positions: { features: LocationFeature[] } = await posRes.json()
  const vessels: VesselMeta[] = await metaRes.json()

  const metaMap = new Map<number, VesselMeta>(vessels.map(v => [v.mmsi, v]))

  return positions.features
    .filter(f => f.geometry?.coordinates)
    .map(f => {
      const meta = metaMap.get(f.mmsi)
      const [lon, lat] = f.geometry.coordinates
      return {
        id:          String(f.mmsi),
        name:        meta?.name      ?? `MMSI ${f.mmsi}`,
        callSign:    meta?.callSign  ?? '',
        destination: meta?.destination?.trim() ?? '',
        shipType:    shipTypeLabel(meta?.shipType ?? 0),
        longitude:   lon,
        latitude:    lat,
        speedKnots:  f.properties.sog     ?? 0,
        courseDeg:   f.properties.cog     ?? 0,
        headingDeg:  f.properties.heading ?? 0,
      }
    })
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('ships', fetchShips, 60_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
