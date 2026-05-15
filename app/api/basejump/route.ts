export const revalidate = 1800 // 30 min ISR

import { createSportRoute } from '@/lib/create-sport-route'
import exitsData from '@/data/basejump-exits.json'
import { basejumpCondition, type ConditionStatus } from '@/lib/weather'
import { currentHourIndex } from '@/lib/time'

interface Exit {
  id: string; name: string; longitude: number; latitude: number
  country: string; type: string; heightM: number
  openingAltitudeM: number; difficulty: string; legal: string
}

interface ExitResult extends Exit {
  windKmh: number; gustKmh: number; visibilityKm: number
  precipitation: boolean; ceilingM: number; condition: ConditionStatus
}

async function fetchBasejump(): Promise<ExitResult[]> {
  const list = exitsData as Exit[]
  const results = await Promise.allSettled(
    list.map(async (e) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${e.latitude}&longitude=${e.longitude}&hourly=time,windspeed_10m,windgusts_10m,visibility,precipitation,cloudcover_low,temperature_2m,dewpoint_2m&forecast_days=1&windspeed_unit=kmh&timezone=Europe/Paris`
      const res = await fetch(url, { next: { revalidate: 1800 } })
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
      const json: {
        hourly: {
          time: string[]
          windspeed_10m: number[]; windgusts_10m: number[]
          visibility: number[]; precipitation: number[]; cloudcover_low: number[]
          temperature_2m: number[]; dewpoint_2m: number[]
        }
      } = await res.json()
      const h = json.hourly
      const idx = currentHourIndex(h.time ?? [])
      const windKmh = h.windspeed_10m?.[idx] ?? 0
      const gustKmh = h.windgusts_10m?.[idx] ?? 0
      const visibilityKm = (h.visibility?.[idx] ?? 10000) / 1000
      const precipitation = (h.precipitation?.[idx] ?? 0) > 0
      // Formule standard aviation pour le plafond
      const tempC    = h.temperature_2m?.[idx] ?? 15
      const dewpoint = h.dewpoint_2m?.[idx] ?? (tempC - 10)
      const ceilingM = Math.max(50, Math.round((tempC - dewpoint) * 125))
      const condition = basejumpCondition(windKmh, gustKmh, visibilityKm, precipitation, ceilingM)
      return { ...e, windKmh, gustKmh, visibilityKm, precipitation, ceilingM, condition }
    })
  )
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { ...list[i], windKmh: 0, gustKmh: 0, visibilityKm: 10, precipitation: false, ceilingM: 1000, condition: 'red' as ConditionStatus }
  )
}

export const GET = createSportRoute('basejump', fetchBasejump, 600_000)
