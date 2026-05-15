'use client'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { LAYERS } from '@/lib/layers'
import { DEFAULT_FILTERS } from '@/lib/filters'
import { usePersistedState } from '@/lib/use-persisted-state'
import { decodeUrlState } from '@/lib/url-state'
import { useMobile, useGeolocation, useUrlHash, useLandscape } from '@/lib/hooks'
import TopBar from '@/components/TopBar'
import StatusBar from '@/components/StatusBar'
import LayerToggle from '@/components/LayerToggle'
import ContextPanel from '@/components/ContextPanel'
import FrancePanel from '@/components/FrancePanel'
import MeteogramOverlay from '@/components/MeteogramOverlay'
import ConditionToast from '@/components/ConditionToast'
import MobileSearch from '@/components/MobileSearch'
import { SplashScreen } from '@/components/SplashScreen'
import { NearbySpots } from '@/components/NearbySpots'
import { SpotComparator, useComparator } from '@/components/SpotComparator'
import type { GeoPoint } from '@/lib/types'
import type { LayerStates } from '@/lib/use-layer-data'
import type { FlyToTarget } from '@/components/MapCanvas'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false })

// enabledMap default — computed once outside render
const DEFAULT_ENABLED = Object.fromEntries(LAYERS.map(l => [l.id, l.defaultEnabled]))

