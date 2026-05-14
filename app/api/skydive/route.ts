import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import dzData from '@/data/skydive-dz.json'
import { skydiveCondition, type ConditionStatus } from '@/lib/weather'

interface DZ {
  id: string; name: string; longitude: number; latitude: number
  icao: string; altitudeM: number; radio: string; phone: string
  website: string; aircraft: string[]; maxAltitudeM: number
}

interface DZResult extends DZ {
  windSurface: number; wind3000: number; wind6000: number; visibility: number
  precipitation: boolean; condition: ConditionStatus
}

async function fetchSkydive(): Promise<DZResult[]> {
  const dzList = dzData as DZ[]
  const results = await Promise.allSettled(
    dzList.map(async (dz) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${dz.latitude}&longitude=${dz.longitude}&hourly=windspeed_10m,windspeed_700hPa,windspeed_500hPa,visibility,precipitation&windspeed_unit=kmh&forecast_days=1&timezone=auto`
      const res = await fetch(url, { next: { revalidate: 0 } })
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
      const json: {
        hourly: {
          windspeed_10m: number[]; windspeed_700hPa: number[]; windspeed_500hPa: number[]
          visibility: number[]; precipitation: number[]
        }
      } = await res.json()
      const h = json.hourly
      const idx = new Date().getHours()
      const windSurface = h.windspeed_10m?.[idx] ?? 0
      const wind3000 = h.windspeed_700hPa?.[idx] ?? 0
      const wind6000 = h.windspeed_500hPa?.[idx] ?? 0
      const visibility = (h.visibility?.[idx] ?? 10000) / 1000
      const precipitation = (h.precipitation?.[idx] ?? 0) > 0
      const condition = skydiveCondition(windSurface, wind3000, visibility, precipitation)
      return { ...dz, windSurface, wind3000, wind6000, visibility, precipitation, condition }
    })
  )
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { ...dzList[i], windSurface: 0, wind3000: 0, wind6000: 0, visibility: 10, precipitation: false, condition: 'green' as ConditionStatus }
  )
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
