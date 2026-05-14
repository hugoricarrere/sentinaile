import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import surfSpotsData from '@/data/surf-spots.json'
import { surfScore } from '@/lib/weather'

interface SurfSpot {
  id: string; name: string; longitude: number; latitude: number
  country: string; level: string; breakType: string
}

interface SurfResult extends SurfSpot {
  score: number; swellHeightM: number; swellPeriodS: number
  windKmh: number; windOffshore: boolean
}

async function fetchSurf(): Promise<SurfResult[]> {
  const spots = surfSpotsData as SurfSpot[]

  const results = await Promise.allSettled(
    spots.map(async (spot) => {
      const url = [
        'https://marine-api.open-meteo.com/v1/marine',
        `?latitude=${spot.latitude}&longitude=${spot.longitude}`,
        '&hourly=wave_height,wave_period,swell_wave_height,swell_wave_period,wind_speed_10m',
        '&wind_speed_unit=kmh&timezone=auto&forecast_days=1',
      ].join('')

      const res = await fetch(url, { next: { revalidate: 0 } })
      if (!res.ok) throw new Error(`Open-Meteo Marine ${res.status}`)

      const json: {
        hourly: {
          wave_height: number[]; wave_period: number[]
          swell_wave_height: number[]; swell_wave_period: number[]
          wind_speed_10m: number[]
        }
      } = await res.json()

      const h = json.hourly
      const idx = new Date().getHours()

      const swellHeightM = h.swell_wave_height?.[idx] ?? h.wave_height?.[idx] ?? 1.0
      const swellPeriodS = h.swell_wave_period?.[idx] ?? h.wave_period?.[idx] ?? 8
      const windKmh = h.wind_speed_10m?.[idx] ?? 10
      const windOffshore = windKmh < 20

      return {
        ...spot,
        swellHeightM,
        swellPeriodS,
        windKmh,
        windOffshore,
        score: surfScore(swellHeightM, swellPeriodS, windKmh, windOffshore),
      }
    })
  )

  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { ...spots[i], score: 0, swellHeightM: 0, swellPeriodS: 0, windKmh: 0, windOffshore: false }
  )
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('surf', fetchSurf, 1_800_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
