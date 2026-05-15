import { createSportRoute } from '@/lib/create-sport-route'
import citiesData from '@/data/weather-cities.json'

const CITIES = citiesData as { id: string; name: string; lat: number; lon: number }[]

interface WeatherPoint {
  id: string; name: string; longitude: number; latitude: number
  tempC: number; windKmh: number; precipitation: number; weatherCode: number
}

async function fetchWeather(): Promise<WeatherPoint[]> {
  const lats = CITIES.map(c => c.lat).join(',')
  const lons = CITIES.map(c => c.lon).join(',')
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,windspeed_10m,precipitation,weathercode&windspeed_unit=kmh&timezone=Europe%2FParis`
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

export const GET = createSportRoute('weather', fetchWeather, 600_000)
