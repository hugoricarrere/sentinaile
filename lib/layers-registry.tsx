import { ScatterplotLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import type { LayersList } from '@deck.gl/core'
import type { ReactNode } from 'react'
import type { GeoPoint } from './types'
import { hexToRgb } from './color'
import FlightPanel from '@/components/panels/FlightPanel'
import ShipPanel from '@/components/panels/ShipPanel'

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

interface ShipPoint {
  id: string; name: string; flag: string; type: string
  longitude: number; latitude: number
  speedKnots: number; courseDeg: number; destination: string; eta: string
}

interface AirPoint {
  id: string; name: string; longitude: number; latitude: number; aqi: number; parameter: string
}

interface WeatherPoint {
  id: string; name: string; longitude: number; latitude: number
  tempC: number; windKmh: number; precipitation: number
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
  {
    id: 'ships',
    label: 'Navires',
    icon: '🚢',
    color: '#00FF88',
    colorRgb: hexToRgb('#00FF88'),
    apiRoute: '/api/ships',
    pollIntervalMs: 60_000,
    defaultEnabled: true,
    transformResponse: (raw) => {
      const items = raw as ShipPoint[]
      return items.map(s => ({
        id: s.id,
        longitude: s.longitude,
        latitude: s.latitude,
        layerId: 'ships',
        data: s as unknown as Record<string, unknown>,
      }))
    },
    getDeckLayer: (points, onClick) =>
      new ScatterplotLayer<GeoPoint>({
        id: 'ships-layer',
        data: points,
        getPosition: (d) => [d.longitude, d.latitude],
        getColor: hexToRgb('#00FF88'),
        getRadius: 5000,
        radiusMinPixels: 2,
        radiusMaxPixels: 7,
        pickable: true,
        onClick: ({ object }) => { if (object) onClick(object) },
      }),
    renderContextPanel: (point) => <ShipPanel point={point} />,
  },
  {
    id: 'air',
    label: 'Qualité air',
    icon: '💨',
    color: '#FF6B35',
    colorRgb: hexToRgb('#FF6B35'),
    apiRoute: '/api/air',
    pollIntervalMs: 600_000,
    defaultEnabled: false,
    transformResponse: (raw) => {
      const items = raw as AirPoint[]
      return items.map(a => ({
        id: a.id, longitude: a.longitude, latitude: a.latitude,
        layerId: 'air',
        data: { name: a.name, aqi: a.aqi, parameter: a.parameter } as Record<string, unknown>,
      }))
    },
    getDeckLayer: (points) =>
      new HeatmapLayer<GeoPoint>({
        id: 'air-layer',
        data: points,
        getPosition: (d) => [d.longitude, d.latitude],
        getWeight: (d) => (d.data as { aqi: number }).aqi,
        radiusPixels: 60,
      }),
    renderContextPanel: (point) => {
      const d = point.data as { name: string; aqi: number; parameter: string }
      return (
        <div className="space-y-2">
          <p className="text-[#FF6B35] text-sm font-bold">{d.name}</p>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#4a6fa5]">PARAMÈTRE</span>
            <span className="text-[#a0c4d8]">{d.parameter.toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#4a6fa5]">VALEUR</span>
            <span className="text-[#a0c4d8]">{d.aqi} µg/m³</span>
          </div>
        </div>
      )
    },
  },
  {
    id: 'weather',
    label: 'Météo',
    icon: '🌦',
    color: '#B388FF',
    colorRgb: hexToRgb('#B388FF'),
    apiRoute: '/api/weather',
    pollIntervalMs: 600_000,
    defaultEnabled: false,
    transformResponse: (raw) => {
      const items = raw as WeatherPoint[]
      return items.map(w => ({
        id: w.id, longitude: w.longitude, latitude: w.latitude,
        layerId: 'weather',
        data: w as unknown as Record<string, unknown>,
      }))
    },
    getDeckLayer: (points, onClick) =>
      new ScatterplotLayer<GeoPoint>({
        id: 'weather-layer',
        data: points,
        getPosition: (d) => [d.longitude, d.latitude],
        getColor: (d) => {
          const t = (d.data as { tempC: number }).tempC
          if (t > 30) return [255, 100, 50, 200]
          if (t > 20) return [255, 200, 100, 200]
          if (t > 10) return [179, 136, 255, 200]
          if (t > 0) return [100, 160, 255, 200]
          return [200, 230, 255, 200]
        },
        getRadius: 80_000,
        radiusMinPixels: 6,
        radiusMaxPixels: 18,
        opacity: 0.7,
        pickable: true,
        onClick: ({ object }) => { if (object) onClick(object) },
      }),
    renderContextPanel: (point) => {
      const d = point.data as { name: string; tempC: number; windKmh: number; precipitation: number }
      return (
        <div className="space-y-2">
          <p className="text-[#B388FF] text-sm font-bold">{d.name}</p>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#4a6fa5]">TEMPÉRATURE</span>
            <span className="text-[#a0c4d8]">{Math.round(d.tempC)}°C</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#4a6fa5]">VENT</span>
            <span className="text-[#a0c4d8]">{Math.round(d.windKmh)} km/h</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#4a6fa5]">PRÉCIP</span>
            <span className="text-[#a0c4d8]">{d.precipitation} mm</span>
          </div>
        </div>
      )
    },
  },
]
