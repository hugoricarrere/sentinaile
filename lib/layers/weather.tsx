import { ScatterplotLayer } from '@deck.gl/layers'
import type { GeoPoint } from '@/lib/types'
import { hexToRgb } from '@/lib/color'
import { POLL_WEATHER_MS } from '@/lib/constants'
import type { LayerConfig } from './_types'

interface WeatherPoint {
  id: string; name: string; longitude: number; latitude: number
  tempC: number; windKmh: number; precipitation: number
}

const COLOR = '#B388FF'

export const weatherLayer: LayerConfig = {
  id: 'weather',
  label: 'Météo',
  icon: '🌦',
  color: COLOR,
  colorRgb: hexToRgb(COLOR),
  apiRoute: '/api/weather',
  pollIntervalMs: POLL_WEATHER_MS,
  defaultEnabled: false,
  transformResponse: (raw) => {
    const items = raw as WeatherPoint[]
    return items.map(w => ({
      id: w.id, longitude: w.longitude, latitude: w.latitude,
      layerId: 'weather',
      data: w as unknown as Record<string, unknown>,
    }))
  },
  getDeckLayer: (points, onClick) => [
    new ScatterplotLayer<GeoPoint>({
      id: 'weather-layer',
      data: points,
      getPosition: (d) => [d.longitude, d.latitude],
      getColor: (d) => {
        const t = (d.data as { tempC: number }).tempC
        if (t > 30) return [255, 100, 50, 200]
        if (t > 20) return [255, 200, 100, 200]
        if (t > 10) return [179, 136, 255, 200]
        if (t > 0)  return [100, 160, 255, 200]
        return [200, 230, 255, 200]
      },
      getRadius: 80_000,
      radiusMinPixels: 6,
      radiusMaxPixels: 18,
      opacity: 0.7,
      pickable: true,
      onClick: ({ object }) => { if (object) onClick(object) },
    }),
  ],
  renderContextPanel: (point) => {
    const d = point.data as { name: string; tempC: number; windKmh: number; precipitation: number }
    return (
      <div className="space-y-2">
        <p style={{ color: COLOR }} className="text-sm font-bold font-display">{d.name}</p>
        <div className="flex justify-between text-[11px] font-display">
          <span className="text-label">TEMPÉRATURE</span>
          <span className="text-data">{Math.round(d.tempC)}°C</span>
        </div>
        <div className="flex justify-between text-[11px] font-display">
          <span className="text-label">VENT</span>
          <span className="text-data">{Math.round(d.windKmh)} km/h</span>
        </div>
        <div className="flex justify-between text-[11px] font-display">
          <span className="text-label">PRÉCIP</span>
          <span className="text-data">{d.precipitation} mm</span>
        </div>
      </div>
    )
  },
}
