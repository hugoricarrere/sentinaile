'use client'
import { useState, useEffect, useCallback } from 'react'
import type { GeoPoint, LayerDataState } from './types'
import type { LayerConfig } from './layers-registry'

export type LayerStates = Record<string, LayerDataState>

export function useLayerData(layers: LayerConfig[], enabledMap: Record<string, boolean>) {
  const [states, setStates] = useState<LayerStates>(() =>
    Object.fromEntries(
      layers.map(l => [l.id, { points: [], stale: false, lastUpdated: null, error: null }])
    )
  )

  const fetchLayer = useCallback(async (layer: LayerConfig) => {
    try {
      const res = await fetch(layer.apiRoute)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const stale: boolean = json.stale ?? false
      const rawData = json.data ?? json
      const points: GeoPoint[] = layer.transformResponse(rawData)
      setStates(prev => ({
        ...prev,
        [layer.id]: { points, stale, lastUpdated: Date.now(), error: null },
      }))
    } catch (err) {
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

  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = []
    for (const layer of layers) {
      if (!enabledMap[layer.id]) continue
      fetchLayer(layer)
      const id = setInterval(() => fetchLayer(layer), layer.pollIntervalMs)
      intervals.push(id)
    }
    return () => intervals.forEach(clearInterval)
  }, [layers, enabledMap, fetchLayer])

  return states
}
