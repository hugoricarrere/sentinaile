import { ScatterplotLayer } from '@deck.gl/layers'
import type { GeoPoint } from '@/lib/types'
import { hexToRgb } from '@/lib/color'
import { POLL_FLIGHTS_MS } from '@/lib/constants'
import FlightPanel from '@/components/panels/FlightPanel'
import type { LayerConfig } from './_types'

interface FlightData {
  callsign: string; origin: string
  altitudeM: number; velocityMs: number; headingDeg: number
}

const COLOR = '#00D4FF'

export const flightsLayer: LayerConfig = {
  id: 'flights',
  label: 'Vols',
  icon: '✈️',
  color: COLOR,
  colorRgb: hexToRgb(COLOR),
  apiRoute: '/api/flights',
  pollIntervalMs: POLL_FLIGHTS_MS,
  defaultEnabled: false,
  transformResponse: (raw) => {
    const items = raw as (FlightData & { id: string; longitude: number; latitude: number })[]
    return items.map(f => ({
      id: f.id, longitude: f.longitude, latitude: f.latitude,
      layerId: 'flights',
      data: f as unknown as Record<string, unknown>,
    }))
  },
  getDeckLayer: (points, onClick) => [
    new ScatterplotLayer<GeoPoint>({
      id: 'flights-layer',
      data: points,
      getPosition: (d) => [d.longitude, d.latitude],
      getColor: (d) => {
        const alt = (d.data as { altitudeM: number }).altitudeM
        if (alt > 10_000) return [0, 200, 255, 220]
        if (alt > 5_000)  return [0, 220, 255, 200]
        return [0, 212, 255, 180]
      },
      getRadius: 5_000,
      radiusMinPixels: 2,
      radiusMaxPixels: 6,
      pickable: true,
      onClick: ({ object }) => { if (object) onClick(object) },
    }),
  ],
  renderContextPanel: (point) => <FlightPanel point={point} />,
}
