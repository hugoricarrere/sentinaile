'use client'
import { useEffect, useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'

interface Props {
  layerStates: LayerStates
}

export default function TopBar({ layerStates }: Props) {
  const [utc, setUtc] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setUtc(now.toUTCString().slice(17, 25) + ' UTC')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const activeLayers = LAYERS.filter(
    l => (layerStates[l.id]?.points.length ?? 0) > 0
  )

  return (
    <header className="fixed top-0 left-0 right-0 z-10 flex items-center gap-4 px-4 h-10 bg-[#07111f]/95 border-b border-[#1a2840]">
      <span className="text-[#00D4FF] tracking-[0.2em] text-xs font-bold">
        SentinAile
      </span>
      <span className="w-2 h-2 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF] animate-pulse" />
      <div className="flex gap-4 ml-2">
        {activeLayers.map(l => (
          <span
            key={l.id}
            className="text-[10px] tracking-wider"
            style={{ color: l.color }}
          >
            {l.icon} {layerStates[l.id]?.points.length.toLocaleString()}
          </span>
        ))}
      </div>
      <span className="ml-auto text-[10px] text-[#4a6fa5] tracking-wider">
        {utc}
      </span>
    </header>
  )
}
