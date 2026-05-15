'use client'
import { useState, useCallback } from 'react'
import type { GeoPoint } from '@/lib/types'
import { LAYERS } from '@/lib/layers'

export function useComparator() {
  const [spots, setSpots] = useState<GeoPoint[]>([])
  const add = useCallback((spot: GeoPoint) => {
    setSpots(prev =>
      prev.find(s => s.id === spot.id) ? prev : [...prev, spot].slice(0, 3),
    )
  }, [])
  const remove = useCallback((id: string) => {
    setSpots(prev => prev.filter(s => s.id !== id))
  }, [])
  return { spots, add, remove }
}

// Layer-specific metric definitions
type MetricDef = { key: string; label: string; unit: string; lowerIsBetter?: boolean }

const METRICS_BY_LAYER: Record<string, MetricDef[]> = {
  surf: [
    { key: 'swellHeightM', label: 'Houle', unit: 'm' },
    { key: 'windKmh',      label: 'Vent',  unit: 'km/h', lowerIsBetter: true },
    { key: 'score',        label: 'Score', unit: '' },
    { key: 'trend',        label: 'Tendance', unit: '' },
  ],
  skydive: [
    { key: 'windSurface', label: 'Vent sol', unit: 'km/h', lowerIsBetter: true },
    { key: 'visibility',  label: 'Visibilité', unit: 'km' },
    { key: 'condition',   label: 'Condition', unit: '' },
  ],
  paragliding: [
    { key: 'windKmh',  label: 'Vent',    unit: 'km/h', lowerIsBetter: true },
    { key: 'gustKmh',  label: 'Rafales', unit: 'km/h', lowerIsBetter: true },
    { key: 'blHeight', label: 'Plafond', unit: 'm' },
    { key: 'condition', label: 'Condition', unit: '' },
  ],
  basejump: [
    { key: 'windKmh',   label: 'Vent',    unit: 'km/h', lowerIsBetter: true },
    { key: 'ceilingM',  label: 'Plafond', unit: 'm' },
    { key: 'condition', label: 'Condition', unit: '' },
  ],
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

function getConditionColor(cond: string | undefined): string {
  if (cond === 'green')  return '#00c87a'
  if (cond === 'yellow') return '#FFB347'
  if (cond === 'red')    return '#cc3a20'
  return '#2a4a6a'
}

function getLayerColor(layerId: string): string {
  return LAYERS.find(l => l.id === layerId)?.color ?? '#00D4FF'
}

function getLayerIcon(layerId: string): string {
  return LAYERS.find(l => l.id === layerId)?.icon ?? '📍'
}

// For a set of numeric values, determine which index(es) hold the best value
function bestIndexes(values: (number | null)[], lowerIsBetter = false): Set<number> {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length < 2) return new Set<number>()
  const best = lowerIsBetter ? Math.min(...nums) : Math.max(...nums)
  return new Set(
    values.flatMap((v, i) => (v === best ? [i] : [])),
  )
}

interface ComparatorProps {
  spots: GeoPoint[]
  onRemove: (id: string) => void
}

export function SpotComparator({ spots, onRemove }: ComparatorProps) {
  if (spots.length === 0) return null

  // Collect all metric keys present across the spots
  // Use the first spot's layer to pick metrics, fall back to union
  const allMetrics: MetricDef[] = []
  const seenKeys = new Set<string>()
  for (const spot of spots) {
    const defs = METRICS_BY_LAYER[spot.layerId] ?? []
    for (const def of defs) {
      if (!seenKeys.has(def.key)) {
        seenKeys.add(def.key)
        allMetrics.push(def)
      }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        background: '#040810',
        borderTop: '1px solid #1a2840',
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.7)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px 6px',
          borderBottom: '1px solid #0d1a2a',
          gap: 8,
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
            flex: 1,
          }}
        >
          ⚖ Comparateur ({spots.length}/3)
        </span>
      </div>

      {/* Columns */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'auto',
          padding: '10px 16px 16px',
          gap: 12,
        }}
      >
        {/* Labels column */}
        <div
          style={{
            minWidth: 90,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          {/* Spacer for header row */}
          <div style={{ height: 56 }} />
          {allMetrics.map(def => (
            <div
              key={def.key}
              style={{
                height: 28,
                display: 'flex',
                alignItems: 'center',
                fontFamily: 'var(--font-rajdhani)',
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.08em',
                color: '#3a5a80',
                textTransform: 'uppercase',
              }}
            >
              {def.label}
            </div>
          ))}
        </div>

        {/* Spot columns */}
        {spots.map((spot, colIdx) => {
          const layerColor = getLayerColor(spot.layerId)
          const layerIcon = getLayerIcon(spot.layerId)
          const name = getPointName(spot)
          const d = spot.data as Record<string, unknown>
          const condition = d.condition as string | undefined

          // Compute numeric values for each metric across all spots (for best highlighting)
          // We pass colIdx so we can check if this column is the best
          return (
            <div
              key={spot.id}
              style={{
                flex: 1,
                minWidth: 110,
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                border: '1px solid #1a2840',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {/* Spot header */}
              <div
                style={{
                  padding: '8px 10px 6px',
                  background: '#060c18',
                  borderBottom: '1px solid #1a2840',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{layerIcon}</span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: 'var(--font-rajdhani)',
                    fontWeight: 700,
                    fontSize: 13,
                    color: layerColor,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={name}
                >
                  {name}
                </span>
                <button
                  onClick={() => onRemove(spot.id)}
                  aria-label={`Retirer ${name}`}
                  style={{
                    background: 'none',
                    border: '1px solid #1a2840',
                    color: '#2a4a6a',
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>

              {/* Condition badge row */}
              <div
                style={{
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 10px',
                  gap: 6,
                  background: '#040810',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: getConditionColor(condition),
                    boxShadow: `0 0 5px ${getConditionColor(condition)}80`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-rajdhani)',
                    fontWeight: 600,
                    fontSize: 11,
                    color: getConditionColor(condition),
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {condition ?? '—'}
                </span>
              </div>

              {/* Metric rows */}
              {allMetrics.map((def, rowIdx) => {
                // Compute best across spots for this metric
                const numericValues: (number | null)[] = spots.map(s => {
                  const raw = (s.data as Record<string, unknown>)[def.key]
                  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
                  return isFinite(n) ? n : null
                })
                const bests = bestIndexes(numericValues, def.lowerIsBetter ?? false)
                const isBest = bests.has(colIdx)

                const rawVal = d[def.key]
                let display: string
                if (rawVal === undefined || rawVal === null) {
                  display = '—'
                } else if (typeof rawVal === 'number') {
                  display = `${rawVal.toFixed(rawVal < 10 ? 1 : 0)}${def.unit ? ' ' + def.unit : ''}`
                } else {
                  display = String(rawVal) + (def.unit ? ' ' + def.unit : '')
                }

                return (
                  <div
                    key={`${spot.id}-${def.key}`}
                    style={{
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      background: rowIdx % 2 === 0 ? '#040810' : '#060c18',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: isBest ? '#00c87a' : '#8ab0cc',
                        fontWeight: isBest ? 700 : 400,
                        letterSpacing: '0.03em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {display}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
