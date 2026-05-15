import { NextResponse } from 'next/server'
import { surfScore } from '@/lib/weather'
import { rateLimit } from '@/lib/rate-limit'
import { globalCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

interface DayForecast {
  date: string
  avgSwellM: number
  maxSwellM: number
  avgPeriodS: number
  avgWindKmh: number
  score: number
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function max(values: number[]): number {
  if (values.length === 0) return 0
  return Math.max(...values)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export async function GET(request: Request): Promise<NextResponse> {
  const ok = rateLimit(request, { windowMs: 60_000, max: 30 })
  if (!ok) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

  const { searchParams } = new URL(request.url)
  const latStr = searchParams.get('lat')
  const lngStr = searchParams.get('lng')

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: 'Missing lat or lng' }, { status: 400 })
  }

  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return NextResponse.json({ error: 'Invalid lat: must be between -90 and 90' }, { status: 400 })
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid lng: must be between -180 and 180' }, { status: 400 })
  }

  const cacheKey = `surf-forecast-${lat.toFixed(2)}-${lng.toFixed(2)}`

  let forecasts: DayForecast[]
  let bestDayIdx: number

  try {
    const { data } = await globalCache.get(cacheKey, async () => {
      const url = [
        'https://marine-api.open-meteo.com/v1/marine',
        `?latitude=${lat}&longitude=${lng}`,
        '&hourly=time,swell_wave_height,swell_wave_period,wind_speed_10m',
        '&wind_speed_unit=kmh&timezone=Europe%2FParis&forecast_days=7',
      ].join('')

      const res = await fetch(url, {
        signal: AbortSignal.timeout(12_000),
        next: { revalidate: 1800 },
      })
      if (!res.ok) throw new Error(`Marine API error ${res.status}`)

      const marineJson: {
        hourly: {
          time: string[]
          swell_wave_height: number[]
          swell_wave_period: number[]
          wind_speed_10m: number[]
        }
      } = await res.json()

      const { time, swell_wave_height, swell_wave_period, wind_speed_10m } = marineJson.hourly

      const today = new Date()
      const days: DayForecast[] = []

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate = addDays(today, dayOffset)
        const dateStr = formatDate(targetDate)

        const daySwells: number[] = []
        const dayPeriods: number[] = []
        const dayWinds: number[] = []

        for (let i = 0; i < time.length; i++) {
          const t = time[i]
          if (!t.startsWith(dateStr)) continue
          // Extract hour from "YYYY-MM-DDTHH:MM"
          const hourStr = t.slice(11, 13)
          const hour = parseInt(hourStr, 10)
          if (hour < 7 || hour > 20) continue

          const swell = swell_wave_height[i] ?? 0
          const period = swell_wave_period[i] ?? 0
          const wind = wind_speed_10m[i] ?? 0

          daySwells.push(swell)
          dayPeriods.push(period)
          dayWinds.push(wind)
        }

        const avgSwellM = parseFloat(avg(daySwells).toFixed(2))
        const maxSwellM = parseFloat(max(daySwells).toFixed(2))
        const avgPeriodS = parseFloat(avg(dayPeriods).toFixed(1))
        const avgWindKmh = parseFloat(avg(dayWinds).toFixed(1))
        const windOffshore = avgWindKmh < 20

        days.push({
          date: dateStr,
          avgSwellM,
          maxSwellM,
          avgPeriodS,
          avgWindKmh,
          score: surfScore(avgSwellM, avgPeriodS, avgWindKmh, windOffshore),
        })
      }

      return days
    }, 1_800_000)

    forecasts = data
  } catch {
    return NextResponse.json({ error: 'Marine API unavailable' }, { status: 502 })
  }

  bestDayIdx = 0
  for (let i = 1; i < forecasts.length; i++) {
    if (forecasts[i].score > forecasts[bestDayIdx].score) {
      bestDayIdx = i
    }
  }

  return NextResponse.json(
    { days: forecasts, bestDayIdx },
    { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } },
  )
}
