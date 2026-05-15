import { createSportRoute } from '@/lib/create-sport-route'

interface AirPoint {
  id: string; name: string; longitude: number; latitude: number; aqi: number; parameter: string
}

async function fetchAir(): Promise<AirPoint[]> {
  const res = await fetch(
    'https://api.openaq.org/v3/locations?parameters_id=2&limit=300&order_by=lastUpdated&sort_order=desc',
    { next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`OpenAQ HTTP ${res.status}`)
  const json: {
    results: {
      id: number; name: string
      coordinates: { latitude: number; longitude: number }
      sensors?: { lastValue?: { value: number }; parameter?: { name: string } }[]
    }[]
  } = await res.json()
  return (json.results ?? [])
    .filter(r => r.coordinates?.longitude && r.coordinates?.latitude)
    .map(r => ({
      id: String(r.id),
      name: r.name,
      longitude: r.coordinates.longitude,
      latitude: r.coordinates.latitude,
      aqi: r.sensors?.[0]?.lastValue?.value ?? 0,
      parameter: r.sensors?.[0]?.parameter?.name ?? 'pm25',
    }))
}

export const GET = createSportRoute('air', fetchAir, 600_000)
