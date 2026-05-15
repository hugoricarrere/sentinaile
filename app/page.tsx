'use client'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
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

// ── Shared map button style ────────────────────────────────────────────────
const mapBtnStyle: React.CSSProperties = {
  position: 'absolute',
  zIndex: 5,
  width: 40,
  height: 40,
  background: '#0B1120',
  border: '1px solid #1a2840',
  borderRadius: 4,
  color: '#4a7aa0',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'border-color 0.15s, color 0.15s',
}
function onBtnHover(e: React.MouseEvent<HTMLButtonElement>, enter: boolean) {
  const el = e.currentTarget as HTMLButtonElement
  el.style.borderColor = enter ? '#00D4FF' : '#1a2840'
  el.style.color        = enter ? '#00D4FF' : '#4a7aa0'
}

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
  const [mapLoaded, setMapLoaded] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({})
  const [isMobile, setIsMobile] = useState(false)
  const hashWriteRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const geoToastRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // On mount: if URL has a valid hash, apply it (overrides persisted state)
  useEffect(() => {
    const parsed = decodeUrlState(window.location.hash)
    if (!parsed) return
    setViewState({ longitude: parsed.longitude, latitude: parsed.latitude, zoom: parsed.zoom })
    if (parsed.layers.length > 0) {
      const layerIds = new Set(LAYERS.map(l => l.id))
      const next: Record<string, boolean> = { ...DEFAULT_ENABLED }
      LAYERS.forEach(l => { next[l.id] = false })
      parsed.layers.filter(id => layerIds.has(id)).forEach(id => { next[id] = true })
      setEnabledMap(next)
    }
    if (parsed.franceOnly !== undefined) {
      setFilters(prev => ({ ...prev, global: { ...prev.global, franceOnly: parsed.franceOnly! } }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced URL hash update — includes franceOnly filter
  useEffect(() => {
    if (hashWriteRef.current) clearTimeout(hashWriteRef.current)
    hashWriteRef.current = setTimeout(() => {
      const activeLayers = LAYERS.filter(l => enabledMap[l.id]).map(l => l.id)
      window.history.replaceState(null, '', encodeUrlState(viewState, activeLayers, filters.global.franceOnly))
    }, 500)
    return () => { if (hashWriteRef.current) clearTimeout(hashWriteRef.current) }
  }, [viewState, enabledMap, filters.global.franceOnly]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stable onPointClick — avoids recreating DeckGL layers on every parent render
  const handlePointClick = useCallback((pt: GeoPoint | null) => {
    setSelectedPoint(pt)
    if (pt) setFlyTo({ longitude: pt.longitude, latitude: pt.latitude })
  }, [])

  // Geolocation with user-facing error feedback
  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée par ce navigateur.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFlyTo({ longitude: coords.longitude, latitude: coords.latitude, zoom: 11 })
        setGeoError(null)
      },
      (err) => {
        const msg = err.code === 1
          ? '📍 Permission refusée — autorisez la géolocalisation dans les paramètres du navigateur.'
          : '📍 Position indisponible. Réessayez.'
        setGeoError(msg)
        if (geoToastRef.current) clearTimeout(geoToastRef.current)
        geoToastRef.current = setTimeout(() => setGeoError(null), 6000)
      },
      { timeout: 8000 },
    )
  }, [])

  const handleRefreshLayer = useCallback((id: string) => {
    setRefreshKeys(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }, [])

  const handleResetLayers = useCallback(() => {
    setEnabledMap(DEFAULT_ENABLED)
  }, [setEnabledMap])

  // Tighter bbox: excludes Madrid (lat≈40.4), north Italy (lon≈12+), and Channel Islands
  const isFranceView =
    viewState.zoom >= 5 &&
    viewState.longitude > -4.8 &&
    viewState.longitude < 8.2 &&
    viewState.latitude > 42.3 &&
    viewState.latitude < 51.2

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
      {selectedPoint && (
        <ContextPanel point={selectedPoint} onClose={() => setSelectedPoint(null)} />
      )}
      {isFranceView && <FrancePanel />}
    </>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#070B14', overflow: 'hidden' }}>

      {/* Initial loading overlay — fades out once Mapbox map is ready */}
      {!mapLoaded && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#040810',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 16,
          transition: 'opacity 0.4s',
        }}>
          <svg width="48" height="38" viewBox="0 0 34 26" fill="none" style={{ opacity: 0.9, animation: 'pulse 1.8s ease-in-out infinite' }}>
            <path d="M2 22 C7 17 16 10 32 3 C28 9 22 15 15 19 C10 21 6 22 2 22Z" fill="#00D4FF" fillOpacity="0.9" />
          </svg>
          <span style={{
            fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 13,
            letterSpacing: '0.3em', color: '#2a4a6a', textTransform: 'uppercase',
          }}>
            Chargement…
          </span>
          <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
        </div>
      )}

      {/* Top bar — full width, fixed height */}
      <TopBar layerStates={layerStates} onFlyTo={setFlyTo} />

      {/* Middle row: map + right sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Map — fills remaining space */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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
            <MeteogramOverlay
              point={selectedPoint}
              onClose={() => setSelectedPoint(null)}
            />
          )}

          {/* Geolocation error toast */}
          {geoError && (
            <div
              onClick={() => setGeoError(null)}
              role="alert"
              style={{
                position: 'absolute', bottom: 48, left: '50%',
                transform: 'translateX(-50%)',
                background: '#0a0e1a',
                border: '1px solid #cc3a2060',
                borderRadius: 4,
                padding: '8px 16px',
                fontFamily: 'var(--font-rajdhani)',
                fontWeight: 600,
                fontSize: 12,
                color: '#cc8820',
                zIndex: 10,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              }}
            >
              {geoError}
            </div>
          )}

          {/* Bouton géolocalisation */}
          <button
            onClick={handleGeolocate}
            title="Ma position"
            aria-label="Centrer sur ma position"
            style={{ ...mapBtnStyle, top: 60, right: 12 }}
            onMouseEnter={e => onBtnHover(e, true)}
            onMouseLeave={e => onBtnHover(e, false)}
          >
            ◎
          </button>

          {/* Bouton collapse/expand sidebar */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? 'Réduire la barre latérale' : 'Afficher la barre latérale'}
            aria-label={sidebarOpen ? 'Réduire la barre latérale' : 'Afficher la barre latérale'}
            aria-expanded={sidebarOpen}
            style={{ ...mapBtnStyle, top: 12, right: 12, fontSize: 14 }}
            onMouseEnter={e => onBtnHover(e, true)}
            onMouseLeave={e => onBtnHover(e, false)}
          >
            {sidebarOpen ? '›' : '‹'}
          </button>
        </div>

        {/* ── Desktop sidebar: fixed-width panel on the right ── */}
        {!isMobile && sidebarOpen && (
          <aside style={{
            width: 272,
            flexShrink: 0,
            borderLeft: '1px solid #1a2840',
            background: '#0B1120',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}>
            {sidebarContent}
          </aside>
        )}

        {/* ── Mobile sidebar: slide-in overlay from right ── */}
        {isMobile && (
          <>
            {/* Backdrop */}
            {sidebarOpen && (
              <div
                onClick={() => setSidebarOpen(false)}
                style={{
                  position: 'absolute', inset: 0, zIndex: 15,
                  background: 'rgba(0,0,0,0.6)',
                }}
              />
            )}
            <aside
              aria-hidden={!sidebarOpen}
              style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 20,
                width: '85vw', maxWidth: 320,
                background: '#0B1120',
                borderLeft: '1px solid #1a2840',
                display: 'flex', flexDirection: 'column',
                overflowY: 'auto',
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {sidebarContent}
            </aside>
          </>
        )}
      </div>

      {/* Status bar — full width, fixed height */}
      <StatusBar layerStates={layerStates} viewState={viewState} />

      {/* Condition alerts */}
      <ConditionToast layerStates={layerStates} />
    </div>
  )
}
