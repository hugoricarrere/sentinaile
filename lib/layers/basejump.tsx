import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { GeoPoint } from '@/lib/types'
import { hexToRgb } from '@/lib/color'
import { POLL_WEATHER_MS } from '@/lib/constants'
import { jitterCoincident } from '@/lib/jitter'
import BasejumpPanel from '@/components/panels/BasejumpPanel'
import { getClusterIndex, EU_BBOX, dominantConditionColor } from './_cluster'
import type { LayerConfig } from './_types'
import Supercluster from 'supercluster'

const COLOR = '#FF0080'
const CLUSTER_THRESHOLD = 8

export const basejumpLayer: LayerConfig = {
  id: 'basejump',
  label: 'BASE jump',
  icon: '🏔',
  color: COLOR,
  colorRgb: hexToRgb(COLOR),
  apiRoute: '/api/basejump',
  pollIntervalMs: POLL_WEATHER_MS,
  defaultEnabled: true,
  transformResponse: (raw) => {
    const items = raw as { id: string; longitude: number; latitude: number; [key: string]: unknown }[]
    return items.map(d => ({
      id: d.id, longitude: d.longitude, latitude: d.latitude,
      layerId: 'basejump',
      data: d as Record<string, unknown>,
    }))
  },
  getDeckLayer: (points, onClick, zoom = 5, onFlyTo) => {
    const sc = getClusterIndex(points)
    const tileZoom = Math.max(0, Math.min(Math.round(zoom), 20))
    const features = sc.getClusters(EU_BBOX, tileZoom)

    type ClusterFeature = Supercluster.ClusterFeature<Supercluster.AnyProps>
    const clusterPoints = features.filter(
      (f): f is ClusterFeature => 'cluster' in f.properties && !!f.properties.cluster
    )

    const displayPoints: GeoPoint[] = features.map(f => {
      const [lng, lat] = f.geometry.coordinates
      const props = f.properties as (Supercluster.ClusterProperties & Supercluster.AnyProps) | { originalPoint: GeoPoint }
      const isCluster = 'cluster' in props && !!props.cluster
      if (isCluster) {
        const count = (props as Supercluster.ClusterProperties).point_count
        return {
          id: `bj-cluster-${f.id ?? lng + lat}`,
          longitude: lng, latitude: lat,
          layerId: 'basejump',
          data: { isCluster: true, count, condition: '' } as Record<string, unknown>,
        }
      }
      return (f.properties as { originalPoint: GeoPoint }).originalPoint
    })

    const jittered = jitterCoincident(displayPoints)
    const showIndividual = zoom >= CLUSTER_THRESHOLD

    return [
      new ScatterplotLayer<GeoPoint>({
        id: 'basejump-layer',
        data: jittered,
        getPosition: (d) => [d.longitude, d.latitude],
        getColor: (d) => {
          const { isCluster, condition } = d.data as { isCluster?: boolean; condition: string }
          if (isCluster) return [255, 0, 128, 180]
          if (condition === 'green')  return [255, 0, 128, 255]
          if (condition === 'yellow') return [255, 179, 71, 255]
          return [100, 0, 50, 255]
        },
        getRadius: (d) => {
          const { isCluster, count } = d.data as { isCluster?: boolean; count?: number }
          if (!isCluster) return 8_000
          const n = count ?? 1
          if (n < 5)  return 10_000
          if (n < 20) return 14_000
          return 18_000
        },
        radiusMinPixels: showIndividual ? 4 : 6,
        radiusMaxPixels: showIndividual ? 9 : 18,
        pickable: true,
        onClick: ({ object }) => {
          if (!object) return
          if ((object.data as { isCluster?: boolean }).isCluster) {
            onFlyTo?.(object.longitude, object.latitude, zoom)
            return
          }
          onClick(object)
        },
      }),
      new TextLayer<GeoPoint>({
        id: 'basejump-cluster-labels',
        data: jittered.filter(d => !!(d.data as { isCluster?: boolean }).isCluster),
        getPosition: (d) => [d.longitude, d.latitude],
        getText: (d) => String((d.data as { count: number }).count),
        getSize: 13,
        getColor: [255, 255, 255, 230],
        fontWeight: 700,
        fontFamily: 'monospace',
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
      }),
      new ScatterplotLayer({
        id: 'basejump-cluster-ring',
        data: clusterPoints,
        getPosition: (f: ClusterFeature) => f.geometry.coordinates as [number, number],
        getRadius: (f: ClusterFeature) => Math.sqrt(f.properties.point_count) * 12 + 10,
        getFillColor: [0, 0, 0, 0],
        getLineColor: (f: ClusterFeature) => dominantConditionColor(sc, f.id as number),
        stroked: true,
        filled: false,
        lineWidthMinPixels: 2,
        pickable: false,
        radiusUnits: 'pixels',
      }),
      new TextLayer({
        id: 'basejump-cluster-count',
        data: clusterPoints,
        getPosition: (f: ClusterFeature) => f.geometry.coordinates as [number, number],
        getText: (f: ClusterFeature) => String(f.properties.point_count),
        getSize: 11,
        getColor: [255, 255, 255, 200],
        fontFamily: 'monospace',
        fontWeight: 'bold' as const,
        getTextAnchor: 'middle' as const,
        getAlignmentBaseline: 'center' as const,
        pickable: false,
      }),
    ]
  },
  renderContextPanel: (point) => <BasejumpPanel point={point} />,
}
