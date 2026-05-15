export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import { rateLimit } from '@/lib/rate-limit'
import { paraglideCondition } from '@/lib/weather'

interface DayFlyForecast {
  date: string
  condition: 'green' | 'yellow' | 'red'
  avgWindKmh: number
  maxGustKmh: number
  maxBLHeight: number
  minLiftedIndex: number
  maxCape: number
  flyingHours: number
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ok = rateLimit(request, { windowMs: 60_000, max: 10 })
  if (!ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const lat = request.nextUrl.searchParams.get('lat')
  const lng = request.nextUrl.searchParams.get('lng')
  if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
    return NextResponse.json({ error: 'Invalid lat/lng' }, { status: 400 })
  }

  const cacheKey = `fly-forecast-${parseFloat(lat).toFixed(2)}-${parseFloat(lng).toFixed(2)}`

  try {
    const { data } = await globalCache.get(cacheKey, async () => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_10m,wind_gusts_10m,temperature_2m,cape,boundary_layer_height,lifted_index,weather_code&wind_speed_unit=kmh&timezone=Europe%2FParis&forecast_days=7`
      const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000) })
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
      const json = await res.json() as {
        hourly: {
          time: string[]
          wind_speed_10m: number[]
          wind_gusts_10m: number[]
          temperature_2m: number[]
          cape: number[]
          boundary_layer_height: number[]
          lifted_index: number[]
          weather_code: number[]
        }
      }

      const h = json.hourly
      const days: DayFlyForecast[] = []

      for (let d = 0; d < 7; d++) {
        const dayStr = h.time.find(t => {
          const date = new Date(t)
          return date.getHours() === 12 && Math.floor(h.time.indexOf(t) / 24) === d
        })
        const date = dayStr ? dayStr.split('T')[0] : ''

        // Flying window: hours 8-18 of this day
        const flyingIndices = h.time.reduce<number[]>((acc, t, i) => {
          const hr = new Date(t).getHours()
          const dayIdx = Math.floor(i / 24)
          if (dayIdx === d && hr >= 8 && hr <= 18) acc.push(i)
          return acc
        }, [])

        if (flyingIndices.length === 0) continue

        let greenCount = 0, yellowCount = 0, redCount = 0
        let sumWind = 0, maxGust = 0, maxBL = 0, minLI = Infinity, maxCape = 0

        for (const i of flyingIndices) {
          const wind = h.wind_speed_10m[i] ?? 10
          const gust = h.wind_gusts_10m[i] ?? 15
          const temp = h.temperature_2m[i] ?? 15
          const cape = h.cape[i] ?? 0
          const bl = h.boundary_layer_height[i] ?? 1000
          const li = h.lifted_index[i] ?? 0
          const wc = h.weather_code[i] ?? 0

          sumWind += wind
          if (gust > maxGust) maxGust = gust
          if (bl > maxBL) maxBL = bl
          if (li < minLI) minLI = li
          if (cape > maxCape) maxCape = cape

          const cond = paraglideCondition(wind, gust, temp, 500, wc >= 95, cape, bl, li)
          if (cond === 'green') greenCount++
          else if (cond === 'yellow') yellowCount++
          else redCount++
        }

        const n = flyingIndices.length
        const condition: 'green' | 'yellow' | 'red' =
          redCount > n / 2 ? 'red' : yellowCount > greenCount ? 'yellow' : 'green'

        days.push({
          date,
          condition,
          avgWindKmh: Math.round(sumWind / n),
          maxGustKmh: Math.round(maxGust),
          maxBLHeight: Math.round(maxBL),
          minLiftedIndex: parseFloat(minLI.toFixed(1)),
          maxCape: Math.round(maxCape),
          flyingHours: greenCount + yellowCount,
        })
      }

      const bestDayIdx = days.reduce((best, d, i) => {
        if (d.condition === 'red') return best
        const score = d.flyingHours + (d.condition === 'green' ? 5 : 0)
        const bestScore = days[best].flyingHours + (days[best].condition === 'green' ? 5 : 0)
        return score > bestScore ? i : best
      }, 0)

      return { days, bestDayIdx }
    }, 1_800_000)

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' }
    })
  } catch {
    return NextResponse.json({ error: 'Forecast unavailable' }, { status: 502 })
  }
}
