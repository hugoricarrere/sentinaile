'use client'
import { LAYERS } from '@/lib/layers'
import type { GeoPoint } from '@/lib/types'
import { ErrorBoundary } from './ErrorBoundary'

interface Props {
  point: GeoPoint
  onClose: () => void
}

export default function ContextPanel({ point, onClose }: Props) {
  const layer = LAYERS.find(l => l.id === point.layerId)

  return (
    <div className="panel-fade-in" style={{ borderTop: '1px solid #1a2840' }}>
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px 8px',
        background: '#040810',
        borderBottom: '1px solid #111c2e',
      }}>
        <span style={{
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: '0.25em',
          color: layer?.color ?? '#00D4FF',
          textTransform: 'uppercase',
        }}>
          {layer?.icon}&nbsp; Détail
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid #1a2840',
            color: '#2a4a6a',
            width: 22,
            height: 22,
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.borderColor = layer?.color ?? '#00D4FF'
            ;(e.target as HTMLButtonElement).style.color = layer?.color ?? '#00D4FF'
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.borderColor = '#1a2840'
            ;(e.target as HTMLButtonElement).style.color = '#2a4a6a'
          }}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      {/* Panel content */}
      <div style={{ padding: '14px 16px', fontSize: 12 }}>
        <ErrorBoundary>
          {layer ? (
            layer.renderContextPanel(point)
          ) : (
            <span style={{ fontFamily: 'var(--font-rajdhani)', color: '#2a4a6a' }}>
              Données non disponibles
            </span>
          )}
        </ErrorBoundary>
      </div>
    </div>
  )
}
