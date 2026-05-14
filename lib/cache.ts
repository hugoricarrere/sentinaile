interface CacheEntry<T> {
  data: T
  fetchedAt: number
  stale: boolean
}

export interface CacheResult<T> {
  data: T
  stale: boolean
}

export function createCache() {
  const store = new Map<string, CacheEntry<unknown>>()
  const maxSize: number = 50

  async function get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
  ): Promise<CacheResult<T>> {
    const entry = store.get(key) as CacheEntry<T> | undefined
    const now = Date.now()

    if (entry && now - entry.fetchedAt < ttlMs) {
      return { data: entry.data, stale: false }
    }

    try {
      const data = await fetcher()
      store.set(key, { data, fetchedAt: now, stale: false })
      if (store.size > maxSize) {
        const oldestKey = store.keys().next().value
        if (oldestKey) store.delete(oldestKey)
      }
      return { data, stale: false }
    } catch (err) {
      if (entry) {
        return { data: entry.data, stale: true }
      }
      throw err
    }
  }

  return { get }
}

export const globalCache = createCache()
