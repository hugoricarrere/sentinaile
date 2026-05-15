export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // Rate limiting
  const ok = rateLimit(request, { windowMs: 60_000, max: 10 })
  if (!ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const harborCode = request.nextUrl.searchParams.get('harbor')
  if (!harborCode || !/^[A-Z]{2,10}$/.test(harborCode)) {
    return NextResponse.json({ error: 'Invalid harbor code' }, { status: 400 })
  }

  const cacheKey = `tides-${harborCode}`

  try {
    const { data } = await globalCache.get(cacheKey, async () => {
      const url = `https://services.data.shom.fr/oceano/meree/SPM?harborCode=${harborCode}&duration=48&step=60&lang=fr`
      const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000) })
      if (!res.ok) throw new Error(`SHOM ${res.status}`)
      const json = await res.json()
      // Parse into array of { time: string, heightM: number }
      const tides = Object.entries(json as Record<string, number>)
        .map(([time, heightM]) => ({ time, heightM }))
        .sort((a, b) => a.time.localeCompare(b.time))
      return tides
    }, 1_800_000) // 30min cache

    return NextResponse.json(
      { tides: data },
      { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } },
    )
  } catch {
    return NextResponse.json({ error: 'SHOM unavailable' }, { status: 502 })
  }
}
