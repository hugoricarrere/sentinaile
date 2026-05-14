import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import pgData from '@/data/paragliding-spots.json'
import { paraglideCondition, type ConditionStatus } from '@/lib/weather'

function currentHourIndex(times: string[]): number {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  // Build "YYYY-MM-DDTHH" prefix to match against the times array
  const prefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}`
  const idx = times.findIndex(t => t.startsWith(prefix))
  return idx >= 0 ? idx : now.getHours() // fallback to UTC hour if not found
}

interface PGSpot {
  id: string; name: string; longitude: number; latitude: number
  country: string; type: string; level: string; windDirections: string[]; altitudeM: number
}

interface PGResult extends PGSpot {
  windKmh: number; gustKmh: number; tempC: number; radiation: number
  condition: ConditionStatus
  forecast: { hour: number; wind: number; gust: number }[]
}

async function fetchParagliding(): Promise<PGResult[]> {
  const list = pgData as PGSpot[]
  const results = await Promise.allSettled(
    list.map(async (s) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.latitude}&longitude=${s.longitude}&hourly=windspeed_10m,windgusts_10m,temperature_2m,shortwave_radiation,weathercode&forecast_days=2&windspeed_unit=kmh&timezone=auto`
      const res = await fetch(url, { next: { revalidate: 0 } })
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
      const json: {
        hourly: {
          time: string[]
          windspeed_10m: number[]; windgusts_10m: number[]
          temperature_2m: number[]; shortwave_radiation: number[]
          weathercode: number[]
        }
      } = await res.json()
      const h = json.hourly
      const idx = currentHourIndex(h.time ?? [])
      const windKmh = h.windspeed_10m?.[idx] ?? 0
      const gustKmh = h.windgusts_10m?.[idx] ?? 0
      const tempC = h.temperature_2m?.[idx] ?? 15
      const radiation = h.shortwave_radiation?.[idx] ?? 200
      // Check for storm: weathercode >= 95 in current hour + next 3h
      const windowEnd = Math.min(idx + 4, h.weathercode?.length ?? 0)
      const stormForecast = h.weathercode?.slice(idx, windowEnd).some(c => c >= 95) ?? false
      const condition = paraglideCondition(windKmh, gustKmh, tempC, radiation, stormForecast)
      const forecast = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        wind: h.windspeed_10m?.[i] ?? 0,
        gust: h.windgusts_10m?.[i] ?? 0,
      }))
      return { ...s, windKmh, gustKmh, tempC, radiation, condition, forecast }
    })
  )
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { ...list[i], windKmh: 0, gustKmh: 0, tempC: 15, radiation: 0, condition: 'yellow' as ConditionStatus, forecast: [] }
  )
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('paragliding', fetchParagliding, 600_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
