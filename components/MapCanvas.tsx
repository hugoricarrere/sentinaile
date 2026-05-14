'use client'
import DeckGL from '@deck.gl/react'
import Map from 'react-map-gl/mapbox'
import { useState, useMemo, useEffect } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import { useLayerData } from '@/lib/use-layer-data'
import type { GeoPoint } from '@/lib/types'
import type { LayerStates } from '@/lib/use-layer-data'
import type { AllFilters } from '@/lib/filters'
import { applyFilters } from '@/lib/filters'

interface Props {
  enabledMap: Record<string, boolean>
  onPointClick: (point: GeoPoint | null) => void
  onViewStateChange: (vs: { longitude: number; latitude: number; zoom: number }) => void
  onLayerStatesChange?: (states: LayerStates) => void
  filters: AllFilters
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
}: Props) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
  const layerStates = useLayerData(LAYERS, enabledMap)

  // Propagate layer states up for TopBar/StatusBar
  useEffect(() => {
    onLayerStatesChange?.(layerStates)
  }, [layerStates, onLayerStatesChange])

  const deckLayers = useMemo(
    () =>
      LAYERS.filter(l => enabledMap[l.id])
        .map(l => l.getDeckLayer(applyFilters(layerStates[l.id]?.points ?? [], l.id, filters), onPointClick))
        .filter((l): l is NonNullable<typeof l> => l !== null),
    [enabledMap, layerStates, onPointClick, filters]
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
