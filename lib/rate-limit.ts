/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Keyed by IP (x-forwarded-for or x-real-ip headers).
 *
 * Usage:
 *   const ok = rateLimit(request, { windowMs: 60_000, max: 30 })
 *   if (!ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

// Purge expired windows every 5 minutes to avoid unbounded growth
setInterval(() => {
  const now = Date.now()
  for (const [key, w] of store) {
    if (w.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1_000)

interface Options {
  /** Size of the sliding window in milliseconds. Default: 60 000 (1 min). */
  windowMs?: number
  /** Maximum number of requests per window per IP. Default: 60. */
  max?: number
}

/**
 * Returns `true` when the request is within the rate limit,
 * `false` when the limit has been exceeded (caller should return 429).
 */
export function rateLimit(
  request: Request,
  { windowMs = 60_000, max = 60 }: Options = {},
): boolean {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const now = Date.now()
  let w = store.get(ip)

  if (!w || w.resetAt < now) {
    w = { count: 1, resetAt: now + windowMs }
    store.set(ip, w)
    return true
  }

  w.count++
  return w.count <= max
}
