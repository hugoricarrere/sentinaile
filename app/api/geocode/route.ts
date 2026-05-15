import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { globalCache } from '@/lib/cache'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** L2: persistent Next.js cache — survives cold starts, shared across instances */
function makeCachedGeocoder(q: string) {
  return unstable_cache(
    async () => {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=fr`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SentinAile/1.0 (contact@example.com)' },
        next: { revalidate: 3600 },
      })
      if (!res.ok) throw new Error(`Nominatim ${res.status}`)
      return res.json() as Promise<unknown[]>
    },
    [`geocode-${q}`],
    { revalidate: 3600, tags: ['geocode'] },
  )
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!rateLimit(request, { windowMs: 60_000, max: 30 }))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Missing query parameter: q' }, { status: 400 })

  const cacheKey = `geocode:${q}`
  try {
    // L1: in-process LRU (sub-ms)
    const { data } = await globalCache.get(
      cacheKey,
      makeCachedGeocoder(q), // L2: persistent Next.js cache (1h)
      3_600_000,
    )
    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (e) {
    console.error(`[${cacheKey}] fetch error:`, e)
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
  }
}
