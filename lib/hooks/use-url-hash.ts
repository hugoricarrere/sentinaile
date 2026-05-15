'use client'
import { useEffect, useRef } from 'react'
import { encodeUrlState } from '@/lib/url-state'

interface ViewState { longitude: number; latitude: number; zoom: number }

interface UseUrlHashOptions {
  viewState: ViewState
  enabledMap: Record<string, boolean>
  franceOnly: boolean
}

/**
 * Debounced URL hash writer — keeps the URL in sync with map state (500ms delay).
 * Call `decodeUrlState(window.location.hash)` once on mount to restore state from URL.
 *
 * Note: derives activeLayers directly from enabledMap keys to avoid importing LAYERS.
 */
export function useUrlHash({ viewState, enabledMap, franceOnly }: UseUrlHashOptions): void {
  const hashWriteRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (hashWriteRef.current) clearTimeout(hashWriteRef.current)
    hashWriteRef.current = setTimeout(() => {
      const activeLayers = Object.keys(enabledMap).filter(k => enabledMap[k])
      window.history.replaceState(null, '', encodeUrlState(viewState, activeLayers, franceOnly))
    }, 500)
    return () => {
      if (hashWriteRef.current) clearTimeout(hashWriteRef.current)
    }
  }, [viewState, enabledMap, franceOnly]) // eslint-disable-line react-hooks/exhaustive-deps
}
