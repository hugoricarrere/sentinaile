'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import type { GeoPoint } from '@/lib/types'
import type { LayerStates } from '@/lib/use-layer-data'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false })

const defaultEnabled = () =>
  Object.fromEntries(LAYERS.map(l => [l.id, l.defaultEnabled]))

export default function Home() {
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(defaultEnabled)
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null)
  const [viewState, setViewState] = useState({ longitude: 2.3, latitude: 20, zoom: 2 })
  const [layerStates, setLayerStates] = useState<LayerStates>({})

  const isFranceView =
    viewState.zoom >= 5 &&
    viewState.longitude > -5 &&
    viewState.longitude < 10 &&
    viewState.latitude > 41 &&
    viewState.latitude < 52

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#070B14] font-mono">
      <MapCanvas
        enabledMap={enabledMap}
        onPointClick={setSelectedPoint}
        onViewStateChange={setViewState}
        onLayerStatesChange={setLayerStates}
      />
    </main>
  )
}
