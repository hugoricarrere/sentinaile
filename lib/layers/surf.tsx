import { ScatterplotLayer } from '@deck.gl/layers'
import type { GeoPoint } from '@/lib/types'
import { hexToRgb } from '@/lib/color'
import { POLL_SURF_MS } from '@/lib/constants'
import SurfPanel from '@/components/panels/SurfPanel'
import type { LayerConfig } from './_types'

interface SurfResult {
  id: string; longitude: number; latitude: number; name: string
  country: string; level: string; breakType: string; score: number
  swellHeightM: number; swellPeriodS: number; windKmh: number; windOffshore: boolean
}

const COLOR = '#00CED1'

export const surfLayer: LayerConfig = {
  id: 'surf',
  label: 'Surf',
  icon: '🏄',
  color: COLOR,
  colorRgb: hexToRgb(COLOR),
  apiRoute: '/api/surf',
  pollIntervalMs: POLL_SURF_MS,
  defaultEnabled: true,
  transformResponse: (raw) => {
    const items = raw as SurfResult[]
    return items.map(s => ({
      id: s.id, longitude: s.longitude, latitude: s.latitude,
      layerId: 'surf',
      data: s as unknown as Record<string, unknown>,
    }))
  },
  getDeckLayer: (points, onClick) => [
    new ScatterplotLayer<GeoPoint>({
      id: 'surf-layer',
      data: points,
      getPosition: (d) => [d.longitude, d.latitude],
      getColor: (d) => {
        const score = (d.data as { score: number }).score
        if (score >= 7) return [0, 255, 136, 255]
        if (score >= 4) return [255, 179, 71, 255]
        return [255, 107, 53, 255]
      },
      getRadius: 15_000,
      radiusMinPixels: 4,
      radiusMaxPixels: 12,
      pickable: true,
      onClick: ({ object }) => { if (object) onClick(object) },
    }),
  ],
  renderContextPanel: (point) => <SurfPanel point={point} />,
}
