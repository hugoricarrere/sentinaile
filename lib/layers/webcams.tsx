import { ScatterplotLayer } from '@deck.gl/layers'
import type { GeoPoint } from '@/lib/types'
import { hexToRgb } from '@/lib/color'
import { POLL_MEDIUM_MS } from '@/lib/constants'
import WebcamPanel from '@/components/panels/WebcamPanel'
import type { LayerConfig } from './_types'

interface WebcamPoint {
  id: string; title: string; longitude: number; latitude: number
  city: string; country: string; streamUrl: string | null
}

const COLOR = '#FFD700'

export const webcamsLayer: LayerConfig = {
  id: 'webcams',
  label: 'Webcams',
  icon: '📷',
  color: COLOR,
  colorRgb: hexToRgb(COLOR),
  apiRoute: '/api/webcams',
  pollIntervalMs: POLL_MEDIUM_MS,
  defaultEnabled: false,
  transformResponse: (raw) => {
    const items = raw as WebcamPoint[]
    return items.map(w => ({
      id: w.id, longitude: w.longitude, latitude: w.latitude,
      layerId: 'webcams',
      data: w as unknown as Record<string, unknown>,
    }))
  },
  getDeckLayer: (points, onClick) => [
    new ScatterplotLayer<GeoPoint>({
      id: 'webcams-layer',
      data: points,
      getPosition: (d) => [d.longitude, d.latitude],
      getColor: hexToRgb(COLOR),
      getRadius: 8000,
      radiusMinPixels: 3,
      radiusMaxPixels: 8,
      pickable: true,
      onClick: ({ object }) => { if (object) onClick(object) },
    }),
  ],
  renderContextPanel: (point) => <WebcamPanel point={point} />,
}
