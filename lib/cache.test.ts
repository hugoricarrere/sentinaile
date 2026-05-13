import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCache } from './cache'

describe('createCache', () => {
  beforeEach(() => { vi.useFakeTimers() })

  it('returns data on first fetch', async () => {
    const cache = createCache()
    const fetcher = vi.fn().mockResolvedValue({ count: 1 })
    const result = await cache.get('key', fetcher, 1000)
    expect(result.data).toEqual({ count: 1 })
    expect(result.stale).toBe(false)
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('returns cached data within TTL without re-fetching', async () => {
    const cache = createCache()
    const fetcher = vi.fn().mockResolvedValue({ count: 1 })
    await cache.get('key', fetcher, 5000)
    vi.advanceTimersByTime(3000)
    const result = await cache.get('key', fetcher, 5000)
    expect(fetcher).toHaveBeenCalledOnce()
    expect(result.stale).toBe(false)
  })

  it('re-fetches after TTL expires', async () => {
    const cache = createCache()
    const fetcher = vi.fn().mockResolvedValue({ count: 1 })
    await cache.get('key', fetcher, 1000)
    vi.advanceTimersByTime(1500)
    await cache.get('key', fetcher, 1000)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('returns stale data when fetcher throws', async () => {
    const cache = createCache()
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(new Error('network error'))
    await cache.get('key', fetcher, 1000)
    vi.advanceTimersByTime(1500)
    const result = await cache.get('key', fetcher, 1000)
    expect(result.data).toEqual({ count: 1 })
    expect(result.stale).toBe(true)
  })

  it('throws on first fetch failure with no cached data', async () => {
    const cache = createCache()
    const fetcher = vi.fn().mockRejectedValue(new Error('network error'))
    await expect(cache.get('key', fetcher, 1000)).rejects.toThrow('network error')
  })
})
