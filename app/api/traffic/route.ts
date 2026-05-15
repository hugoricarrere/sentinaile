import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import { rateLimit } from '@/lib/rate-limit'

async function fetchTraffic() {
  // BISON FUTÉ open data — return static placeholder if endpoint unavailable
  try {
    const res = await fetch('https://www.bison-fute.gouv.fr/api/weather/', {
      next: { revalidate: 0 },
    })
    if (!res.ok) return { level: 'green', label: 'Trafic normal' }
    return await res.json()
  } catch {
    return { level: 'green', label: 'Données indisponibles' }
  }
}

export async function GET(request: Request) {
  if (!rateLimit(request, { windowMs: 60_000, max: 60 }))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const { data, stale } = await globalCache.get('traffic', fetchTraffic, 300_000)
  return NextResponse.json({ data, stale })
}
