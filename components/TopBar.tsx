'use client'
import { useEffect, useRef, useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'
import type { FlyToTarget } from './MapCanvas'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
}

interface Props {
  layerStates: LayerStates
  onFlyTo?: (target: FlyToTarget) => void
}

const S = {
  bar: {
    height: 56,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '0 24px',
    background: 'linear-gradient(to right, #040810, #060c18)',
    borderBottom: '1px solid #1a2840',
  } as React.CSSProperties,
  logoWrap: {
    display: 'inline-flex',
    alignItems: 'flex-end',
    lineHeight: 1,
    gap: 0,
  },
  logoBase: {
    fontFamily: 'var(--font-rajdhani)',
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#00C4EE',
    textShadow: '0 0 18px rgba(0,196,238,0.35)',
    lineHeight: 1,
  },
  logoA: {
    fontFamily: 'var(--font-rajdhani)',
    fontWeight: 800,
    fontSize: 52,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    color: '#ffffff',
    textShadow: '0 0 28px rgba(0,212,255,0.8), 0 0 8px rgba(0,212,255,0.5)',
    lineHeight: 0.82,
    marginBottom: -1,
  },
  logoAile: {
    fontFamily: 'var(--font-rajdhani)',
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#e8f6ff',
    textShadow: '0 0 18px rgba(0,196,238,0.5)',
    lineHeight: 1,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: '#00D4FF',
    color: '#00D4FF',
    flexShrink: 0,
  },
  liveLabel: {
    fontFamily: 'var(--font-rajdhani)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.2em',
    color: '#3a8aaa',
    textTransform: 'uppercase' as const,
  },
  divider: {
    width: 1,
    height: 20,
    background: '#1a2840',
    flexShrink: 0,
  },
  layerPills: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  time: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: '#2a4a6a',
    letterSpacing: '0.08em',
    marginLeft: 'auto',
  },
} as const

export default function TopBar({ layerStates, onFlyTo }: Props) {
  const [utc, setUtc] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const heure = now.toLocaleTimeString('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      })
      setUtc(heure + ' (Paris)')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Debounced Nominatim geocoding
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=fr`
        const res = await fetch(url, { headers: { 'User-Agent': 'Sentinai-le/1.0' } })
        const data: NominatimResult[] = await res.json()
        setResults(data)
        setShowResults(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (r: NominatimResult) => {
    onFlyTo?.({ longitude: parseFloat(r.lon), latitude: parseFloat(r.lat), zoom: 12 })
    setQuery(r.display_name.split(',')[0])
    setShowResults(false)
  }

  const activeLayers = LAYERS.filter(
    l => (layerStates[l.id]?.points.length ?? 0) > 0
  )

  return (
    <header style={S.bar}>
      {/* Wing logo */}
      <svg width="34" height="26" viewBox="0 0 34 26" fill="none" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(200,220,255,0.5))' }}>
        {/* Main wing surface — swept back silhouette */}
        <path
          d="M2 22 C7 17 16 10 32 3 C28 9 22 15 15 19 C10 21 6 22 2 22Z"
          fill="white"
          fillOpacity="0.92"
        />
        {/* Secondary feather line for depth */}
        <path
          d="M2 22 C7 19 12 18 17 17"
          stroke="white"
          strokeWidth="0.8"
          strokeOpacity="0.35"
          fill="none"
        />
        {/* Wingtip highlight */}
        <path
          d="M28 5 C30 4 32 3 32 3"
          stroke="white"
          strokeWidth="1.2"
          strokeOpacity="0.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      <span style={S.logoWrap}>
        <span style={S.logoBase}>Sentin</span>
        <span style={S.logoA}>A</span>
        <span style={S.logoAile}>ile</span>
      </span>

      <span style={S.divider} />

      <span className="live-dot" style={S.liveDot} />
      <span style={S.liveLabel}>Live</span>

      {activeLayers.length > 0 && (
        <>
          <span style={S.divider} />
          <div style={S.layerPills}>
            {activeLayers.map(l => (
              <span
                key={l.id}
                style={{
                  fontFamily: 'var(--font-rajdhani)',
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: '0.06em',
                  color: l.color,
                  background: `${l.color}18`,
                  border: `1px solid ${l.color}35`,
                  padding: '2px 10px',
                  borderRadius: 3,
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {l.icon}&nbsp;{(layerStates[l.id]?.points.length ?? 0).toLocaleString('fr-FR')}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Search box */}
      <div ref={searchRef} style={{ marginLeft: 'auto', position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{
            position: 'absolute', left: 10, color: '#2a4a6a',
            fontSize: 13, pointerEvents: 'none', lineHeight: 1,
          }}>⌕</span>
          <input
            type="search"
            placeholder="Rechercher un lieu…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowResults(true) }}
            style={{
              width: 200,
              height: 30,
              background: '#0B1120',
              border: '1px solid #1a2840',
              borderRadius: 4,
              color: '#8aaccc',
              fontFamily: 'var(--font-rajdhani)',
              fontSize: 13,
              paddingLeft: 28,
              paddingRight: 8,
              outline: 'none',
            }}
            aria-label="Recherche géographique"
          />
          {searching && (
            <span style={{ position: 'absolute', right: 8, color: '#2a4a6a', fontSize: 10 }}>…</span>
          )}
        </div>
        {showResults && results.length > 0 && (
          <ul style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: 320,
            marginTop: 4,
            background: '#0B1120',
            border: '1px solid #1a2840',
            borderRadius: 4,
            listStyle: 'none',
            padding: 0,
            margin: 0,
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
            {results.map(r => (
              <li key={r.place_id}>
                <button
                  onClick={() => handleSelect(r)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid #0d1826',
                    color: '#8aaccc',
                    fontFamily: 'var(--font-rajdhani)',
                    fontSize: 12,
                    padding: '8px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    lineHeight: 1.4,
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.background = '#111c2e' }}
                  onMouseLeave={e => { (e.currentTarget).style.background = 'none' }}
                >
                  <span style={{ color: '#00D4FF', marginRight: 6, fontSize: 11 }}>📍</span>
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <span style={S.time}>{utc}</span>
    </header>
  )
}
