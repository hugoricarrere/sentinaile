'use client'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import { DEFAULT_FILTERS } from '@/lib/filters'
import { usePersistedState } from '@/lib/use-persisted-state'
import { encodeUrlState, decodeUrlState } from '@/lib/url-state'
// enabledMap default — computed once (not inside render)
const DEFAULT_ENABLED = Object.fromEntries(LAYERS.map(l => [l.id, l.defaultEnabled]))
import TopBar from '@/components/TopBar'
import StatusBar from '@/components/StatusBar'
import LayerToggle from '@/components/LayerToggle'
import ContextPanel from '@/components/ContextPanel'
import FrancePanel from '@/components/FrancePanel'
import MeteogramOverlay from '@/components/MeteogramOverlay'
import ConditionToast from '@/components/ConditionToast'
import type { GeoPoint } from '@/lib/types'
import type { LayerStates } from '@/lib/use-layer-data'
import type { FlyToTarget } from '@/components/MapCanvas'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false })

export default function Home() {
  const [enabledMap, setEnabledMap] = usePersistedState<Record<string, boolean>>(
    'sentinaile-enabled-layers',
    DEFAULT_ENABLED,
  )
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null)
  const [viewState, setViewState] = usePersistedState('sentinaile-view-state', { longitude: 2.3, latitude: 46.8, zoom: 5.6 })
  const [layerStates, setLayerStates] = useState<LayerStates>({})
  const [filters, setFilters] = usePersistedState('sentinaile-filters', DEFAULT_FILTERS)
  const [activeFilterLayer, setActiveFilterLayer] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = usePersistedState('sentinaile-sidebar-open', true)
  const [flyTo, setFlyTo] = useState<FlyToTarget | null>(null)
  const hashWriteRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // On mount: if URL has a valid hash, apply it (overrides persisted state)
  useEffect(() => {
    const parsed = decodeUrlState(window.location.hash)
    if (!parsed) return
    setViewState({ longitude: parsed.longitude, latitude: parsed.latitude, zoom: parsed.zoom })
    if (parsed.layers.length > 0) {
      const layerIds = new Set(LAYERS.map(l => l.id))
      const next: Record<string, boolean> = { ...DEFAULT_ENABLED }
      // Disable all, then enable only those listed in URL
      LAYERS.forEach(l => { next[l.id] = false })
      parsed.layers.filter(id => layerIds.has(id)).forEach(id => { next[id] = true })
      setEnabledMap(next)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced URL hash update on viewState / enabledMap changes
  useEffect(() => {
    if (hashWriteRef.current) clearTimeout(hashWriteRef.current)
    hashWriteRef.current = setTimeout(() => {
      const activeLayers = LAYERS.filter(l => enabledMap[l.id]).map(l => l.id)
      window.history.replaceState(null, '', encodeUrlState(viewState, activeLayers))
    }, 500)
    return () => { if (hashWriteRef.current) clearTimeout(hashWriteRef.current) }
  }, [viewState, enabledMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tighter bbox: excludes Madrid (lat≈40.4), north Italy (lon≈12+), and Channel Islands
  const isFranceView =
    viewState.zoom >= 5 &&
    viewState.longitude > -4.8 &&
    viewState.longitude < 8.2 &&
    viewState.latitude > 42.3 &&
    viewState.latitude < 51.2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#070B14', overflow: 'hidden' }}>

      {/* Top bar — full width, fixed height */}
      <TopBar layerStates={layerStates} onFlyTo={setFlyTo} />

      {/* Middle row: map + right sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Map — fills remaining space */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapCanvas
            enabledMap={enabledMap}
            onPointClick={(pt) => {
              setSelectedPoint(pt)
              if (pt) setFlyTo({ longitude: pt.longitude, latitude: pt.latitude })
            }}
            onViewStateChange={setViewState}
            onLayerStatesChange={setLayerStates}
            filters={filters}
            flyTo={flyTo}
          />
          {selectedPoint && ['skydive', 'paragliding', 'basejump'].includes(selectedPoint.layerId) && (
            <MeteogramOverlay
              point={selectedPoint}
              onClose={() => setSelectedPoint(null)}
            />
          )}

          {/* Bouton géolocalisation — flottant sur la carte */}
          <button
            onClick={() => {
              if (!navigator.geolocation) return
              navigator.geolocation.getCurrentPosition(
                ({ coords }) => setFlyTo({ longitude: coords.longitude, latitude: coords.latitude, zoom: 11 }),
                () => null,
                { timeout: 8000 },
              )
            }}
            title="Ma position"
            aria-label="Centrer sur ma position"
            style={{
              position: 'absolute',
              top: 60,
              right: 12,
              zIndex: 5,
              width: 40,
              height: 40,
              background: '#0B1120',
              border: '1px solid #1a2840',
              borderRadius: 4,
              color: '#3a5a7a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#00D4FF'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#00D4FF'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a2840'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#3a5a7a'
            }}
          >
            ◎
          </button>

          {/* Bouton collapse/expand sidebar — flottant sur la carte */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? 'Réduire la barre latérale' : 'Afficher la barre latérale'}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 5,
              width: 40,
              height: 40,
              background: '#0B1120',
              border: '1px solid #1a2840',
              borderRadius: 4,
              color: '#3a5a7a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#00D4FF'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#00D4FF'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a2840'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#3a5a7a'
            }}
          >
            {sidebarOpen ? '›' : '‹'}
          </button>
        </div>

        {/* Right sidebar — layer toggles + context panel */}
        {sidebarOpen && (
          <aside style={{
            width: 272,
            flexShrink: 0,
            borderLeft: '1px solid #1a2840',
            background: '#0B1120',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}>
            <LayerToggle
              enabledMap={enabledMap}
              onToggle={(id, enabled) => setEnabledMap(prev => ({ ...prev, [id]: enabled }))}
              layerStates={layerStates}
              filters={filters}
              onFiltersChange={setFilters}
              activeFilterLayer={activeFilterLayer}
              onFilterLayer={setActiveFilterLayer}
            />
            {selectedPoint && (
              <ContextPanel point={selectedPoint} onClose={() => setSelectedPoint(null)} />
            )}
            {isFranceView && <FrancePanel />}
          </aside>
        )}
      </div>

      {/* Status bar — full width, fixed height */}
      <StatusBar layerStates={layerStates} viewState={viewState} />

      {/* Condition alerts */}
      <ConditionToast layerStates={layerStates} />
    </div>
  )
}
