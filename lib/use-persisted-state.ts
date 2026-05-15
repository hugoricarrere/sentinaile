'use client'
import { useState, useEffect, useCallback } from 'react'

/**
 * Merge stored value with defaultValue:
 * - If both are plain objects → shallow-merge (stored wins, but missing keys come from default)
 * - Otherwise → return stored as-is if same type, else fall back to default
 */
function mergeWithDefault<T>(stored: unknown, defaultValue: T): T {
  if (
    stored !== null &&
    typeof stored === 'object' &&
    !Array.isArray(stored) &&
    typeof defaultValue === 'object' &&
    defaultValue !== null &&
    !Array.isArray(defaultValue)
  ) {
    return { ...defaultValue, ...(stored as object) } as T
  }
  if (typeof stored === typeof defaultValue) return stored as T
  return defaultValue
}

/**
 * useState with automatic localStorage persistence.
 * SSR-safe: reads from localStorage only on client mount.
 * Uses a `hydrated` state flag to ensure we never save the default
 * value over a previously stored value.
 * On hydration, shallow-merges stored objects with defaultValue so that
 * new keys added in later app versions are always present.
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
      if (stored !== null) {
        const parsed: unknown = JSON.parse(stored)
        setState(mergeWithDefault(parsed, defaultValue))
      }
    } catch {
      // ignore corrupted data
    }
    setHydrated(true)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

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
