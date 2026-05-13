import { ScatterplotLayer } from '@deck.gl/layers'
import type { LayersList } from '@deck.gl/core'
import type { ReactNode } from 'react'
import type { GeoPoint } from './types'
import { hexToRgb } from './color'
import FlightPanel from '@/components/panels/FlightPanel'

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

export const LAYERS: LayerConfig[] = [
  {
    id: 'flights',
    label: 'Vols',
    icon: '✈',
    color: '#00D4FF',
    colorRgb: hexToRgb('#00D4FF'),
    apiRoute: '/api/flights',
    pollIntervalMs: 30_000,
    defaultEnabled: true,
    transformResponse: (raw) => {
      const items = raw as {
        id: string
        longitude: number
        latitude: number
        callsign: string
        origin: string
        altitudeM: number
        velocityMs: number
        headingDeg: number
      }[]
      return items.map(f => ({
        id: f.id,
        longitude: f.longitude,
        latitude: f.latitude,
        layerId: 'flights',
        data: {
          callsign: f.callsign,
          origin: f.origin,
          altitudeM: f.altitudeM,
          velocityMs: f.velocityMs,
          headingDeg: f.headingDeg,
        },
      }))
    },
    getDeckLayer: (points, onClick) =>
      new ScatterplotLayer<GeoPoint>({
        id: 'flights-layer',
        data: points,
        getPosition: (d: GeoPoint) => [d.longitude, d.latitude],
        getColor: hexToRgb('#00D4FF'),
        getRadius: 4000,
        radiusMinPixels: 2,
        radiusMaxPixels: 6,
        pickable: true,
        onClick: ({ object }) => {
          if (object) onClick(object)
        },
      }),
    renderContextPanel: (point) => <FlightPanel point={point} />,
  },
]
