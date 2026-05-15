/**
 * /api/meteogram — Proxy Open-Meteo 7-day hourly forecast for a single lat/lon.
 *
 * MeteogramOverlay fetches through this route instead of calling Open-Meteo directly:
 *   - Rate-limited per IP
 *   - Cached 10 min per coordinate pair (rounded to 2 decimal places)
 *   - 12 s server-side timeout
 *   - Hides the Open-Meteo origin from client network logs
 */
import { NextResponse } from 'next/server'
import { globalCache }  from '@/lib/cache'
import { rateLimit }    from '@/lib/rate-limit'

const HOURLY_VARS = [
  'temperature_2m', 'precipitation',
  'windspeed_10m', 'windgusts_10m',
  'windspeed_700hPa', 'windspeed_600hPa',
  'cloudcover_low', 'cloudcover_mid', 'cloudcover_high',
  'weathercode', 'visibility', 'cape',
  'boundary_layer_height', 'lifted_index', 'shortwave_radiation',
].join(',')

const DAILY_VARS =
  'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max'

export async function GET(request: Request): Promise<NextResponse> {
  if (!rateLimit(request, { windowMs: 60_000, max: 30 }))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = new URL(request.url)
  const rawLat = parseFloat(searchParams.get('lat') ?? '')
  const rawLon = parseFloat(searchParams.get('lon') ?? '')

  if (!isFinite(rawLat) || !isFinite(rawLon) ||
      rawLat < -90 || rawLat > 90 || rawLon < -180 || rawLon > 180) {
    return NextResponse.json({ error: 'Invalid lat/lon parameters' }, { status: 400 })
  }

  // Round to 2 decimal places (~1 km precision) for cache key stability
  const lat = rawLat.toFixed(2)
  const lon = rawLon.toFixed(2)
  const cacheKey = `meteogram:${lat},${lon}`

  try {
    const fetchFn = () =>
      Promise.race([
        (async () => {
          const params = new URLSearchParams({
            latitude:       lat,
            longitude:      lon,
            hourly:         HOURLY_VARS,
            daily:          DAILY_VARS,
            forecast_days:  '7',
            timezone:       'Europe/Paris',
            windspeed_unit: 'kmh',
          })
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
          if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
          return res.json()
        })(),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error('timeout')), 12_000),
        ),
      ])

    const { data, stale } = await globalCache.get(cacheKey, fetchFn, 10 * 60_000)
    return NextResponse.json({ data, stale })
  } catch (e) {
    console.error(`[meteogram] fetch error at ${lat},${lon}:`, e)
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
  }
}
