import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import exitsData from '@/data/basejump-exits.json'
import { basejumpCondition, type ConditionStatus } from '@/lib/weather'

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
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${e.latitude}&longitude=${e.longitude}&hourly=windspeed_10m,windgusts_10m,visibility,precipitation,cloudcover_low&forecast_days=1&windspeed_unit=kmh&timezone=auto`
      const res = await fetch(url, { next: { revalidate: 0 } })
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
      const json: {
        hourly: {
          windspeed_10m: number[]; windgusts_10m: number[]
          visibility: number[]; precipitation: number[]; cloudcover_low: number[]
        }
      } = await res.json()
      const h = json.hourly
      const idx = new Date().getHours()
      const windKmh = h.windspeed_10m?.[idx] ?? 0
      const gustKmh = h.windgusts_10m?.[idx] ?? 0
      const visibilityKm = (h.visibility?.[idx] ?? 10000) / 1000
      const precipitation = (h.precipitation?.[idx] ?? 0) > 0
      const ceilingM = (h.cloudcover_low?.[idx] ?? 0) > 50 ? 400 : 1000
      const condition = basejumpCondition(windKmh, gustKmh, visibilityKm, precipitation, ceilingM)
      return { ...e, windKmh, gustKmh, visibilityKm, precipitation, ceilingM, condition }
    })
  )
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { ...list[i], windKmh: 0, gustKmh: 0, visibilityKm: 10, precipitation: false, ceilingM: 1000, condition: 'green' as ConditionStatus }
  )
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('basejump', fetchBasejump, 600_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
