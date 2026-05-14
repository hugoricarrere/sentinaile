import { ScatterplotLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import type { LayersList } from '@deck.gl/core'
import type { ReactNode } from 'react'
import type { GeoPoint } from './types'
import { hexToRgb } from './color'
import WebcamPanel from '@/components/panels/WebcamPanel'
import SurfPanel from '@/components/panels/SurfPanel'
import SkydivePanel from '@/components/panels/SkydivePanel'
import ParaglidingPanel from '@/components/panels/ParaglidingPanel'
import BasejumpPanel from '@/components/panels/BasejumpPanel'

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

interface AirPoint {
  id: string; name: string; longitude: number; latitude: number; aqi: number; parameter: string
}

interface WeatherPoint {
  id: string; name: string; longitude: number; latitude: number
  tempC: number; windKmh: number; precipitation: number
}

interface WebcamPoint {
  id: string; title: string; longitude: number; latitude: number
  city: string; country: string; streamUrl: string | null
}

interface SurfResult {
  id: string; longitude: number; latitude: number; name: string
  country: string; level: string; breakType: string; score: number
  swellHeightM: number; swellPeriodS: number; windKmh: number; windOffshore: boolean
}

export const LAYERS: LayerConfig[] = [
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
  {
    id: 'webcams',
    label: 'Webcams',
    icon: '📷',
    color: '#FFD700',
    colorRgb: hexToRgb('#FFD700'),
    apiRoute: '/api/webcams',
    pollIntervalMs: 300_000,
    defaultEnabled: false,
    transformResponse: (raw) => {
      const items = raw as WebcamPoint[]
      return items.map(w => ({
        id: w.id, longitude: w.longitude, latitude: w.latitude,
        layerId: 'webcams',
        data: w as unknown as Record<string, unknown>,
      }))
    },
    getDeckLayer: (points, onClick) =>
      new ScatterplotLayer<GeoPoint>({
        id: 'webcams-layer',
        data: points,
        getPosition: (d) => [d.longitude, d.latitude],
        getColor: hexToRgb('#FFD700'),
        getRadius: 8000,
        radiusMinPixels: 3,
        radiusMaxPixels: 8,
        pickable: true,
        onClick: ({ object }) => { if (object) onClick(object) },
      }),
    renderContextPanel: (point) => <WebcamPanel point={point} />,
  },
  {
    id: 'surf',
    label: 'Surf',
    icon: '🏄',
    color: '#00CED1',
    colorRgb: hexToRgb('#00CED1'),
    apiRoute: '/api/surf',
    pollIntervalMs: 1_800_000,
    defaultEnabled: true,
    transformResponse: (raw) => {
      const items = raw as SurfResult[]
      return items.map(s => ({
        id: s.id, longitude: s.longitude, latitude: s.latitude,
        layerId: 'surf',
        data: s as unknown as Record<string, unknown>,
      }))
    },
    getDeckLayer: (points, onClick) =>
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
    renderContextPanel: (point) => <SurfPanel point={point} />,
  },
  {
    id: 'skydive',
    label: 'Parachutisme',
    icon: '🪂',
    color: '#FF4500',
    colorRgb: hexToRgb('#FF4500'),
    apiRoute: '/api/skydive',
    pollIntervalMs: 600_000,
    defaultEnabled: true,
    transformResponse: (raw) => {
      const items = raw as { id: string; longitude: number; latitude: number; [key: string]: unknown }[]
      return items.map(d => ({
        id: d.id, longitude: d.longitude, latitude: d.latitude,
        layerId: 'skydive',
        data: d as Record<string, unknown>,
      }))
    },
    getDeckLayer: (points, onClick) =>
      new ScatterplotLayer<GeoPoint>({
        id: 'skydive-layer',
        data: points,
        getPosition: (d) => [d.longitude, d.latitude],
        getColor: (d) => {
          const c = (d.data as { condition: string }).condition
          if (c === 'green') return [0, 255, 136, 255]
          if (c === 'yellow') return [255, 179, 71, 255]
          return [255, 69, 0, 255]
        },
        getRadius: 20_000,
        radiusMinPixels: 5,
        radiusMaxPixels: 14,
        pickable: true,
        onClick: ({ object }) => { if (object) onClick(object) },
      }),
    renderContextPanel: (point) => <SkydivePanel point={point} />,
  },
  {
    id: 'paragliding',
    label: 'Parapente',
    icon: '🪂',
    color: '#9B59B6',
    colorRgb: hexToRgb('#9B59B6'),
    apiRoute: '/api/paragliding',
    pollIntervalMs: 600_000,
    defaultEnabled: true,
    transformResponse: (raw) => {
      const items = raw as { id: string; longitude: number; latitude: number; [key: string]: unknown }[]
      return items.map(d => ({
        id: d.id, longitude: d.longitude, latitude: d.latitude,
        layerId: 'paragliding',
        data: d as Record<string, unknown>,
      }))
    },
    getDeckLayer: (points, onClick) =>
      new ScatterplotLayer<GeoPoint>({
        id: 'paragliding-layer',
        data: points,
        getPosition: (d) => [d.longitude, d.latitude],
        getColor: (d) => {
          const c = (d.data as { condition: string }).condition
          if (c === 'green') return [155, 89, 182, 255]
          if (c === 'yellow') return [255, 179, 71, 255]
          return [255, 107, 53, 255]
        },
        getRadius: 18_000,
        radiusMinPixels: 5,
        radiusMaxPixels: 12,
        pickable: true,
        onClick: ({ object }) => { if (object) onClick(object) },
      }),
    renderContextPanel: (point) => <ParaglidingPanel point={point} />,
  },
  {
    id: 'basejump',
    label: 'BASE jump',
    icon: '🏔',
    color: '#FF0080',
    colorRgb: hexToRgb('#FF0080'),
    apiRoute: '/api/basejump',
    pollIntervalMs: 600_000,
    defaultEnabled: true,
    transformResponse: (raw) => {
      const items = raw as { id: string; longitude: number; latitude: number; [key: string]: unknown }[]
      return items.map(d => ({
        id: d.id, longitude: d.longitude, latitude: d.latitude,
        layerId: 'basejump',
        data: d as Record<string, unknown>,
      }))
    },
    getDeckLayer: (points, onClick) =>
      new ScatterplotLayer<GeoPoint>({
        id: 'basejump-layer',
        data: points,
        getPosition: (d) => [d.longitude, d.latitude],
        getColor: (d) => {
          const c = (d.data as { condition: string }).condition
          if (c === 'green') return [255, 0, 128, 255]
          if (c === 'yellow') return [255, 179, 71, 255]
          return [100, 0, 50, 255]
        },
        getRadius: 22_000,
        radiusMinPixels: 6,
        radiusMaxPixels: 14,
        pickable: true,
        onClick: ({ object }) => { if (object) onClick(object) },
      }),
    renderContextPanel: (point) => <BasejumpPanel point={point} />,
  },
]
