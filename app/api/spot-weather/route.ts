export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Ciel dégagé',
  1: 'Nuageux',
  2: 'Nuageux',
  3: 'Nuageux',
  45: 'Brouillard',
  48: 'Brouillard',
  51: 'Pluie',
  53: 'Pluie',
  55: 'Pluie',
  61: 'Pluie',
  63: 'Pluie',
  65: 'Pluie',
  71: 'Neige',
  73: 'Neige',
  75: 'Neige',
  77: 'Neige',
  80: 'Pluie',
  81: 'Pluie',
  82: 'Pluie',
  85: 'Neige',
  86: 'Neige',
  95: 'Orage',
  96: 'Orage',
  99: 'Orage',
}

function getDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? 'Variable'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')

  const lat = latParam !== null ? Number(latParam) : NaN
  const lng = lngParam !== null ? Number(lngParam) : NaN

  if (
    latParam === null ||
    lngParam === null ||
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { error: 'Paramètres lat/lng invalides' },
      { status: 400 }
    )
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code` +
    `&wind_speed_unit=kmh&timezone=Europe%2FParis`

  const cacheKey = `spot-weather-${lat.toFixed(2)}-${lng.toFixed(2)}`

  let current: Record<string, number>
  try {
    const { data } = await globalCache.get(cacheKey, async () => {
      const res = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(10_000) })
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
      const json = await res.json() as { current: Record<string, number> }
      return json.current
    }, 600_000) // 10 min
    current = data
  } catch {
    return NextResponse.json(
      { error: 'Impossible de contacter Open-Meteo' },
      { status: 502 }
    )
  }

  const windKmh = current.wind_speed_10m
  const windGustsKmh = current.wind_gusts_10m
  const windDir = current.wind_direction_10m
  const tempC = current.temperature_2m
  const weatherCode = current.weather_code

  return NextResponse.json(
    {
      windKmh,
      windGustsKmh,
      windDir,
      tempC,
      weatherCode,
      description: getDescription(weatherCode),
    },
    { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } },
  )
}
