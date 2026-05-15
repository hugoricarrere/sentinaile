import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: Request): Promise<NextResponse> {
  if (!rateLimit(request, { windowMs: 60_000, max: 30 }))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Missing query parameter: q' }, { status: 400 })

  const cacheKey = `geocode:${q}`
  try {
    const { data } = await globalCache.get(
      cacheKey,
      async () => {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=fr`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'SentinAile/1.0 (contact@example.com)' },
        })
        if (!res.ok) throw new Error(`Nominatim ${res.status}`)
        return res.json() as Promise<unknown[]>
      },
      3_600_000,
    )
    return NextResponse.json({ data })
  } catch (e) {
    console.error(`[${cacheKey}] fetch error:`, e)
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
  }
}
