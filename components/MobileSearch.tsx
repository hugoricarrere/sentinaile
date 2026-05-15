'use client'
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { LAYERS } from '@/lib/layers'
import { fuzzySearch } from '@/lib/fuzzy'
import type { GeoPoint } from '@/lib/types'
import type { LayerStates } from '@/lib/use-layer-data'
import type { FlyToTarget } from './MapCanvas'
import { useFavorites } from '@/lib/hooks/use-favorites'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface Props {
  open: boolean
  onClose: () => void
  layerStates: LayerStates
  onFlyTo: (target: FlyToTarget) => void
  onSelectPoint: (point: GeoPoint) => void
}

// Extract all searchable text from a point
function getPointLabel(point: GeoPoint): string {
  const d = point.data
  const fields = ['name', 'title', 'icao', 'callsign', 'commune', 'city', 'station_name', 'country']
  return fields.map(f => (typeof d[f] === 'string' ? (d[f] as string) : '')).filter(Boolean).join(' ')
}

export default function MobileSearch({ open, onClose, layerStates, onFlyTo, onSelectPoint }: Props) {
  const { favorites, isFavorite, toggle } = useFavorites()
  const [query, setQuery] = useState('')
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([])
  const [nomSearching, setNomSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // All loaded points across all layers
  const allPoints = useMemo(() => {
    const pts: GeoPoint[] = []
    for (const layer of LAYERS) {
      const pts2 = layerStates[layer.id]?.points ?? []
      pts.push(...pts2)
    }
    return pts
  }, [layerStates])

  // Favorite points (shown when query is empty)
  const favoritePoints = useMemo(() => {
    if (query.trim() !== '') return []
    return allPoints.filter(p => isFavorite(p.id))
  }, [allPoints, query, isFavorite, favorites])

  // Local fuzzy search on layer points
  const pointResults = useMemo(() => {
    if (query.trim().length < 2) return []
    return fuzzySearch(allPoints, getPointLabel, query, 6)
  }, [allPoints, query])

  // Nominatim geocoding (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 3) { setNominatimResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setNomSearching(true)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
        const data: NominatimResult[] = (await res.json()).data ?? []
        setNominatimResults(data.slice(0, 4))
      } catch {
        setNominatimResults([])
      } finally {
        setNomSearching(false)
      }
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Focus input when sheet opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80)
    } else {
      setQuery('')
      setNominatimResults([])
    }
  }, [open])

  // Escape key closes
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSelectPoint = useCallback((point: GeoPoint) => {
    onFlyTo({ longitude: point.longitude, latitude: point.latitude, zoom: 12 })
    onSelectPoint(point)
    onClose()
  }, [onFlyTo, onSelectPoint, onClose])

  const handleSelectPlace = useCallback((r: NominatimResult) => {
    onFlyTo({ longitude: parseFloat(r.lon), latitude: parseFloat(r.lat), zoom: 12 })
    onClose()
  }, [onFlyTo, onClose])

  const layer = (point: GeoPoint) => LAYERS.find(l => l.id === point.layerId)

  const hasResults = pointResults.length > 0 || nominatimResults.length > 0

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.65)' }}
        />
      )}

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-label="Recherche"
        aria-modal={open}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90,
          background: '#0B1120',
          borderTop: '1px solid #1a2840',
          borderRadius: '16px 16px 0 0',
          maxHeight: '90dvh',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#1a2840' }} />
        </div>

        {/* Search input */}
        <div style={{ padding: '4px 16px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1a2840' }}>
          <span style={{ color: '#2a4a6a', fontSize: 18, flexShrink: 0 }}>⌕</span>
          <input
            ref={inputRef}
            type="search"
            placeholder="Club, spot, zone, lieu…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--font-rajdhani)', fontSize: 17, fontWeight: 500,
              color: '#8aaccc', letterSpacing: '0.04em',
            }}
            aria-label="Rechercher un club, spot ou lieu"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {(query || nomSearching) && (
            <button
              onClick={() => { setQuery(''); setNominatimResults([]) }}
              style={{ background: 'none', border: 'none', color: '#2a4a6a', cursor: 'pointer', fontSize: 18, padding: 0, flexShrink: 0 }}
              aria-label="Effacer"
            >
              ×
            </button>
          )}
          {nomSearching && !query && (
            <span style={{ color: '#2a4a6a', fontSize: 11, flexShrink: 0 }}>…</span>
          )}
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Empty state */}
          {!query && (
            <div style={{ padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 13, letterSpacing: '0.1em', color: '#2a4a6a', textTransform: 'uppercase', margin: 0 }}>
                Recherche clubs & spots
              </p>
              <p style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 12, color: '#1a3a58', marginTop: 6, lineHeight: 1.5, letterSpacing: '0.04em' }}>
                DZs, spots parapente, exits BASE,<br />villes météo, navires, vols…
              </p>
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && !hasResults && !nomSearching && (
            <div style={{ padding: '24px 24px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', color: '#2a4a6a', textTransform: 'uppercase' }}>
                Aucun résultat pour « {query} »
              </p>
              <p style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 11, color: '#1a3a58', marginTop: 4, letterSpacing: '0.04em' }}>
                Essayez un autre terme ou activez plus de couches
              </p>
            </div>
          )}

          {/* ── Favorites section (visible when query is empty) ── */}
          {query.trim() === '' && favoritePoints.length > 0 && (
            <section>
              <div style={{ padding: '10px 16px 4px', fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 9, letterSpacing: '0.25em', color: '#2a4a6a', textTransform: 'uppercase' }}>
                Favoris
              </div>
              {favoritePoints.map(point => {
                const l = layer(point)
                const name = (point.data.name as string | undefined) ?? (point.data.title as string | undefined) ?? point.id
                const sub = (point.data.icao as string | undefined) ?? (point.data.commune as string | undefined) ?? (point.data.country as string | undefined) ?? ''
                return (
                  <button
                    key={point.id}
                    onClick={() => handleSelectPoint(point)}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      borderBottom: '1px solid #0d1826', cursor: 'pointer',
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                      textAlign: 'left',
                    }}
                    onTouchStart={e => { (e.currentTarget).style.background = '#111c2e' }}
                    onTouchEnd={e => { (e.currentTarget).style.background = 'none' }}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: l ? `${l.color}20` : '#1a2840',
                      border: `1px solid ${l ? l.color + '40' : '#1a2840'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                    }}>
                      {l?.icon ?? '📍'}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden' }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 14, color: '#8aaccc', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </span>
                      {sub && (
                        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#2a4a6a', letterSpacing: '0.04em', marginTop: 1 }}>
                          {l?.label ?? ''}{sub ? ` · ${sub}` : ''}
                        </span>
                      )}
                    </span>
                    <span style={{ color: '#FF6B6B', fontSize: 14, flexShrink: 0 }}>❤️</span>
                  </button>
                )
              })}
            </section>
          )}

          {/* Hint when no favorites and query is empty */}
          {query.trim() === '' && favoritePoints.length === 0 && (
            <p style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 12, color: '#2a4a6a', textAlign: 'center', padding: '24px 16px', margin: 0 }}>
              Appuyez sur ❤️ dans une fiche pour sauvegarder un spot
            </p>
          )}

          {/* ── Layer points results ── */}
          {pointResults.length > 0 && (
            <section>
              <div style={{ padding: '10px 16px 4px', fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 9, letterSpacing: '0.25em', color: '#2a4a6a', textTransform: 'uppercase' }}>
                Clubs & spots
              </div>
              {pointResults.map(({ item: point, score }) => {
                const l = layer(point)
                const name = (point.data.name as string | undefined) ?? (point.data.title as string | undefined) ?? point.id
                const sub = (point.data.icao as string | undefined) ?? (point.data.commune as string | undefined) ?? (point.data.country as string | undefined) ?? ''
                return (
                  <button
                    key={point.id}
                    onClick={() => handleSelectPoint(point)}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      borderBottom: '1px solid #0d1826', cursor: 'pointer',
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                      textAlign: 'left',
                    }}
                    onTouchStart={e => { (e.currentTarget).style.background = '#111c2e' }}
                    onTouchEnd={e => { (e.currentTarget).style.background = 'none' }}
                  >
                    {/* Layer icon */}
                    <span style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: l ? `${l.color}20` : '#1a2840',
                      border: `1px solid ${l ? l.color + '40' : '#1a2840'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                    }}>
                      {l?.icon ?? '📍'}
                    </span>
                    {/* Name + subtitle */}
                    <span style={{ flex: 1, overflow: 'hidden' }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 14, color: '#8aaccc', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </span>
                      {sub && (
                        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#2a4a6a', letterSpacing: '0.04em', marginTop: 1 }}>
                          {l?.label ?? ''}{sub ? ` · ${sub}` : ''}
                        </span>
                      )}
                    </span>
                    {/* Score indicator */}
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      color: score >= 80 ? '#00FF88' : score >= 50 ? '#FFB347' : '#2a4a6a',
                      flexShrink: 0, letterSpacing: '0.04em',
                    }}>
                      {score >= 80 ? '●' : score >= 50 ? '◐' : '○'}
                    </span>
                    <span style={{ color: '#1a3a58', fontSize: 12, flexShrink: 0 }}>›</span>
                  </button>
                )
              })}
            </section>
          )}

          {/* ── Nominatim geographic results ── */}
          {nominatimResults.length > 0 && (
            <section>
              <div style={{ padding: '10px 16px 4px', fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 9, letterSpacing: '0.25em', color: '#2a4a6a', textTransform: 'uppercase' }}>
                Lieux géographiques
              </div>
              {nominatimResults.map(r => (
                <button
                  key={r.place_id}
                  onClick={() => handleSelectPlace(r)}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    borderBottom: '1px solid #0d1826', cursor: 'pointer',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    textAlign: 'left',
                  }}
                  onTouchStart={e => { (e.currentTarget).style.background = '#111c2e' }}
                  onTouchEnd={e => { (e.currentTarget).style.background = 'none' }}
                >
                  <span style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: '#00D4FF12', border: '1px solid #00D4FF30',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15,
                  }}>
                    📍
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden' }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 14, color: '#8aaccc', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.display_name.split(',')[0]}
                    </span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#2a4a6a', letterSpacing: '0.04em', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.display_name.split(',').slice(1, 3).join(',').trim()}
                    </span>
                  </span>
                  <span style={{ color: '#1a3a58', fontSize: 12, flexShrink: 0 }}>›</span>
                </button>
              ))}
            </section>
          )}

          {/* Loading indicator */}
          {nomSearching && (
            <div style={{ padding: '12px 16px', fontFamily: 'var(--font-rajdhani)', fontSize: 11, letterSpacing: '0.15em', color: '#1a3a58', textAlign: 'center' }}>
              Recherche de lieux…
            </div>
          )}

          <div style={{ height: 16 }} />
        </div>
      </div>
    </>
  )
}
