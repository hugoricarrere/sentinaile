export const revalidate = 600 // 10 min ISR

import { createSportRoute } from '@/lib/create-sport-route'
import dzData from '@/data/skydive-dz.json'
import { skydiveCondition, type ConditionStatus } from '@/lib/weather'
import { currentHourIndex } from '@/lib/time'

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
  hourlyConditions: ConditionStatus[]
  tempC: number
  densityAltM: number
}

async function fetchSkydive(): Promise<DZResult[]> {
  const dzList = dzData as DZ[]
  const results = await Promise.allSettled(
    dzList.map(async (dz) => {
      const params = new URLSearchParams({
        latitude:  dz.latitude.toString(),
        longitude: dz.longitude.toString(),
        hourly:    'windspeed_10m,windspeed_700hPa,windspeed_600hPa,visibility,precipitation,cloudcover_low,weathercode,cape,temperature_2m,surface_pressure',
        daily:     'sunrise,sunset',
        windspeed_unit: 'kmh',
        forecast_days: '1',
        timezone:  'Europe/Paris',
      })
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params}`,
        { next: { revalidate: 1800 } },
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
          cape:             number[]
          temperature_2m:   number[]
          surface_pressure: number[]
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
      const cape        = h.cape?.[idx] ?? 0
      const tempC       = h.temperature_2m?.[idx] ?? 15
      const pressureHPa = h.surface_pressure?.[idx] ?? 1013.25

      // ── Storm: check current hour + next 3 h ────────────────────────────
      const windowEnd = Math.min(idx + 4, 24)
      const hasStorm  = h.weathercode?.slice(idx, windowEnd).some(c => c >= 95) ?? false

      // ── Precipitation fraction over daylight hours ──────────────────────
      // Parse "2026-05-14T06:10" → heure entière. Défensive si daily manquant.
      const sunriseTimes = json.daily?.sunrise ?? []
      const sunsetTimes  = json.daily?.sunset  ?? []
      const sunriseHour = sunriseTimes.length > 0
        ? parseInt(sunriseTimes[0].split('T')[1]?.split(':')[0] ?? '6', 10)
        : 6
      const sunsetHour = sunsetTimes.length > 0
        ? parseInt(sunsetTimes[0].split('T')[1]?.split(':')[0] ?? '21', 10)
        : 21
      const daylightPrecip = h.precipitation?.slice(sunriseHour, sunsetHour + 1) ?? []
      const wetHours    = daylightPrecip.filter(p => p > 0.1).length
      const precipFraction = daylightHours(sunriseHour, sunsetHour) > 0
        ? wetHours / daylightHours(sunriseHour, sunsetHour)
        : 0

      // ── Density altitude calculation (ICAO formula) ─────────────────────
      const tempISA    = 15 - dz.altitudeM * 0.0065
      const pressureAltM = (1 - Math.pow(pressureHPa / 1013.25, 0.190284)) * 44330
      const densityAltM  = Math.round(pressureAltM + 120 * (tempC - tempISA))

      const condition = skydiveCondition(
        windSurface, wind4000, visibility, precipFraction, cloudcoverLow, hasStorm, cape,
      )

      // ── Hourly timeline (6h–21h) ─────────────────────────────────────────
      const hourlyConditions = Array.from({ length: 24 }, (_, i) => {
        const ws   = h.windspeed_10m?.[i]    ?? 0
        const w4   = h.windspeed_600hPa?.[i] ?? 0
        const vis  = (h.visibility?.[i] ?? 10000) / 1000
        const cld  = h.cloudcover_low?.[i]   ?? 0
        const storm = (h.weathercode?.[i] ?? 0) >= 95
        const c    = h.cape?.[i] ?? 0
        return skydiveCondition(ws, w4, vis, 0, cld, storm, c)
      }) as ConditionStatus[]

      return {
        ...dz,
        windSurface, wind3000, wind4000,
        visibility, precipFraction, cloudcoverLow, hasStorm,
        condition, hourlyConditions, tempC, densityAltM,
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
          hourlyConditions: Array(24).fill('red') as ConditionStatus[],
          tempC: 15, densityAltM: 0,
          cape: 0,
        }
  )
}

function daylightHours(sunrise: number, sunset: number): number {
  return Math.max(0, sunset - sunrise + 1)
}

export const GET = createSportRoute('skydive', fetchSkydive, 600_000)