// ── Shared desktop map button style ───────────────────────────────────────
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
  // ── Swipe refs (bottom sheets) ────────────────────────────────────────────
  const swipeLayers = useRef<{ startY: number; dy: number }>({ startY: 0, dy: 0 })
  const swipeDetail = useRef<{ startY: number; dy: number }>({ startY: 0, dy: 0 })

  // ── Persisted state ───────────────────────────────────────────────────────
  const [enabledMap, setEnabledMap] = usePersistedState<Record<string, boolean>>(
    'sentinaile-enabled-layers', DEFAULT_ENABLED,
  )
  const [viewState, setViewState] = usePersistedState(
    'sentinaile-view-state', { longitude: 2.3, latitude: 46.8, zoom: 5.6 },
  )
  const [filters, setFilters] = usePersistedState('sentinaile-filters', DEFAULT_FILTERS)
  const [sidebarOpen, setSidebarOpen] = usePersistedState('sentinaile-sidebar-open', true)
  const [surfLevelFilter, setSurfLevelFilter] = usePersistedState<string>('sentinaile-surf-level', 'all')
  const [satellite, setSatellite] = usePersistedState('sentinaile-satellite', false)

  // ── Transient state ───────────────────────────────────────────────────────
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null)
  const [layerStates, setLayerStates] = useState<LayerStates>({})
  const [pendingSpotId, setPendingSpotId] = useState<string | null>(null)
  const [flyTo, setFlyTo] = useState<FlyToTarget | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({})
  const [activeFilterLayer, setActiveFilterLayer] = useState<string | null>(null)
  // Mobile: separate sheet states
  const [mobileLayersOpen, setMobileLayersOpen] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  // Pull-to-refresh
  const pullStartY = useRef(0)
  const [isPulling, setIsPulling] = useState(false)
  // Guard against the 300ms synthetic click (touch → click) hitting the backdrop.
  // When the detail panel opens, we record the timestamp and ignore close events
  // that arrive within 500ms (i.e. before the user has a chance to intentionally close).
  const panelOpenedAt = useRef(0)

  // ── Comparator ────────────────────────────────────────────────────────────
  const { spots: comparatorSpots, add: addToComparator, remove: removeFromComparator } = useComparator()

  // ── Custom hooks ──────────────────────────────────────────────────────────
  const isMobile = useMobile()
  const isLandscape = useLandscape()
  const { geoError, handleGeolocate, clearGeoError } = useGeolocation(setFlyTo)
  useUrlHash({ viewState, enabledMap, franceOnly: filters.global.franceOnly })

  // ── Derived map style ─────────────────────────────────────────────────────
  const mapStyle = useMemo(
    () => satellite ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/dark-v11',
    [satellite],
  )

  // Sync surfLevelFilter into filters.surf
  useEffect(() => {
    setFilters(prev => ({ ...prev, surf: { level: surfLevelFilter } }))
  }, [surfLevelFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync detail sheet open state with selectedPoint
  useEffect(() => {
    if (selectedPoint) {
      panelOpenedAt.current = Date.now()
      setMobileDetailOpen(true)
    }
  }, [selectedPoint])

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

  // On mount: if URL has spot/lat/lng query params (from /spot/[id] redirect), fly there
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const spotId = sp.get('spot')
    const lat = parseFloat(sp.get('lat') ?? '')
    const lng = parseFloat(sp.get('lng') ?? '')
    if (!spotId || isNaN(lat) || isNaN(lng)) return
    // Clean URL immediately
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    setFlyTo({ longitude: lng, latitude: lat, zoom: 12 })
    // Find and select the matching point once layer data is available
    // We store the pending spot id; it will be resolved once layerStates have data
    setPendingSpotId(spotId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve pending spot from URL params once layer data is loaded
  useEffect(() => {
    if (!pendingSpotId) return
    for (const state of Object.values(layerStates)) {
      if (!state?.points?.length) continue
      const match = state.points.find(p => p.id === pendingSpotId)
      if (match) {
        setSelectedPoint(match)
        setPendingSpotId(null)
        break
      }
    }
  }, [pendingSpotId, layerStates])

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

  const handleCloseDetail = useCallback(() => {
    // Ignore close events within 500ms of opening — this prevents the 300ms synthetic
    // browser click (generated after a touch tap) from immediately closing the panel
    // via the backdrop overlay.
    if (Date.now() - panelOpenedAt.current < 500) return
    setMobileDetailOpen(false)
    // Delay clearing point so the close animation can play
    setTimeout(() => setSelectedPoint(null), 250)
  }, [])

  // ── Derived state ─────────────────────────────────────────────────────────
  const isFranceView =
    viewState.zoom >= 5 &&
    viewState.longitude > -4.8 && viewState.longitude < 8.2 &&
    viewState.latitude  > 42.3 && viewState.latitude  < 51.2

  const showMeteogram = !!selectedPoint && ['skydive', 'paragliding', 'basejump'].includes(selectedPoint.layerId)
  const connectedCount = LAYERS.filter(l => layerStates[l.id]?.lastUpdated !== null).length
  const errorCount = LAYERS.filter(l => !!layerStates[l.id]?.error).length

  // ── Desktop sidebar content ───────────────────────────────────────────────
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
      {enabledMap['surf'] && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: '#2a4a6a', textTransform: 'uppercase', marginBottom: 8 }}>
            NIVEAU SURF
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['all', 'beginner', 'intermediate', 'advanced', 'expert'] as const).map(lvl => {
              const labels: Record<string, string> = { all: 'Tous', beginner: 'Débutant', intermediate: 'Inter.', advanced: 'Avancé', expert: 'Expert' }
              const active = surfLevelFilter === lvl
              return (
                <button
                  key={lvl}
                  onClick={() => setSurfLevelFilter(lvl)}
                  style={{
                    fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 11,
                    letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 12,
                    background: active ? '#00CED120' : 'transparent',
                    border: `1px solid ${active ? '#00CED1' : '#1a2840'}`,
                    color: active ? '#00CED1' : '#3a5a80',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {labels[lvl]}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {selectedPoint && <ContextPanel point={selectedPoint} onClose={() => setSelectedPoint(null)} onAddToComparator={addToComparator} />}
      {isFranceView && <FrancePanel />}
    </>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', background: '#070B14', overflow: 'hidden' }}>

        {/* Loading overlay */}
        {!mapLoaded && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#040810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <svg width="48" height="38" viewBox="0 0 34 26" fill="none" style={{ opacity: 0.9, animation: 'pulse 1.8s ease-in-out infinite' }}>
              <path d="M2 22 C7 17 16 10 32 3 C28 9 22 15 15 19 C10 21 6 22 2 22Z" fill="#00D4FF" fillOpacity="0.9" />
            </svg>
            <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 12, letterSpacing: '0.3em', color: '#2a4a6a', textTransform: 'uppercase' }}>
              Chargement…
            </span>
          </div>
        )}

        {/* ── Mobile header (compact) ────────────────────────────────────── */}
        <header style={{
          height: isLandscape ? 38 : 50, flexShrink: 0, display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 10,
          background: 'linear-gradient(to right, #040810, #060c18)',
          borderBottom: '1px solid #1a2840',
        }}>
          {/* Logo */}
          <svg width="24" height="18" viewBox="0 0 34 26" fill="none" style={{ flexShrink: 0 }}>
            <path d="M2 22 C7 17 16 10 32 3 C28 9 22 15 15 19 C10 21 6 22 2 22Z" fill="white" fillOpacity="0.9" />
          </svg>
          <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 18, color: '#00C4EE', flex: 1 }}>
            Sentin<span style={{ fontSize: 28, color: '#fff', letterSpacing: '0.04em', lineHeight: 1 }}>A</span>ile
          </span>

          {/* Sources indicator */}
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.06em', color: errorCount > 0 ? '#cc3a20' : '#00c87a', fontWeight: 600 }}>
            ● {connectedCount}/{LAYERS.length}
          </span>

          {/* Search button */}
          <button
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Rechercher un club, spot ou lieu"
            style={{
              background: '#0B1120', border: '1px solid #1a2840',
              borderRadius: 6, color: '#4a7aa0',
              width: 38, height: 34, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            ⌕
          </button>

          {/* Layers toggle button */}
          <button
            onClick={() => setMobileLayersOpen(o => !o)}
            aria-label="Couches de données"
            style={{
              background: mobileLayersOpen ? '#00D4FF18' : '#0B1120',
              border: `1px solid ${mobileLayersOpen ? '#00D4FF60' : '#1a2840'}`,
              borderRadius: 6, color: mobileLayersOpen ? '#00D4FF' : '#4a7aa0',
              width: 38, height: 34, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            ≡
          </button>
        </header>

        {/* ── Map area ──────────────────────────────────────────────────── */}
        <div
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
          onTouchStart={(e) => { pullStartY.current = e.touches[0].clientY; setIsPulling(false) }}
          onTouchMove={(e) => { if (e.touches[0].clientY - pullStartY.current > 60) setIsPulling(true) }}
          onTouchEnd={() => { if (isPulling) { LAYERS.forEach(l => handleRefreshLayer(l.id)); setIsPulling(false) } }}
        >
          <MapCanvas
            enabledMap={enabledMap}
            onPointClick={handlePointClick}
            onViewStateChange={setViewState}
            onLayerStatesChange={setLayerStates}
            filters={filters}
            flyTo={flyTo}
            refreshKeys={refreshKeys}
            onMapLoad={() => setMapLoaded(true)}
            mapStyle={mapStyle}
          />

          {/* Pull-to-refresh indicator */}
          {isPulling && (
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              background: '#0B1120', border: '1px solid #1a2840', borderRadius: 12,
              padding: '4px 12px', zIndex: 10,
              fontFamily: 'var(--font-rajdhani)', fontSize: 11, color: '#00D4FF',
              pointerEvents: 'none',
            }}>
              ↻ Actualisation…
            </div>
          )}

          {/* Meteogram overlay (bottom-positioned, already responsive) */}
          {showMeteogram && (
            <MeteogramOverlay point={selectedPoint!} onClose={handleCloseDetail} />
          )}

          {/* Geoloc error toast */}
          {geoError && (
            <div
              onClick={clearGeoError}
              role="alert"
              style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                background: '#070B14', border: '1px solid #cc3a2060', borderRadius: 6,
                padding: '8px 16px', fontFamily: 'var(--font-rajdhani)', fontWeight: 600,
                fontSize: 12, color: '#FFB347', zIndex: 10, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {geoError}
            </div>
          )}

          {/* FAB — geolocation */}
          <button
            onClick={handleGeolocate}
            aria-label="Centrer sur ma position"
            style={{
              position: 'absolute', bottom: 16, right: 16, zIndex: 5,
              width: 44, height: 44, borderRadius: 22,
              background: '#0B1120', border: '1px solid #1a2840',
              color: '#4a7aa0', cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            ◎
          </button>

          {/* FAB — satellite toggle */}
          <button
            onClick={() => setSatellite(s => !s)}
            aria-label={satellite ? 'Vue carte' : 'Vue satellite'}
            style={{
              position: 'absolute', bottom: 70, right: 16, zIndex: 5,
              width: 44, height: 44, borderRadius: 22,
              background: '#0B1120', border: '1px solid #1a2840',
              color: '#4a7aa0', cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            {satellite ? '🗺' : '🛰'}
          </button>
        </div>

        {/* ── Mobile bottom bar ─────────────────────────────────────────── */}
        <div style={{
          height: isLandscape ? 34 : 48, flexShrink: 0, display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 12,
          background: '#040810', borderTop: '1px solid #1a2840',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {/* Coords */}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#2a4a6a', letterSpacing: '0.06em', flex: 1 }}>
            {viewState.latitude.toFixed(2)}°N  {Math.abs(viewState.longitude).toFixed(2)}°{viewState.longitude >= 0 ? 'E' : 'O'}
          </span>

          {/* Active layer pills (icons only) */}
          {LAYERS.filter(l => (layerStates[l.id]?.points.length ?? 0) > 0).slice(0, 5).map(l => (
            <span key={l.id} style={{ fontSize: 14 }} title={l.label}>{l.icon}</span>
          ))}
        </div>

        {/* ── Mobile: Layers bottom sheet ───────────────────────────────── */}
        {mobileLayersOpen && (
          <div
            onClick={() => setMobileLayersOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.6)' }}
          />
        )}
        <div
          role="dialog"
          aria-label="Couches de données"
          aria-modal={mobileLayersOpen}
          onTouchStart={(e) => { swipeLayers.current = { startY: e.touches[0].clientY, dy: 0 } }}
          onTouchMove={(e) => { swipeLayers.current.dy = e.touches[0].clientY - swipeLayers.current.startY }}
          onTouchEnd={() => { if (swipeLayers.current.dy > 60) setMobileLayersOpen(false) }}
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
            background: '#0B1120',
            borderTop: '1px solid #1a2840',
            borderRadius: '16px 16px 0 0',
            maxHeight: '80dvh',
            display: 'flex', flexDirection: 'column',
            transform: mobileLayersOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#1a2840' }} />
          </div>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 16px 10px',
          }}>
            <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 11, letterSpacing: '0.25em', color: '#2a4a6a', textTransform: 'uppercase' }}>
              Couches de données
            </span>
            <button
              onClick={() => setMobileLayersOpen(false)}
              aria-label="Fermer"
              style={{ background: 'none', border: '1px solid #1a2840', borderRadius: 3, color: '#2a4a6a', width: 24, height: 24, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ×
            </button>
          </div>
          {/* Scrollable content */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
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
            {enabledMap['surf'] && (
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: '#2a4a6a', textTransform: 'uppercase', marginBottom: 8 }}>
                  NIVEAU SURF
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['all', 'beginner', 'intermediate', 'advanced', 'expert'] as const).map(lvl => {
                    const labels: Record<string, string> = { all: 'Tous', beginner: 'Débutant', intermediate: 'Inter.', advanced: 'Avancé', expert: 'Expert' }
                    const active = surfLevelFilter === lvl
                    return (
                      <button
                        key={lvl}
                        onClick={() => setSurfLevelFilter(lvl)}
                        style={{
                          fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 11,
                          letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 12,
                          background: active ? '#00CED120' : 'transparent',
                          border: `1px solid ${active ? '#00CED1' : '#1a2840'}`,
                          color: active ? '#00CED1' : '#3a5a80',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {labels[lvl]}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {isFranceView && <FrancePanel />}
          </div>
        </div>

        {/* ── Mobile: Point detail bottom sheet ────────────────────────── */}
        {selectedPoint && !showMeteogram && (
          <>
            {mobileDetailOpen && (
              <div
                onClick={handleCloseDetail}
                style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)' }}
              />
            )}
            <div
              role="dialog"
              aria-label="Détail du point"
              aria-modal={mobileDetailOpen}
              onTouchStart={(e) => { swipeDetail.current = { startY: e.touches[0].clientY, dy: 0 } }}
              onTouchMove={(e) => { swipeDetail.current.dy = e.touches[0].clientY - swipeDetail.current.startY }}
              onTouchEnd={() => { if (swipeDetail.current.dy > 60) handleCloseDetail() }}
              style={{
                position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 70,
                background: '#0B1120',
                borderTop: '1px solid #1a2840',
                borderRadius: '16px 16px 0 0',
                maxHeight: '75dvh',
                display: 'flex', flexDirection: 'column',
                transform: mobileDetailOpen ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: '#1a2840' }} />
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <ContextPanel point={selectedPoint} onClose={handleCloseDetail} onAddToComparator={addToComparator} />
              </div>
            </div>
          </>
        )}

        {/* ── Mobile: Search bottom sheet ──────────────────────────────── */}
        <MobileSearch
          open={mobileSearchOpen}
          onClose={() => setMobileSearchOpen(false)}
          layerStates={layerStates}
          onFlyTo={setFlyTo}
          onSelectPoint={(pt) => {
            handlePointClick(pt)
            setMobileSearchOpen(false)
          }}
        />

        <NearbySpots layerStates={layerStates} onSelectPoint={handlePointClick} onFlyTo={setFlyTo} hidden={!!(selectedPoint && mobileDetailOpen)} />
        <SpotComparator spots={comparatorSpots} onRemove={removeFromComparator} />
        <ConditionToast layerStates={layerStates} />
        <SplashScreen />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
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

      <TopBar layerStates={layerStates} onFlyTo={setFlyTo} onSelectPoint={handlePointClick} />

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
            mapStyle={mapStyle}
          />

          {showMeteogram && (
            <MeteogramOverlay point={selectedPoint!} onClose={() => setSelectedPoint(null)} />
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

          {/* Satellite toggle button */}
          <button
            onClick={() => setSatellite(s => !s)}
            title={satellite ? 'Vue carte' : 'Vue satellite'}
            aria-label={satellite ? 'Vue carte' : 'Vue satellite'}
            style={{ ...mapBtnBase, top: 108, right: 12 }}
            onMouseEnter={e => onBtnHover(e, true)}
            onMouseLeave={e => onBtnHover(e, false)}
          >
            {satellite ? '🗺' : '🛰'}
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
        {sidebarOpen && (
          <aside className="w-[272px] shrink-0 border-l border-border bg-sidebar flex flex-col overflow-y-auto">
            {sidebarContent}
          </aside>
        )}
      </div>

      <NearbySpots layerStates={layerStates} onSelectPoint={handlePointClick} onFlyTo={setFlyTo} />
      <SpotComparator spots={comparatorSpots} onRemove={removeFromComparator} />
      <StatusBar layerStates={layerStates} viewState={viewState} />
      <ConditionToast layerStates={layerStates} />
      <SplashScreen />
    </div>
  )
}
