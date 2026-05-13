import type { LayersList } from '@deck.gl/core'
import type { ReactNode } from 'react'
import type { GeoPoint } from './types'

export interface LayerConfig {
  id: string
  label: string
  icon: string
  color: string
  colorRgb: [number, number, number]
  apiRoute: string
  pollIntervalMs: number
  defaultEnabled: boolean
  getDeckLayer: (points: GeoPoint[], onClick: (point: GeoPoint) => void) => LayersList[number] | null
  renderContextPanel: (point: GeoPoint) => ReactNode
  transformResponse: (raw: unknown) => GeoPoint[]
}

// Registry populated incrementally in Tasks 9-17.
// MapCanvas, LayerToggle, and StatusBar auto-discover layers from this array.
export const LAYERS: LayerConfig[] = []
