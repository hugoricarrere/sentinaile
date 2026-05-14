'use client'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'
import type { AllFilters } from '@/lib/filters'
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
}

const SectionHeader = ({ label }: { label: string }) => (
  <div style={{
    padding: '12px 18px 10px',
    fontFamily: 'var(--font-rajdhani)',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.28em',
    color: '#4a6a8a',
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
}: Props) {
  return (
    <div style={{ borderBottom: '1px solid #1a2840' }}>
      <SectionHeader label="Couches de données" />
      {LAYERS.map(l => {
        const count = layerStates[l.id]?.points.length ?? 0
        const enabled = enabledMap[l.id] ?? l.defaultEnabled
        const filterable = FILTERABLE.has(l.id)
        const filterOpen = activeFilterLayer === l.id

        return (
          <div key={l.id}>
            <div style={{
              display: 'flex',
              alignItems: 'stretch',
              borderBottom: '1px solid #0d1826',
              background: enabled ? `${l.color}0a` : 'transparent',
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
                  gap: 12,
                  padding: '0 12px 0 18px',
                  height: 50,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {/* Color indicator bar */}
                <span style={{
                  width: 3,
                  height: 26,
                  borderRadius: 2,
                  background: enabled ? l.color : '#1a2840',
                  flexShrink: 0,
                  boxShadow: enabled ? `0 0 10px ${l.color}70` : 'none',
                  transition: 'background 0.15s, box-shadow 0.15s',
                }} />

                {/* Icon */}
                <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{l.icon}</span>

                {/* Layer name */}
                <span style={{
                  fontFamily: 'var(--font-rajdhani)',
                  fontWeight: 600,
                  fontSize: 16,
                  letterSpacing: '0.04em',
                  color: enabled ? '#c8dff0' : '#3a5a7a',
                  flex: 1,
                  transition: 'color 0.15s',
                }}>
                  {l.label}
                </span>

                {/* Count badge */}
                {count > 0 && enabled && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: l.color,
                    background: `${l.color}18`,
                    padding: '2px 8px',
                    borderRadius: 3,
                    flexShrink: 0,
                    letterSpacing: '0.04em',
                    border: `1px solid ${l.color}30`,
                  }}>
                    {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                  </span>
                )}
              </button>

              {/* Filter icon button */}
              {filterable && (
                <button
                  onClick={() => onFilterLayer(filterOpen ? null : l.id)}
                  title="Filtres"
                  style={{
                    width: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: filterOpen ? `${l.color}25` : 'none',
                    border: 'none',
                    borderLeft: `1px solid ${filterOpen ? l.color + '50' : '#0d1826'}`,
                    cursor: 'pointer',
                    color: filterOpen ? l.color : '#3a5a7a',
                    fontSize: 15,
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
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
