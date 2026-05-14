'use client'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'

interface Props {
  layerStates: LayerStates
  viewState: { longitude: number; latitude: number; zoom: number }
}

export default function StatusBar({ layerStates, viewState }: Props) {
  const connected = LAYERS.filter(
    l => layerStates[l.id]?.lastUpdated !== null
  ).length
  const staleCount = LAYERS.filter(l => layerStates[l.id]?.stale).length

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 flex items-center gap-6 px-4 h-7 bg-[#07111f]/90 border-t border-[#1a2840] text-[10px] text-[#2a4a6a] tracking-wider">
      <span className="text-[#00ff88]">● LIVE</span>
      <span>
        {connected}/{LAYERS.length} SOURCES
      </span>
      {staleCount > 0 && (
        <span className="text-[#FFB347]">⚠ {staleCount} STALE</span>
      )}
      <span className="ml-auto">
        LAT {viewState.latitude.toFixed(2)} LON {viewState.longitude.toFixed(2)}{' '}
        ZOOM {viewState.zoom.toFixed(1)}
      </span>
    </footer>
  )
}
