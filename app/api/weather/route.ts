import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

const CITIES = [
  { id: 'paris', name: 'Paris', lat: 48.85, lon: 2.35 },
  { id: 'london', name: 'London', lat: 51.51, lon: -0.13 },
  { id: 'madrid', name: 'Madrid', lat: 40.42, lon: -3.7 },
  { id: 'berlin', name: 'Berlin', lat: 52.52, lon: 13.4 },
  { id: 'rome', name: 'Rome', lat: 41.9, lon: 12.5 },
  { id: 'new-york', name: 'New York', lat: 40.71, lon: -74.01 },
  { id: 'tokyo', name: 'Tokyo', lat: 35.69, lon: 139.69 },
  { id: 'sydney', name: 'Sydney', lat: -33.87, lon: 151.21 },
  { id: 'dubai', name: 'Dubai', lat: 25.2, lon: 55.27 },
  { id: 'sao-paulo', name: 'São Paulo', lat: -23.55, lon: -46.63 },
  { id: 'cape-town', name: 'Cape Town', lat: -33.93, lon: 18.42 },
  { id: 'mumbai', name: 'Mumbai', lat: 19.08, lon: 72.88 },
  { id: 'toronto', name: 'Toronto', lat: 43.65, lon: -79.38 },
  { id: 'moscow', name: 'Moscow', lat: 55.75, lon: 37.62 },
  { id: 'beijing', name: 'Beijing', lat: 39.9, lon: 116.4 },
]

interface WeatherPoint {
  id: string; name: string; longitude: number; latitude: number
  tempC: number; windKmh: number; precipitation: number; weatherCode: number
}

async function fetchWeather(): Promise<WeatherPoint[]> {
  const lats = CITIES.map(c => c.lat).join(',')
  const lons = CITIES.map(c => c.lon).join(',')
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,windspeed_10m,precipitation,weathercode&windspeed_unit=kmh&timezone=auto`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  const json: { current: { temperature_2m: number; windspeed_10m: number; precipitation: number; weathercode: number } }[] = await res.json()
  const results = Array.isArray(json) ? json : [json]
  return CITIES.map((city, i) => ({
    id: city.id,
    name: city.name,
    longitude: city.lon,
    latitude: city.lat,
    tempC: results[i]?.current?.temperature_2m ?? 0,
    windKmh: results[i]?.current?.windspeed_10m ?? 0,
    precipitation: results[i]?.current?.precipitation ?? 0,
    weatherCode: results[i]?.current?.weathercode ?? 0,
  }))
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('weather', fetchWeather, 600_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
