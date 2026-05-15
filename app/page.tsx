'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import { DEFAULT_FILTERS } from '@/lib/filters'
import { usePersistedState } from '@/lib/use-persisted-state'
// enabledMap default — computed once (not inside render)
const DEFAULT_ENABLED = Object.fromEntries(LAYERS.map(l => [l.id, l.defaultEnabled]))
import TopBar from '@/components/TopBar'
import StatusBar from '@/components/StatusBar'
import LayerToggle from '@/components/LayerToggle'
import ContextPanel from '@/components/ContextPanel'
import FrancePanel from '@/components/FrancePanel'
import MeteogramOverlay from '@/components/MeteogramOverlay'
import type { GeoPoint } from '@/lib/types'
import type { LayerStates } from '@/lib/use-layer-data'

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
      <TopBar layerStates={layerStates} />

      {/* Middle row: map + right sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Map — fills remaining space */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapCanvas
            enabledMap={enabledMap}
            onPointClick={setSelectedPoint}
            onViewStateChange={setViewState}
            onLayerStatesChange={setLayerStates}
            filters={filters}
          />
          {selectedPoint && ['skydive', 'paragliding', 'basejump'].includes(selectedPoint.layerId) && (
            <MeteogramOverlay
              point={selectedPoint}
              onClose={() => setSelectedPoint(null)}
            />
          )}

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
    </div>
  )
}
