interface CacheEntry<T> {
  data: T
  fetchedAt: number
  lastAccessedAt: number
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
      // Met à jour l'horodatage d'accès pour l'éviction LRU
      entry.lastAccessedAt = now
      return { data: entry.data, stale: false }
    }

    try {
      const data = await fetcher()
      store.set(key, { data, fetchedAt: now, lastAccessedAt: now, stale: false })

      // Éviction LRU : supprime l'entrée la moins récemment accédée
      if (store.size > maxSize) {
        let lruKey: string | undefined
        let lruTime = Infinity
        for (const [k, v] of store.entries()) {
          if (v.lastAccessedAt < lruTime) {
            lruTime = v.lastAccessedAt
            lruKey = k
          }
        }
        if (lruKey) store.delete(lruKey)
      }

      return { data, stale: false }
    } catch (err) {
      if (entry) {
        entry.lastAccessedAt = now
        return { data: entry.data, stale: true }
      }
      throw err
    }
  }

  return { get }
}

export const globalCache = createCache()
