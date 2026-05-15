'use client'
import { useState } from 'react'
import { LAYERS } from '@/lib/layers'
import type { LayerStates } from '@/lib/use-layer-data'
import type { AllFilters } from '@/lib/filters'
import { applyFilters } from '@/lib/filters'
import FilterPanel from '@/components/FilterPanel'

const FILTERABLE = new Set(['skydive', 'paragliding', 'basejump'])

interface Props {
  enabledMap: Record<string, boolean>
  onToggle: (id: string, enabled: boolean) => void
  layerStates: LayerStates
  filters: AllFilters
  onFiltersChange: (f: AllFilters) => void
  activeFilterLayer: string | null
  onFilterLayer: (id: string | null) => void
  onRefreshLayer?: (id: string) => void
  onResetLayers?: () => void
}

const SectionHeader = ({ label }: { label: string }) => (
  <div style={{
    padding: '10px 16px 8px',
    fontFamily: 'var(--font-rajdhani)',
    fontWeight: 600,
    fontSize: 10,
    letterSpacing: '0.25em',
    color: '#2a4a6a',
    textTransform: 'uppercase',
    borderBottom: '1px solid #111c2e',
    background: '#040810',
  }}>
    {label}
  </div>
)

export default function LayerToggle({
  enabledMap, onToggle, layerStates,
  filters, onFiltersChange, activeFilterLayer, onFilterLayer,
  onRefreshLayer, onResetLayers,
}: Props) {
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const disabledCount = LAYERS.filter(l => !(enabledMap[l.id] ?? l.defaultEnabled)).length

  return (
    <div style={{ borderBottom: '1px solid #1a2840', position: 'relative' }}>
    {/* Error toast overlay */}
    {errorToast && (
      <div
        role="alert"
        onClick={() => setErrorToast(null)}
        style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'rgba(4,8,16,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, cursor: 'pointer',
        }}
      >
        <div style={{
          background: '#0a0e1a',
          border: '1px solid #cc3a2060',
          borderRadius: 4,
          padding: '12px 16px',
          fontFamily: 'var(--font-rajdhani)',
          fontSize: 13,
          color: '#cc3a20',
          textAlign: 'center',
          lineHeight: 1.5,
          maxWidth: 220,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ Erreur de couche</div>
          <div style={{ color: '#8aaccc', fontSize: 11 }}>{errorToast}</div>
          <div style={{ marginTop: 8, fontSize: 10, color: '#2a4a6a' }}>Appuyer pour fermer</div>
        </div>
      </div>
    )}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 8px',
        borderBottom: '1px solid #111c2e',
        background: '#040810',
      }}>
        <span style={{
          fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 10,
          letterSpacing: '0.25em', color: '#2a4a6a', textTransform: 'uppercase',
        }}>Couches de données</span>
        {disabledCount > 0 && onResetLayers && (
          <button
            onClick={onResetLayers}
            title="Réactiver toutes les couches"
            style={{
              background: 'none', border: '1px solid #1a2840', borderRadius: 3,
              color: '#2a4a6a', cursor: 'pointer',
              fontFamily: 'var(--font-rajdhani)', fontWeight: 600,
              fontSize: 9, letterSpacing: '0.12em',
              padding: '2px 6px', textTransform: 'uppercase',
              transition: 'border-color 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = '#00D4FF'; (e.currentTarget).style.color = '#00D4FF' }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = '#1a2840'; (e.currentTarget).style.color = '#2a4a6a' }}
          >
            ↺ Tout activer
          </button>
        )}
      </div>
      {LAYERS.map(l => {
        const state = layerStates[l.id]
        const count = state?.points.length ?? 0
        const enabled = enabledMap[l.id] ?? l.defaultEnabled
        const filterable = FILTERABLE.has(l.id)
        const filterOpen = activeFilterLayer === l.id
        const isLoading = enabled && state?.lastUpdated === null && !state?.error
        const hasError  = enabled && !!state?.error
        const isEmpty   = enabled && state?.lastUpdated !== null && count === 0 && !state?.error

        return (
          <div key={l.id}>
            <div style={{
              display: 'flex',
              alignItems: 'stretch',
              borderBottom: '1px solid #0d1826',
              background: enabled ? `${l.color}08` : 'transparent',
              transition: 'background 0.15s',
            }}>
              {/* Main toggle button */}
              <button
                onClick={() => onToggle(l.id, !enabled)}
                aria-pressed={enabled}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0 12px 0 16px',
                  height: 44,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {/* Color indicator bar */}
                <span style={{
                  width: 3,
                  height: 22,
                  borderRadius: 2,
                  background: enabled ? l.color : '#1a2840',
                  flexShrink: 0,
                  boxShadow: enabled ? `0 0 8px ${l.color}60` : 'none',
                  transition: 'background 0.15s, box-shadow 0.15s',
                }} />

                {/* Icon */}
                <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{l.icon}</span>

                {/* Layer name */}
                <span style={{
                  fontFamily: 'var(--font-rajdhani)',
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: '0.05em',
                  color: enabled ? '#b8cde0' : '#2a4a6a',
                  flex: 1,
                  transition: 'color 0.15s',
                }}>
                  {l.label}
                </span>

                {/* Loading indicator */}
                {isLoading && (
                  <span title="Chargement…" style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: '#3a6a8a',
                    flexShrink: 0,
                    animation: 'pulse 1.2s ease-in-out infinite',
                  }}>
                    ···
                  </span>
                )}

                {/* Error indicator — clickable to show full message + retry */}
                {hasError && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setErrorToast(state?.error ?? 'Erreur inconnue')
                    }}
                    aria-label={`Erreur : ${state?.error ?? 'Erreur inconnue'}. Cliquer pour détails.`}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: '#cc3a20', flexShrink: 0, cursor: 'pointer',
                    }}
                  >
                    ⚠
                  </button>
                )}

                {/* Empty indicator (layer loaded but 0 points — e.g. webcam without API key) */}
                {isEmpty && (
                  <span title="Aucune donnée (clé API manquante ?)" style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: '#2a4060',
                    flexShrink: 0,
                    cursor: 'help',
                  }}>
                    —
                  </span>
                )}

                {/* Count badge */}
                {count > 0 && enabled && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: l.color,
                    background: `${l.color}15`,
                    padding: '1px 6px',
                    borderRadius: 3,
                    flexShrink: 0,
                    letterSpacing: '0.04em',
                  }}>
                    {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                  </span>
                )}
              </button>

              {/* Refresh button — only shown when layer has an error */}
              {hasError && onRefreshLayer && (
                <button
                  onClick={e => { e.stopPropagation(); onRefreshLayer(l.id) }}
                  title="Relancer la récupération des données"
                  aria-label="Réessayer"
                  style={{
                    width: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none',
                    borderLeft: '1px solid #0d1826',
                    cursor: 'pointer', color: '#cc3a20',
                    fontSize: 13, flexShrink: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.color = '#ff5530' }}
                  onMouseLeave={e => { (e.currentTarget).style.color = '#cc3a20' }}
                >
                  ↺
                </button>
              )}

              {/* Filter icon button */}
              {filterable && !hasError && (
                <button
                  onClick={() => onFilterLayer(filterOpen ? null : l.id)}
                  title="Filtres"
                  aria-label={`Filtres ${l.label}`}
                  style={{
                    width: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: filterOpen ? `${l.color}22` : 'none',
                    border: 'none',
                    borderLeft: `1px solid ${filterOpen ? l.color + '40' : '#0d1826'}`,
                    cursor: 'pointer',
                    color: filterOpen ? l.color : '#2a4a6a',
                    fontSize: 13,
                    flexShrink: 0,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  ⚙
                </button>
              )}
            </div>

            {/* Inline filter panel */}
            {filterable && filterOpen && (
              <FilterPanel
                layerId={l.id}
                filters={filters}
                onChange={onFiltersChange}
                onClose={() => onFilterLayer(null)}
                color={l.color}
                totalCount={count}
                visibleCount={applyFilters(state?.points ?? [], l.id, filters).length}
              />
            )}
          </div>
        )
      })}

      {/* Scroll fade indicator — hints that there's more content below */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        height: 24,
        background: 'linear-gradient(to bottom, transparent, #0B1120)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}
