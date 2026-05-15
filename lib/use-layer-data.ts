'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { GeoPoint, LayerDataState } from './types'
import type { LayerConfig } from './layers'

export type LayerStates = Record<string, LayerDataState>

export function useLayerData(
  layers: LayerConfig[],
  enabledMap: Record<string, boolean>,
  /** Increment a layer's counter to trigger an immediate manual re-fetch */
  refreshKeys: Record<string, number> = {},
) {
  const [states, setStates] = useState<LayerStates>(() =>
    Object.fromEntries(
      layers.map(l => [l.id, { points: [], stale: false, lastUpdated: null, error: null }])
    )
  )

  // Track previously enabled layers to diff on each render
  const prevEnabledRef = useRef<Record<string, boolean>>({})
  // Track previous refresh keys to detect increments
  const prevRefreshKeysRef = useRef<Record<string, number>>({})

  const fetchLayer = useCallback(async (layer: LayerConfig, signal: AbortSignal) => {
    try {
      const res = await fetch(layer.apiRoute, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const stale: boolean = json.stale ?? false
      const rawData = json.data ?? json
      const allPoints: GeoPoint[] = layer.transformResponse(rawData)
      // Filter out points with invalid coordinates (NaN, out of bounds) to prevent map crashes
      const points = allPoints.filter(p =>
        isFinite(p.longitude) && isFinite(p.latitude) &&
        p.longitude >= -180 && p.longitude <= 180 &&
        p.latitude  >= -90  && p.latitude  <= 90
      )
      setStates(prev => ({
        ...prev,
        [layer.id]: { points, stale, lastUpdated: Date.now(), error: null },
      }))
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setStates(prev => ({
        ...prev,
        [layer.id]: {
          ...prev[layer.id],
          error: err instanceof Error ? err.message : 'Données indisponibles',
          stale: true,
        },
      }))
    }
  }, [])

  // Watch for manual refresh requests (incrementing a layer's refresh key)
  useEffect(() => {
    const prevKeys = prevRefreshKeysRef.current
    prevRefreshKeysRef.current = refreshKeys
    for (const [layerId, key] of Object.entries(refreshKeys)) {
      if (key > (prevKeys[layerId] ?? 0) && enabledMap[layerId]) {
        const layer = layers.find(l => l.id === layerId)
        if (!layer) continue
        // Clear error state before re-fetching so the spinner shows
        setStates(prev => ({
          ...prev,
          [layerId]: { ...prev[layerId], error: null, lastUpdated: null },
        }))
        const ctrl = new AbortController()
        void fetchLayer(layer, ctrl.signal)
      }
    }
  }, [refreshKeys, layers, enabledMap, fetchLayer]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controllers: AbortController[] = []
    const intervals: ReturnType<typeof setInterval>[] = []
    const prevEnabled = prevEnabledRef.current

    for (const layer of layers) {
      if (!enabledMap[layer.id]) continue
      // One AbortController shared between the immediate fetch and the interval
      const controller = new AbortController()
      controllers.push(controller)

      // Fire immediately when the layer just became enabled
      const justEnabled = !prevEnabled[layer.id]
      if (justEnabled) fetchLayer(layer, controller.signal)

      // Then refresh on the layer's poll interval
      const id = setInterval(() => fetchLayer(layer, controller.signal), layer.pollIntervalMs)
      intervals.push(id)
    }

    prevEnabledRef.current = { ...enabledMap }

    return () => {
      controllers.forEach(c => c.abort())
      intervals.forEach(clearInterval)
    }
  }, [layers, enabledMap, fetchLayer])

  return states
}
