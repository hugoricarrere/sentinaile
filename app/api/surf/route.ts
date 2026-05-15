import { createSportRoute } from '@/lib/create-sport-route'
import surfSpotsData from '@/data/surf-spots.json'
import { surfScore } from '@/lib/weather'
import { currentHourIndex } from '@/lib/time'

interface SurfSpot {
  id: string; name: string; longitude: number; latitude: number
  country: string; level: string; breakType: string
  facingDeg?: number
}

interface SurfResult extends SurfSpot {
  score: number; swellHeightM: number; swellPeriodS: number
  windKmh: number; windOffshore: boolean; windDirDeg: number
  trend: 'up' | 'same' | 'down'
}

interface MarineHourly {
  time: string[]
  wave_height: number[]; wave_period: number[]
  swell_wave_height: number[]; swell_wave_period: number[]
  wind_speed_10m: number[]; wind_direction_10m: number[]
}

interface MarineEntry {
  hourly: MarineHourly
}

async function fetchSurf(): Promise<SurfResult[]> {
  const spots = surfSpotsData as SurfSpot[]

  const lats = spots.map(s => s.latitude).join(',')
  const lons = spots.map(s => s.longitude).join(',')

  const url = [
    'https://marine-api.open-meteo.com/v1/marine',
    `?latitude=${lats}&longitude=${lons}`,
    '&hourly=time,wave_height,wave_period,swell_wave_height,swell_wave_period,wind_speed_10m,wind_direction_10m',
    '&wind_speed_unit=kmh&timezone=Europe%2FParis&forecast_days=1',
  ].join('')

  let entries: Array<MarineEntry | null>

  try {
    const res = await fetch(url, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`Open-Meteo Marine ${res.status}`)

    const json: MarineEntry | MarineEntry[] = await res.json()
    // Open-Meteo returns a single object when there is only 1 coordinate pair,
    // and an array when there are multiple. Normalise to always be an array.
    const raw = Array.isArray(json) ? json : [json]
    entries = spots.map((_, i) => raw[i] ?? null)
  } catch {
    entries = spots.map(() => null)
  }

  return entries.map((entry, i) => {
    const spot = spots[i]

    if (entry === null) {
      return { ...spot, score: 0, swellHeightM: 0, swellPeriodS: 0, windKmh: 0, windDirDeg: 0, windOffshore: false, trend: 'same' as const }
    }

    const h = entry.hourly
    const idx = currentHourIndex(h.time ?? [])

    const swellHeightM = h.swell_wave_height?.[idx] ?? h.wave_height?.[idx] ?? 1.0
    const swellPeriodS = h.swell_wave_period?.[idx] ?? h.wave_period?.[idx] ?? 8
    const windKmh = h.wind_speed_10m?.[idx] ?? 10
    const windDirDeg = h.wind_direction_10m?.[idx] ?? 0
    const windOffshore = windKmh < 20
    const score = surfScore(swellHeightM, swellPeriodS, windKmh, windOffshore, windDirDeg, spot.facingDeg)

    // Trend: compare current score vs score 3h from now
    let trend: 'up' | 'same' | 'down' = 'same'
    const futureIdx = idx + 3
    if (futureIdx < h.time.length) {
      const futureSwellM = h.swell_wave_height?.[futureIdx] ?? h.wave_height?.[futureIdx] ?? 1.0
      const futurePeriodS = h.swell_wave_period?.[futureIdx] ?? h.wave_period?.[futureIdx] ?? 8
      const futureWindKmh = h.wind_speed_10m?.[futureIdx] ?? 10
      const futureWindDirDeg = h.wind_direction_10m?.[futureIdx] ?? 0
      const futureWindOffshore = futureWindKmh < 20
      const futureScore = surfScore(futureSwellM, futurePeriodS, futureWindKmh, futureWindOffshore, futureWindDirDeg, spot.facingDeg)
      const diff = futureScore - score
      if (diff > 0.5) trend = 'up'
      else if (diff < -0.5) trend = 'down'
    }

    return {
      ...spot,
      swellHeightM,
      swellPeriodS,
      windKmh,
      windDirDeg,
      windOffshore,
      score,
      trend,
    }
  })
}

export const GET = createSportRoute('surf', fetchSurf, 1_800_000)
