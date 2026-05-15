'use client'
import DeckGL from '@deck.gl/react'
import Map from 'react-map-gl/mapbox'
import { FlyToInterpolator } from '@deck.gl/core'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import type mapboxgl from 'mapbox-gl'
import { LAYERS } from '@/lib/layers'
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
  refreshKeys?: Record<string, number>
  onMapLoad?: () => void
  mapStyle?: string
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
  refreshKeys = {},
  onMapLoad,
  mapStyle = 'mapbox://styles/mapbox/dark-v11',
}: Props) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
  const [terrain3d, setTerrain3d] = useState(false)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const deckRef = useRef<HTMLDivElement>(null)
  const layerStates = useLayerData(LAYERS, enabledMap, refreshKeys)

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

  // Keyboard navigation: arrow keys pan, +/= zoom in, - zoom out
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const PAN = 0.05 * Math.pow(2, 5 - viewState.zoom) // adaptive to zoom level
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); setViewState(v => ({ ...v, longitude: v.longitude - PAN })); break
      case 'ArrowRight': e.preventDefault(); setViewState(v => ({ ...v, longitude: v.longitude + PAN })); break
      case 'ArrowUp':    e.preventDefault(); setViewState(v => ({ ...v, latitude:  Math.min(85, v.latitude  + PAN) })); break
      case 'ArrowDown':  e.preventDefault(); setViewState(v => ({ ...v, latitude:  Math.max(-85, v.latitude - PAN) })); break
      case '+': case '=': e.preventDefault(); setViewState(v => ({ ...v, zoom: Math.min(20, v.zoom + 0.5) })); break
      case '-':           e.preventDefault(); setViewState(v => ({ ...v, zoom: Math.max(0,  v.zoom - 0.5) })); break
    }
  }, [viewState.zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cluster click: zoom in by 2 levels, centered on the cluster
  const handleClusterFlyTo = useCallback(
    (longitude: number, latitude: number, currentZoom: number) => {
      setViewState(prev => ({
        ...prev,
        longitude,
        latitude,
        zoom: Math.min(20, currentZoom + 2),
        transitionDuration: 600,
        transitionInterpolator: new FlyToInterpolator({ speed: 1.8 }),
      }))
    },
    [],
  )

  const handleTerrain3d = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    if (!terrain3d) {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        })
      }
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
    } else {
      map.setTerrain(null)
    }
    setTerrain3d(v => !v)
  }, [terrain3d])

  const prefetchWeather = useCallback((lat: number, lng: number) => {
    // Fire-and-forget fetch — browser will cache the response
    void fetch(`/api/spot-weather?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`)
      .catch(() => { /* silent */ })
  }, [])

  const deckLayers = useMemo(
    () =>
      LAYERS.filter(l => enabledMap[l.id]).flatMap(l => {
        const state = layerStates[l.id]
        const layers = l.getDeckLayer(
          applyFilters(state?.points ?? [], l.id, filters),
          onPointClick,
          viewState.zoom,
          handleClusterFlyTo,
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
    [enabledMap, layerStates, onPointClick, filters, viewState.zoom, handleClusterFlyTo]
  )

  return (
    <div
      ref={deckRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Carte interactive — utilisez les touches fléchées pour naviguer, + et - pour zoomer"
      style={{ position: 'absolute', inset: 0, outline: 'none' }}
    >
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
        onHover={(info) => {
          if (info.picked && info.object) {
            const obj = info.object as GeoPoint
            if (obj.latitude && obj.longitude) {
              prefetchWeather(obj.latitude, obj.longitude)
            }
          }
        }}
        onClick={({ object }) => {
          if (!object) onPointClick(null)
        }}
        style={{ position: 'absolute', inset: '0' }}
      >
        <Map
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          mapStyle={mapStyle}
          onLoad={({ target }) => {
            target.setProjection({ name: 'mercator' })
            mapRef.current = target as unknown as mapboxgl.Map
            onMapLoad?.()
          }}
        />
      </DeckGL>

      {/* 3D Terrain toggle */}
      <button
        onClick={handleTerrain3d}
        title={terrain3d ? 'Désactiver le relief 3D' : 'Activer le relief 3D'}
        aria-label={terrain3d ? 'Désactiver le relief 3D' : 'Activer le relief 3D'}
        style={{
          position: 'absolute',
          bottom: 80,
          right: 12,
          background: terrain3d ? '#0d2137' : '#060c18',
          border: `1px solid ${terrain3d ? '#00D4FF' : '#1a2840'}`,
          color: terrain3d ? '#00D4FF' : '#2a4a6a',
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: '0.1em',
          padding: '4px 8px',
          borderRadius: 3,
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        ⛰ 3D
      </button>
    </div>
  )
}
