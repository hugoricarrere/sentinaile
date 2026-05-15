import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import type { GeoPoint } from '@/lib/types'
import { hexToRgb } from '@/lib/color'
import { POLL_WEATHER_MS } from '@/lib/constants'
import type { LayerConfig } from './_types'

interface AirPoint {
  id: string; name: string; longitude: number; latitude: number
  aqi: number; parameter: string
}

const COLOR = '#FF6B35'

export const airLayer: LayerConfig = {
  id: 'air',
  label: 'Qualité air',
  icon: '💨',
  color: COLOR,
  colorRgb: hexToRgb(COLOR),
  apiRoute: '/api/air',
  pollIntervalMs: POLL_WEATHER_MS,
  defaultEnabled: false,
  transformResponse: (raw) => {
    const items = raw as AirPoint[]
    return items.map(a => ({
      id: a.id, longitude: a.longitude, latitude: a.latitude,
      layerId: 'air',
      data: { name: a.name, aqi: a.aqi, parameter: a.parameter } as Record<string, unknown>,
    }))
  },
  getDeckLayer: (points) => [
    new HeatmapLayer<GeoPoint>({
      id: 'air-layer',
      data: points,
      getPosition: (d) => [d.longitude, d.latitude],
      getWeight: (d) => (d.data as { aqi: number }).aqi,
      radiusPixels: 60,
    }),
  ],
  renderContextPanel: (point) => {
    const d = point.data as { name: string; aqi: number; parameter: string }
    return (
      <div className="space-y-2">
        <p style={{ color: COLOR }} className="text-sm font-bold font-display">{d.name}</p>
        <div className="flex justify-between text-[11px] font-display">
          <span className="text-label">PARAMÈTRE</span>
          <span className="text-data">{d.parameter.toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-[11px] font-display">
          <span className="text-label">VALEUR</span>
          <span className="text-data">{d.aqi} µg/m³</span>
        </div>
      </div>
    )
  },
}
