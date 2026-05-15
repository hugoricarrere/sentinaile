'use client'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
import { LAYERS } from '@/lib/layers'
import { DEFAULT_FILTERS } from '@/lib/filters'
import { usePersistedState } from '@/lib/use-persisted-state'
import { decodeUrlState } from '@/lib/url-state'
import { useMobile, useGeolocation, useUrlHash } from '@/lib/hooks'
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

// enabledMap default — computed once outside render
const DEFAULT_ENABLED = Object.fromEntries(LAYERS.map(l => [l.id, l.defaultEnabled]))

// ── Shared map button style ────────────────────────────────────────────────
const mapBtnBase: React.CSSProperties = {
  position: 'absolute', zIndex: 5, width: 40, height: 40,
  background: '#0B1120', border: '1px solid #1a2840', borderRadius: 4,
  color: '#4a7aa0', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'border-color 0.15s, color 0.15s',
}
function onBtnHover(e: React.MouseEvent<HTMLButtonElement>, enter: boolean) {
  const el = e.currentTarget
  el.style.borderColor = enter ? '#00D4FF' : '#1a2840'
  el.style.color        = enter ? '#00D4FF' : '#4a7aa0'
}

export default function Home() {
  // ── Persisted state ───────────────────────────────────────────────────────
  const [enabledMap, setEnabledMap] = usePersistedState<Record<string, boolean>>(
    'sentinaile-enabled-layers', DEFAULT_ENABLED,
  )
  const [viewState, setViewState] = usePersistedState(
    'sentinaile-view-state', { longitude: 2.3, latitude: 46.8, zoom: 5.6 },
  )
  const [filters, setFilters] = usePersistedState('sentinaile-filters', DEFAULT_FILTERS)
  const [sidebarOpen, setSidebarOpen] = usePersistedState('sentinaile-sidebar-open', true)

  // ── Transient state ───────────────────────────────────────────────────────
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null)
  const [layerStates, setLayerStates] = useState<LayerStates>({})
  const [flyTo, setFlyTo] = useState<FlyToTarget | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({})
  const [activeFilterLayer, setActiveFilterLayer] = useState<string | null>(null)

  // ── Custom hooks ──────────────────────────────────────────────────────────
  const isMobile = useMobile()
  const { geoError, handleGeolocate, clearGeoError } = useGeolocation(setFlyTo)
  useUrlHash({ viewState, enabledMap, franceOnly: filters.global.franceOnly })

  // On mount: if URL has a valid hash, apply it (overrides persisted state)
  useEffect(() => {
    const parsed = decodeUrlState(window.location.hash)
    if (!parsed) return
    setViewState({ longitude: parsed.longitude, latitude: parsed.latitude, zoom: parsed.zoom })
    if (parsed.layers.length > 0) {
      const layerIds = new Set(LAYERS.map(l => l.id))
      const next = { ...DEFAULT_ENABLED }
      LAYERS.forEach(l => { next[l.id] = false })
      parsed.layers.filter(id => layerIds.has(id)).forEach(id => { next[id] = true })
      setEnabledMap(next)
    }
    if (parsed.franceOnly !== undefined) {
      setFilters(prev => ({ ...prev, global: { ...prev.global, franceOnly: parsed.franceOnly! } }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stable callbacks ──────────────────────────────────────────────────────
  const handlePointClick = useCallback((pt: GeoPoint | null) => {
    setSelectedPoint(pt)
    if (pt) setFlyTo({ longitude: pt.longitude, latitude: pt.latitude })
  }, [])

  const handleRefreshLayer = useCallback((id: string) => {
    setRefreshKeys(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }, [])

  const handleResetLayers = useCallback(() => {
    setEnabledMap(DEFAULT_ENABLED)
  }, [setEnabledMap])

  // ── Derived state ─────────────────────────────────────────────────────────
  const isFranceView =
    viewState.zoom >= 5 &&
    viewState.longitude > -4.8 && viewState.longitude < 8.2 &&
    viewState.latitude  > 42.3 && viewState.latitude  < 51.2

  const sidebarContent = (
    <>
      <LayerToggle
        enabledMap={enabledMap}
        onToggle={(id, enabled) => setEnabledMap(prev => ({ ...prev, [id]: enabled }))}
        layerStates={layerStates}
        filters={filters}
        onFiltersChange={setFilters}
        activeFilterLayer={activeFilterLayer}
        onFilterLayer={setActiveFilterLayer}
        onRefreshLayer={handleRefreshLayer}
        onResetLayers={handleResetLayers}
      />
      {selectedPoint && <ContextPanel point={selectedPoint} onClose={() => setSelectedPoint(null)} />}
      {isFranceView && <FrancePanel />}
    </>
  )

  return (
    <div className="flex flex-col h-screen w-screen bg-page overflow-hidden">

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="fixed inset-0 z-[100] bg-header flex flex-col items-center justify-center gap-4">
          <svg width="48" height="38" viewBox="0 0 34 26" fill="none" style={{ opacity: 0.9, animation: 'pulse 1.8s ease-in-out infinite' }}>
            <path d="M2 22 C7 17 16 10 32 3 C28 9 22 15 15 19 C10 21 6 22 2 22Z" fill="#00D4FF" fillOpacity="0.9" />
          </svg>
          <span className="font-display font-bold text-[13px] tracking-[0.3em] text-muted uppercase">
            Chargement…
          </span>
        </div>
      )}

      <TopBar layerStates={layerStates} onFlyTo={setFlyTo} />

      <div className="flex flex-1 overflow-hidden relative">

        {/* Map */}
        <div className="flex-1 relative overflow-hidden">
          <MapCanvas
            enabledMap={enabledMap}
            onPointClick={handlePointClick}
            onViewStateChange={setViewState}
            onLayerStatesChange={setLayerStates}
            filters={filters}
            flyTo={flyTo}
            refreshKeys={refreshKeys}
            onMapLoad={() => setMapLoaded(true)}
          />

          {selectedPoint && ['skydive', 'paragliding', 'basejump'].includes(selectedPoint.layerId) && (
            <MeteogramOverlay point={selectedPoint} onClose={() => setSelectedPoint(null)} />
          )}

          {/* Geolocation error toast */}
          {geoError && (
            <div
              onClick={clearGeoError}
              role="alert"
              className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-page border border-[#cc3a2060] rounded-[4px] px-4 py-2 font-display font-semibold text-xs text-warn z-10 cursor-pointer whitespace-nowrap shadow-lg"
            >
              {geoError}
            </div>
          )}

          {/* Geolocation button */}
          <button
            onClick={handleGeolocate}
            title="Ma position"
            aria-label="Centrer sur ma position"
            style={{ ...mapBtnBase, top: 60, right: 12 }}
            onMouseEnter={e => onBtnHover(e, true)}
            onMouseLeave={e => onBtnHover(e, false)}
          >
            ◎
          </button>

          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? 'Réduire la barre latérale' : 'Afficher la barre latérale'}
            aria-label={sidebarOpen ? 'Réduire la barre latérale' : 'Afficher la barre latérale'}
            aria-expanded={sidebarOpen}
            style={{ ...mapBtnBase, top: 12, right: 12, fontSize: 14 }}
            onMouseEnter={e => onBtnHover(e, true)}
            onMouseLeave={e => onBtnHover(e, false)}
          >
            {sidebarOpen ? '›' : '‹'}
          </button>
        </div>

        {/* Desktop sidebar */}
        {!isMobile && sidebarOpen && (
          <aside className="w-[272px] shrink-0 border-l border-border bg-sidebar flex flex-col overflow-y-auto">
            {sidebarContent}
          </aside>
        )}

        {/* Mobile sidebar (slide-in overlay) */}
        {isMobile && (
          <>
            {sidebarOpen && (
              <div
                onClick={() => setSidebarOpen(false)}
                className="absolute inset-0 z-[15] bg-black/60"
              />
            )}
            <aside
              aria-hidden={!sidebarOpen}
              className="absolute top-0 right-0 bottom-0 z-[20] w-[85vw] max-w-[320px] bg-sidebar border-l border-border flex flex-col overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)' }}
            >
              {sidebarContent}
            </aside>
          </>
        )}
      </div>

      <StatusBar layerStates={layerStates} viewState={viewState} />
      <ConditionToast layerStates={layerStates} />
    </div>
  )
}
