import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

interface ShipPoint {
  id: string
  name: string
  flag: string
  type: string
  longitude: number
  latitude: number
  speedKnots: number
  courseDeg: number
  destination: string
  eta: string
}

async function fetchShips(): Promise<ShipPoint[]> {
  // VT Explorer free demo endpoint
  const res = await fetch(
    'https://api.vtexplorer.com/vessels?userkey=demo&format=json&sat=1',
    { next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`Ships HTTP ${res.status}`)
  const raw: {
    mmsi: string; name?: string; flag?: string; type?: string
    lat?: number; lng?: number; speed?: number; course?: number
    destination?: string; eta?: string
  }[] = await res.json()
  return raw
    .filter(v => v.lat != null && v.lng != null)
    .map(v => ({
      id: v.mmsi,
      name: v.name || v.mmsi,
      flag: v.flag ?? '',
      type: v.type ?? 'cargo',
      longitude: v.lng!,
      latitude: v.lat!,
      speedKnots: v.speed ?? 0,
      courseDeg: v.course ?? 0,
      destination: v.destination ?? '',
      eta: v.eta ?? '',
    }))
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
