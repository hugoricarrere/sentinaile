'use client'
import { useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'

interface Props {
  enabledMap: Record<string, boolean>
  onToggle: (id: string, enabled: boolean) => void
  layerStates: LayerStates
}

export default function LayerToggle({ enabledMap, onToggle, layerStates }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className="border-b border-[#1a2840]">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full h-8 flex items-center justify-center text-[#4a6fa5] hover:text-[#00D4FF] border-b border-[#1a2840] text-xs transition-colors"
        aria-label={collapsed ? 'Expand layers' : 'Collapse layers'}
      >
        {collapsed ? '›' : '‹ LAYERS'}
      </button>
      {LAYERS.map(l => {
        const count = layerStates[l.id]?.points.length ?? 0
        const enabled = enabledMap[l.id] ?? l.defaultEnabled
        return (
          <button
            key={l.id}
            onClick={() => onToggle(l.id, !enabled)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-[10px] tracking-wider border-b border-[#1a2840]/50 hover:bg-[#1a2840]/30 transition-colors ${
              enabled ? 'opacity-100' : 'opacity-40'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: enabled ? l.color : '#2a4a6a' }}
            />
            {!collapsed && (
              <>
                <span
                  className="flex-1 text-left"
                  style={{ color: enabled ? l.color : '#4a6fa5' }}
                >
                  {l.label}
                </span>
                {count > 0 && (
                  <span className="text-[#4a6fa5]">
                    {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                  </span>
                )}
              </>
            )}
          </button>
        )
      })}
    </aside>
  )
}
