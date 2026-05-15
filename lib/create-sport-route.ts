/**
 * Factory that wraps the standard pattern shared by every sport API route:
 *   rateLimit → globalCache.get (L1) → unstable_cache (L2, persistent) → NextResponse.json
 *
 * Usage:
 *   export const GET = createSportRoute('skydive', fetchSkydive, 600_000)
 */
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { globalCache } from '@/lib/cache'
import { rateLimit } from '@/lib/rate-limit'

export function createSportRoute<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttlMs: number,
) {
  // L2: persistent across cold starts (filesystem cache on Vercel)
  const persistedFetch = unstable_cache(fetchFn, [cacheKey], {
    revalidate: ttlMs / 1000,
    tags: [cacheKey],
  })

  return async function GET(request: Request): Promise<NextResponse> {
    if (!rateLimit(request, { windowMs: 60_000, max: 60 }))
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
      const fetchWithTimeout = () =>
        Promise.race([
          persistedFetch(),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error('timeout')), 12_000),
          ),
        ])
      // L1: in-process LRU (sub-second for repeated requests within same instance)
      const { data, stale } = await globalCache.get(cacheKey, fetchWithTimeout, ttlMs)
      const ttlSec = Math.round(ttlMs / 1000)
      return NextResponse.json(
        { data, stale },
        { headers: { 'Cache-Control': `s-maxage=${ttlSec}, stale-while-revalidate=${ttlSec * 2}` } },
      )
    } catch (e) {
      console.error(`[${cacheKey}] fetch error:`, e)
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }
  }
}
