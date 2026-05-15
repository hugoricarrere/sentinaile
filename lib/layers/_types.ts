import type { LayersList } from '@deck.gl/core'
import type { ReactNode } from 'react'
import type { GeoPoint } from '@/lib/types'

export interface LayerConfig {
  id: string
  label: string
  icon: string
  color: string
  colorRgb: [number, number, number]
  apiRoute: string
  pollIntervalMs: number
  defaultEnabled: boolean
  getDeckLayer: (points: GeoPoint[], onClick: (point: GeoPoint) => void, zoom?: number) => LayersList
  renderContextPanel: (point: GeoPoint) => ReactNode
  transformResponse: (raw: unknown) => GeoPoint[]
}
