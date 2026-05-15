/**
 * Factory that wraps the standard pattern shared by every sport API route:
 *   rateLimit → globalCache.get → NextResponse.json
 *
 * Usage:
 *   export const GET = createSportRoute('skydive', fetchSkydive, 600_000)
 */
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import { rateLimit } from '@/lib/rate-limit'

export function createSportRoute<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttlMs: number,
) {
  return async function GET(request: Request): Promise<NextResponse> {
    if (!rateLimit(request, { windowMs: 60_000, max: 60 }))
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    try {
      const { data, stale } = await globalCache.get(cacheKey, fetchFn, ttlMs)
      return NextResponse.json({ data, stale })
    } catch {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }
  }
}
