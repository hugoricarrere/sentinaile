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
    <aside className="border-t border-[#1a2840]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2840] bg-[#0d1628]">
        <span
          className="text-[10px] tracking-[0.15em] uppercase"
          style={{ color: layer?.color ?? '#00D4FF' }}
        >
          {layer?.icon} {layer?.label}
        </span>
        <button
          onClick={onClose}
          className="text-[#4a6fa5] hover:text-[#00D4FF] text-lg leading-none transition-colors"
          aria-label="Close panel"
        >
          ×
        </button>
      </div>
      <div className="p-3 text-xs text-[#7a9ac0]">
        {layer ? (
          layer.renderContextPanel(point)
        ) : (
          <span className="text-[#4a6fa5]">Données non disponibles</span>
        )}
      </div>
    </aside>
  )
}
