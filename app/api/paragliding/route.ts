export const revalidate = 600 // 10 min ISR

import { createSportRoute } from '@/lib/create-sport-route'
import pgData from '@/data/paragliding-spots.json'
import { paraglideCondition, type ConditionStatus } from '@/lib/weather'
import { currentHourIndex } from '@/lib/time'

interface PGSpot {
  id: string; name: string; longitude: number; latitude: number
  country: string; type: string; level: string; windDirections: string[]; altitudeM: number
}

interface PGResult extends PGSpot {
  windKmh: number; gustKmh: number; tempC: number; radiation: number
  windDeg: number
  condition: ConditionStatus
  forecast: { hour: number; wind: number; gust: number }[]
  hourlyConditions: ConditionStatus[]
  blHeight: number
  liftedIndex: number
}

async function fetchParagliding(): Promise<PGResult[]> {
  const list = pgData as PGSpot[]
  const results = await Promise.allSettled(
    list.map(async (s) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.latitude}&longitude=${s.longitude}&hourly=windspeed_10m,windgusts_10m,winddirection_10m,temperature_2m,shortwave_radiation,weathercode,cape,boundary_layer_height,lifted_index&forecast_days=2&windspeed_unit=kmh&timezone=Europe/Paris`
      const res = await fetch(url, { next: { revalidate: 1800 } })
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
      const json: {
        hourly: {
          time: string[]
          windspeed_10m: number[]; windgusts_10m: number[]
          winddirection_10m: number[]
          temperature_2m: number[]; shortwave_radiation: number[]
          weathercode: number[]
          cape: number[]
          boundary_layer_height: number[]
          lifted_index: number[]
        }
      } = await res.json()
      const h = json.hourly
      const idx = currentHourIndex(h.time ?? [])
      const windKmh = h.windspeed_10m?.[idx] ?? 0
      const gustKmh = h.windgusts_10m?.[idx] ?? 0
      const windDeg = h.winddirection_10m?.[idx] ?? 0
      const tempC = h.temperature_2m?.[idx] ?? 15
      const radiation = h.shortwave_radiation?.[idx] ?? 200
      const cape = h.cape?.[idx] ?? 0
      const blHeight = h.boundary_layer_height?.[idx] ?? 1000
      const liftedIndex = h.lifted_index?.[idx] ?? 0
      // Check for storm: weathercode >= 95 in current hour + next 3h
      const windowEnd = Math.min(idx + 4, h.weathercode?.length ?? 0)
      const stormForecast = h.weathercode?.slice(idx, windowEnd).some(c => c >= 95) ?? false
      const condition = paraglideCondition(windKmh, gustKmh, tempC, radiation, stormForecast, cape, blHeight, liftedIndex)
      const forecast = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        wind: h.windspeed_10m?.[i] ?? 0,
        gust: h.windgusts_10m?.[i] ?? 0,
      }))

      // ── Hourly timeline (24h) ────────────────────────────────────────────
      const hourlyConditions = Array.from({ length: 24 }, (_, i) => {
        const w    = h.windspeed_10m?.[i]   ?? 0
        const g    = h.windgusts_10m?.[i]   ?? 0
        const t    = h.temperature_2m?.[i]  ?? 15
        const r    = h.shortwave_radiation?.[i] ?? 200
        const storm = (h.weathercode?.[i] ?? 0) >= 95
        const c    = h.cape?.[i]             ?? 0
        const bl   = h.boundary_layer_height?.[i] ?? 1000
        const li   = h.lifted_index?.[i]    ?? 0
        return paraglideCondition(w, g, t, r, storm, c, bl, li)
      }) as ConditionStatus[]

      return { ...s, windKmh, gustKmh, windDeg, tempC, radiation, condition, forecast, hourlyConditions, blHeight, liftedIndex }
    })
  )
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          ...list[i],
          windKmh: 0, gustKmh: 0, windDeg: 0, tempC: 15, radiation: 0,
          condition: 'yellow' as ConditionStatus,
          forecast: [],
          hourlyConditions: Array(24).fill('yellow') as ConditionStatus[],
          blHeight: 1000, liftedIndex: 0,
        }
  )
}

export const GET = createSportRoute('paragliding', fetchParagliding, 600_000)
