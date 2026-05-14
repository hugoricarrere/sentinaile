'use client'
import { LAYERS } from '@/lib/layers-registry'
import type { GeoPoint } from '@/lib/types'

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
        padding: '12px 18px 10px',
        background: '#040810',
        borderBottom: '1px solid #111c2e',
      }}>
        <span style={{
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.28em',
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
            color: '#4a6a8a',
            width: 26,
            height: 26,
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 16,
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
            ;(e.target as HTMLButtonElement).style.color = '#4a6a8a'
          }}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      {/* Panel content */}
      <div style={{ padding: '16px 18px', fontSize: 13 }}>
        {layer ? (
          layer.renderContextPanel(point)
        ) : (
          <span style={{ fontFamily: 'var(--font-rajdhani)', color: '#4a6a8a', fontSize: 14 }}>
            Données non disponibles
          </span>
        )}
      </div>
    </div>
  )
}
