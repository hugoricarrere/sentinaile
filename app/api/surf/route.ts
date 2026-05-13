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
  const key = process.env.STORMGLASS_API_KEY

  if (!key) {
    return spots.map(s => ({
      ...s, score: 5, swellHeightM: 1.5, swellPeriodS: 10, windKmh: 15, windOffshore: true,
    }))
  }

  const now = new Date()
  const end = new Date(now.getTime() + 3_600_000)

  const results = await Promise.allSettled(
    spots.map(async (spot) => {
      const url = `https://api.stormglass.io/v2/weather/point?lat=${spot.latitude}&lng=${spot.longitude}&params=waveHeight,wavePeriod,windSpeed&start=${now.toISOString()}&end=${end.toISOString()}`
      const res = await fetch(url, { headers: { Authorization: key }, next: { revalidate: 0 } })
      if (!res.ok) throw new Error(`Stormglass ${res.status}`)
      const json: { hours: { waveHeight?: { noaa?: number }; wavePeriod?: { noaa?: number }; windSpeed?: { noaa?: number } }[] } = await res.json()
      const h = json.hours?.[0]
      const swellHeightM = h?.waveHeight?.noaa ?? 1.5
      const swellPeriodS = h?.wavePeriod?.noaa ?? 10
      const windKmh = (h?.windSpeed?.noaa ?? 5) * 3.6
      const windOffshore = windKmh < 20
      return { ...spot, swellHeightM, swellPeriodS, windKmh, windOffshore, score: surfScore(swellHeightM, swellPeriodS, windKmh, windOffshore) }
    })
  )

  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { ...spots[i], score: 5, swellHeightM: 0, swellPeriodS: 0, windKmh: 0, windOffshore: false }
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
