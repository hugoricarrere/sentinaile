import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import dzData from '@/data/skydive-dz.json'
import { skydiveCondition, type ConditionStatus } from '@/lib/weather'

function currentHourIndex(times: string[]): number {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  // Build "YYYY-MM-DDTHH" prefix to match against the times array
  const prefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}`
  const idx = times.findIndex(t => t.startsWith(prefix))
  return idx >= 0 ? idx : now.getHours() // fallback to UTC hour if not found
}

interface DZ {
  id: string; name: string; longitude: number; latitude: number
  country: string; icao: string; altitudeM: number; radio: string; phone: string
  website: string; aircraft: string[]; maxAltitudeM: number
}

interface DZResult extends DZ {
  windSurface: number
  wind3000: number
  wind4000: number        // 600 hPa ≈ 4 300 m — altitude largage tandem
  visibility: number
  precipFraction: number  // fraction des heures de jour avec précipitation (0–1)
  cloudcoverLow: number   // couverture nuageuse basse < 2 000 m (%)
  hasStorm: boolean
  condition: ConditionStatus
}

async function fetchSkydive(): Promise<DZResult[]> {
  const dzList = dzData as DZ[]
  const results = await Promise.allSettled(
    dzList.map(async (dz) => {
      const params = new URLSearchParams({
        latitude:  dz.latitude.toString(),
        longitude: dz.longitude.toString(),
        hourly:    'windspeed_10m,windspeed_700hPa,windspeed_600hPa,visibility,precipitation,cloudcover_low,weathercode',
        daily:     'sunrise,sunset',
        windspeed_unit: 'kmh',
        forecast_days: '1',
        timezone:  'auto',
      })
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params}`,
        { next: { revalidate: 0 } },
      )
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)

      const json: {
        hourly: {
          time:             string[]
          windspeed_10m:    number[]
          windspeed_700hPa: number[]
          windspeed_600hPa: number[]
          visibility:       number[]
          precipitation:    number[]
          cloudcover_low:   number[]
          weathercode:      number[]
        }
        daily: {
          sunrise: string[]
          sunset:  string[]
        }
      } = await res.json()

      const h   = json.hourly
      const idx = currentHourIndex(h.time ?? [])

      // ── Wind / visibility at current hour ───────────────────────────────
      const windSurface = h.windspeed_10m?.[idx]    ?? 0
      const wind3000    = h.windspeed_700hPa?.[idx] ?? 0
      const wind4000    = h.windspeed_600hPa?.[idx] ?? 0
      const visibility  = (h.visibility?.[idx] ?? 10_000) / 1_000
      const cloudcoverLow = h.cloudcover_low?.[idx] ?? 0

      // ── Storm: check current hour + next 3 h ────────────────────────────
      const windowEnd = Math.min(idx + 4, 24)
      const hasStorm  = h.weathercode?.slice(idx, windowEnd).some(c => c >= 95) ?? false

      // ── Precipitation fraction over daylight hours ──────────────────────
      // Parse "2026-05-14T06:10" → hour as integer (local time, no Date parsing)
      const sunriseHour = parseInt(json.daily.sunrise[0]?.split('T')[1] ?? '06:00', 10)
      const sunsetHour  = parseInt(json.daily.sunset[0]?.split('T')[1]  ?? '21:00', 10)
      const daylightPrecip = h.precipitation?.slice(sunriseHour, sunsetHour + 1) ?? []
      const wetHours    = daylightPrecip.filter(p => p > 0.1).length
      const precipFraction = daylightHours(sunriseHour, sunsetHour) > 0
        ? wetHours / daylightHours(sunriseHour, sunsetHour)
        : 0

      const condition = skydiveCondition(
        windSurface, wind4000, visibility, precipFraction, cloudcoverLow, hasStorm,
      )

      return {
        ...dz,
        windSurface, wind3000, wind4000,
        visibility, precipFraction, cloudcoverLow, hasStorm,
        condition,
      }
    })
  )

  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          ...dzList[i],
          windSurface: 0, wind3000: 0, wind4000: 0,
          visibility: 10, precipFraction: 0, cloudcoverLow: 0, hasStorm: false,
          condition: 'red' as ConditionStatus,
        }
  )
}

function daylightHours(sunrise: number, sunset: number): number {
  return Math.max(0, sunset - sunrise + 1)
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('skydive', fetchSkydive, 600_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
