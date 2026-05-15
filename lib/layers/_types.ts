import type { LayersList } from '@deck.gl/core'
import type { ReactNode } from 'react'
import type { GeoPoint } from '@/lib/types'

/** Called when the user clicks a cluster — map should zoom into those coordinates. */
export type FlyToCluster = (longitude: number, latitude: number, currentZoom: number) => void

export interface LayerConfig {
  id: string
  label: string
  icon: string
  color: string
  colorRgb: [number, number, number]
  apiRoute: string
  pollIntervalMs: number
  defaultEnabled: boolean
  /**
   * @param points       Filtered points to render
   * @param onClick      Called when the user clicks an individual point
   * @param zoom         Current map zoom level (default 5)
   * @param onFlyTo      Optional — called when the user clicks a cluster to zoom in
   */
  getDeckLayer: (
    points: GeoPoint[],
    onClick: (point: GeoPoint) => void,
    zoom?: number,
    onFlyTo?: FlyToCluster,
  ) => LayersList
  renderContextPanel: (point: GeoPoint) => ReactNode
  transformResponse: (raw: unknown) => GeoPoint[]
}
