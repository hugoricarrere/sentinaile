'use client'
import DeckGL from '@deck.gl/react'
import Map from 'react-map-gl/mapbox'
import { FlyToInterpolator } from '@deck.gl/core'
import { useState, useMemo, useEffect } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import { useLayerData } from '@/lib/use-layer-data'
import type { GeoPoint } from '@/lib/types'
import type { LayerStates } from '@/lib/use-layer-data'
import type { AllFilters } from '@/lib/filters'
import { applyFilters } from '@/lib/filters'

export interface FlyToTarget {
  longitude: number
  latitude: number
  zoom?: number
}

interface Props {
  enabledMap: Record<string, boolean>
  onPointClick: (point: GeoPoint | null) => void
  onViewStateChange: (vs: { longitude: number; latitude: number; zoom: number }) => void
  onLayerStatesChange?: (states: LayerStates) => void
  filters: AllFilters
  flyTo?: FlyToTarget | null
}

const INITIAL_VIEW_STATE = {
  longitude: 2.3,
  latitude: 46.5,
  zoom: 5.5,
  pitch: 0,
  bearing: 0,
}

export default function MapCanvas({
  enabledMap,
  onPointClick,
  onViewStateChange,
  onLayerStatesChange,
  filters,
  flyTo,
}: Props) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
  const layerStates = useLayerData(LAYERS, enabledMap)

  // Propagate layer states up for TopBar/StatusBar
  useEffect(() => {
    onLayerStatesChange?.(layerStates)
  }, [layerStates, onLayerStatesChange])

  // Fly to external location (e.g. from search or point click)
  useEffect(() => {
    if (!flyTo) return
    setViewState(prev => ({
      ...prev,
      longitude: flyTo.longitude,
      latitude: flyTo.latitude,
      zoom: flyTo.zoom ?? Math.max(prev.zoom, 9),
      transitionDuration: 900,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.6 }),
    }))
  }, [flyTo])

  const deckLayers = useMemo(
    () =>
      LAYERS.filter(l => enabledMap[l.id]).flatMap(l => {
        const state = layerStates[l.id]
        const layers = l.getDeckLayer(
          applyFilters(state?.points ?? [], l.id, filters),
          onPointClick,
          viewState.zoom,
        )
        // Dim layer when data is stale (cached and not yet refreshed)
        if (state?.stale) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return layers.map((dl: any) => {
            if (!dl || typeof dl !== 'object' || typeof dl.clone !== 'function') return dl
            return dl.clone({ opacity: (dl.props?.opacity ?? 1) * 0.5 })
          })
        }
        return layers
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabledMap, layerStates, onPointClick, filters, viewState.zoom]
  )

  return (
    <DeckGL
      viewState={viewState}
      controller={true}
      layers={deckLayers}
      onViewStateChange={({ viewState: vs }) => {
        const next = vs as typeof INITIAL_VIEW_STATE
        setViewState(next)
        onViewStateChange({
          longitude: next.longitude,
          latitude: next.latitude,
          zoom: next.zoom,
        })
      }}
      onClick={({ object }) => {
        if (!object) onPointClick(null)
      }}
      style={{ position: 'absolute', inset: '0' }}
    >
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onLoad={({ target }) => target.setProjection({ name: 'mercator' })}
      />
    </DeckGL>
  )
}
