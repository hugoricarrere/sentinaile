'use client'
import { useState, useEffect, useCallback } from 'react'

/**
 * useState with automatic localStorage persistence.
 * SSR-safe: reads from localStorage only on client mount.
 * Uses a `hydrated` state flag to ensure we never save the default
 * value over a previously stored value.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(defaultValue)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) setState(JSON.parse(stored) as T)
    } catch {
      // ignore corrupted data
    }
    setHydrated(true)
  }, [key])

  // Persist on every change — only after hydration is complete
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // ignore quota errors
    }
  }, [key, state, hydrated])

  const set = useCallback((v: T | ((prev: T) => T)) => setState(v), [])

  return [state, set]
}
