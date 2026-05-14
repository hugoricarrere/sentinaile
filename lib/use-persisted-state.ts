'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useState with automatic localStorage persistence.
 * SSR-safe: reads from localStorage only on client mount.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(defaultValue)
  const initialized = useRef(false)

  // Hydrate from localStorage on client mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) setState(JSON.parse(stored) as T)
    } catch {
      // ignore corrupted data
    }
  }, [key])

  // Persist on every change
  useEffect(() => {
    if (!initialized.current) return
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // ignore quota errors
    }
  }, [key, state])

  const set = useCallback((v: T | ((prev: T) => T)) => setState(v), [])

  return [state, set]
}
