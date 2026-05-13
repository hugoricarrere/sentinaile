// TEMPLATE — Copy this file to app/api/<name>/route.ts to add a new data source.
// Replace: CACHE_KEY, EXTERNAL_URL, TTL_MS, and the transform function.
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

const CACHE_KEY = 'template'
const TTL_MS = 30_000 // adjust per source refresh rate

async function fetchData(): Promise<unknown[]> {
  const EXTERNAL_URL = 'https://example.com/api/data'
  const res = await fetch(EXTERNAL_URL, {
    // next: { revalidate: 0 } disables Next.js fetch cache — we use our own
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${EXTERNAL_URL}`)
  const raw: unknown = await res.json()
  // Transform raw API response → clean domain shape here
  // Return an array of domain objects
  return raw as unknown[]
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get(CACHE_KEY, fetchData, TTL_MS)
    return NextResponse.json({ data, stale })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
