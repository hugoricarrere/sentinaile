'use client'
import { useMemo, useState } from 'react'
import type { GeoPoint } from '@/lib/types'
import { haversineKm, formatKm } from '@/lib/utils/haversine'
import { LAYERS } from '@/lib/layers'
import type { LayerStates } from '@/lib/use-layer-data'
import type { FlyToTarget } from '@/components/MapCanvas'

interface Props {
  layerStates: LayerStates
  onSelectPoint: (point: GeoPoint) => void
  onFlyTo: (target: FlyToTarget) => void
  hidden?: boolean
}

type ConditionColor = 'green' | 'yellow' | 'red' | 'unknown'

function getCondition(p: GeoPoint): ConditionColor {
  const cond = (p.data as Record<string, unknown>).condition as string | undefined
  if (cond === 'green') return 'green'
  if (cond === 'yellow') return 'yellow'
  if (cond === 'red') return 'red'
  return 'unknown'
}

function conditionPenalty(p: GeoPoint): number {
  const c = getCondition(p)
  if (c === 'red') return 1000
  if (c === 'yellow') return 50
  return 0 // green or unknown treated as best
}

const conditionDot: Record<ConditionColor, string> = {
  green: '#00c87a',
  yellow: '#FFB347',
  red: '#cc3a20',
  unknown: '#2a4a6a',
}

function getLayerIcon(layerId: string): string {
  return LAYERS.find(l => l.id === layerId)?.icon ?? '📍'
}

function getPointName(p: GeoPoint): string {
  const d = p.data as Record<string, unknown>
  return (
    (d.name as string | undefined) ??
    (d.spotName as string | undefined) ??
    (d.club as string | undefined) ??
    (d.title as string | undefined) ??
    p.id
  )
}

export function NearbySpots({ layerStates, onSelectPoint, onFlyTo, hidden }: Props) {
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nearby = useMemo(() => {
    if (!userPos) return []
    const allPoints: GeoPoint[] = []
    for (const layer of LAYERS) {
      allPoints.push(...(layerStates[layer.id]?.points ?? []))
    }
    return allPoints
      .map(p => ({
        point: p,
        distKm: haversineKm(userPos.lat, userPos.lng, p.latitude, p.longitude),
      }))
      .filter(({ distKm }) => distKm < 500)
      .sort(
        (a, b) =>
          (a.distKm + conditionPenalty(a.point)) -
          (b.distKm + conditionPenalty(b.point)),
      )
      .slice(0, 10)
  }, [userPos, layerStates])

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non disponible')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserPos({ lat: coords.latitude, lng: coords.longitude })
        setLoading(false)
        setOpen(true)
      },
      () => {
        setLoading(false)
        setError('Position refusée')
      },
      { timeout: 5000 },
    )
  }

  const handleToggle = () => {
    if (!userPos) {
      handleLocate()
    } else {
      setOpen(o => !o)
    }
  }

  if (hidden) return null

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={handleToggle}
        aria-label="Spots autour de moi"
        title="Spots autour de moi"
        style={{
          position: 'fixed',
          bottom: `calc(48px + env(safe-area-inset-bottom) + 16px)`,
          left: 24,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 14px',
          height: 38,
          background: open ? '#0d2137' : '#0B1120',
          border: `1px solid ${open ? '#00D4FF' : '#1a2840'}`,
          borderRadius: 6,
          color: open ? '#00D4FF' : '#4a7aa0',
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'all 0.15s',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? (
          <>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
            Localisation…
          </>
        ) : (
          <>📍 Autour de moi</>
        )}
      </button>

      {/* Error toast */}
      {error && (
        <div
          onClick={() => setError(null)}
          role="alert"
          style={{
            position: 'fixed',
            bottom: `calc(48px + env(safe-area-inset-bottom) + 72px)`,
            left: 24,
            zIndex: 20,
            background: '#070B14',
            border: '1px solid #cc3a2060',
            borderRadius: 6,
            padding: '6px 14px',
            fontFamily: 'var(--font-rajdhani)',
            fontWeight: 600,
            fontSize: 12,
            color: '#FFB347',
            cursor: 'pointer',
          }}
        >
          {error}
        </div>
      )}

      {/* Results panel */}
      {open && userPos && (
        <div
          style={{
            position: 'fixed',
            bottom: `calc(48px + env(safe-area-inset-bottom) + 72px)`,
            left: 16,
            zIndex: 19,
            width: 280,
            maxHeight: '55vh',
            background: '#040810',
            border: '1px solid #1a2840',
            borderRadius: 8,
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px 8px',
              borderBottom: '1px solid #111c2e',
              position: 'sticky',
              top: 0,
              background: '#040810',
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-rajdhani)',
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.25em',
                color: '#2a4a6a',
                textTransform: 'uppercase',
              }}
            >
              {nearby.length} spot{nearby.length !== 1 ? 's' : ''} à proximité
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              style={{
                background: 'none',
                border: '1px solid #1a2840',
                color: '#2a4a6a',
                width: 20,
                height: 20,
                borderRadius: 3,
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>

          {nearby.length === 0 ? (
            <div
              style={{
                padding: '20px 14px',
                fontFamily: 'var(--font-rajdhani)',
                fontSize: 12,
                color: '#2a4a6a',
                textAlign: 'center',
              }}
            >
              Aucun spot dans un rayon de 500 km
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
              {nearby.map(({ point, distKm }) => {
                const cond = getCondition(point)
                const name = getPointName(point)
                const icon = getLayerIcon(point.layerId)
                return (
                  <li key={point.id}>
                    <button
                      onClick={() => {
                        onSelectPoint(point)
                        onFlyTo({ latitude: point.latitude, longitude: point.longitude, zoom: 12 })
                        setOpen(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '8px 14px',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid #0d1a2a',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = '#0B1120'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'none'
                      }}
                    >
                      {/* Sport icon */}
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                      {/* Name + distance */}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: 'block',
                            fontFamily: 'var(--font-rajdhani)',
                            fontWeight: 600,
                            fontSize: 13,
                            color: '#c0d8f0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            color: '#2a4a6a',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {formatKm(distKm)}
                        </span>
                      </span>
                      {/* Condition dot */}
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: conditionDot[cond],
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${conditionDot[cond]}80`,
                        }}
                        title={cond}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </>
  )
}
