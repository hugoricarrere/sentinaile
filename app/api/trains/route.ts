import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import { rateLimit } from '@/lib/rate-limit'

async function fetchTrains() {
  const res = await fetch(
    'https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/regularite-mensuelle-tgv-aqst/records?limit=20&order_by=date%20DESC',
    { next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`SNCF HTTP ${res.status}`)
  const json: { results: Record<string, unknown>[] } = await res.json()
  return json.results ?? []
}

export async function GET(request: Request) {
  if (!rateLimit(request, { windowMs: 60_000, max: 60 }))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const { data, stale } = await globalCache.get('trains', fetchTrains, 120_000)
    return NextResponse.json({ data, stale })
  } catch {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
  }
}
