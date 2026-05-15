import { ScatterplotLayer } from '@deck.gl/layers'
import type { GeoPoint } from '@/lib/types'
import { hexToRgb } from '@/lib/color'
import { POLL_SHIPS_MS } from '@/lib/constants'
import ShipPanel from '@/components/panels/ShipPanel'
import type { LayerConfig } from './_types'

interface ShipData {
  name: string; callSign: string; shipType: string
  speedKnots: number; courseDeg: number; headingDeg: number; destination: string
}

const COLOR = '#00FF88'

export const shipsLayer: LayerConfig = {
  id: 'ships',
  label: 'Navires',
  icon: '🚢',
  color: COLOR,
  colorRgb: hexToRgb(COLOR),
  apiRoute: '/api/ships',
  pollIntervalMs: POLL_SHIPS_MS,
  defaultEnabled: false,
  transformResponse: (raw) => {
    const items = raw as (ShipData & { id: string; longitude: number; latitude: number })[]
    return items.map(s => ({
      id: s.id, longitude: s.longitude, latitude: s.latitude,
      layerId: 'ships',
      data: s as unknown as Record<string, unknown>,
    }))
  },
  getDeckLayer: (points, onClick) => [
    new ScatterplotLayer<GeoPoint>({
      id: 'ships-layer',
      data: points,
      getPosition: (d) => [d.longitude, d.latitude],
      getColor: (d) => {
        const speed = (d.data as { speedKnots: number }).speedKnots
        if (speed > 15) return [0, 255, 136, 255]
        if (speed > 5)  return [0, 200, 100, 220]
        return [0, 150, 80, 180]
      },
      getRadius: 8_000,
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      pickable: true,
      onClick: ({ object }) => { if (object) onClick(object) },
    }),
  ],
  renderContextPanel: (point) => <ShipPanel point={point} />,
}
