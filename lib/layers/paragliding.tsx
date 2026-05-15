import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { GeoPoint } from '@/lib/types'
import { hexToRgb } from '@/lib/color'
import { POLL_WEATHER_MS } from '@/lib/constants'
import ParaglidingPanel from '@/components/panels/ParaglidingPanel'
import { getClusterIndex, EU_BBOX } from './_cluster'
import type { LayerConfig } from './_types'
import Supercluster from 'supercluster'

const COLOR = '#9B59B6'
const CLUSTER_THRESHOLD = 9

export const paraglidingLayer: LayerConfig = {
  id: 'paragliding',
  label: 'Parapente',
  icon: '🪂',
  color: COLOR,
  colorRgb: hexToRgb(COLOR),
  apiRoute: '/api/paragliding',
  pollIntervalMs: POLL_WEATHER_MS,
  defaultEnabled: true,
  transformResponse: (raw) => {
    const items = raw as { id: string; longitude: number; latitude: number; [key: string]: unknown }[]
    return items.map(d => ({
      id: d.id, longitude: d.longitude, latitude: d.latitude,
      layerId: 'paragliding',
      data: d as Record<string, unknown>,
    }))
  },
  getDeckLayer: (points, onClick, zoom = 5, onFlyTo) => {
    const sc = getClusterIndex(points)
    const tileZoom = Math.max(0, Math.min(Math.round(zoom), 20))
    const features = sc.getClusters(EU_BBOX, tileZoom)

    const displayPoints: GeoPoint[] = features.map(f => {
      const [lng, lat] = f.geometry.coordinates
      const props = f.properties as (Supercluster.ClusterProperties & Supercluster.AnyProps) | { originalPoint: GeoPoint }
      const isCluster = 'cluster' in props && !!props.cluster
      if (isCluster) {
        const count = (props as Supercluster.ClusterProperties).point_count
        return {
          id: `pg-cluster-${f.id ?? lng + lat}`,
          longitude: lng, latitude: lat,
          layerId: 'paragliding',
          data: { isCluster: true, count, condition: '' } as Record<string, unknown>,
        }
      }
      return f.properties.originalPoint
    })

    const showIndividual = zoom >= CLUSTER_THRESHOLD

    return [
      new ScatterplotLayer<GeoPoint>({
        id: 'paragliding-layer',
        data: displayPoints,
        getPosition: (d) => [d.longitude, d.latitude],
        getColor: (d) => {
          const { isCluster, condition } = d.data as { isCluster?: boolean; condition: string }
          if (isCluster) return [155, 89, 182, 190]
          if (condition === 'green')  return [155, 89, 182, 255]
          if (condition === 'yellow') return [255, 179, 71, 255]
          return [255, 107, 53, 255]
        },
        getRadius: (d) => {
          const { isCluster, count } = d.data as { isCluster?: boolean; count?: number }
          if (!isCluster) return 7_000
          const n = count ?? 1
          if (n < 5)   return 10_000
          if (n < 20)  return 14_000
          if (n < 100) return 18_000
          return 22_000
        },
        radiusMinPixels: showIndividual ? 4 : 6,
        radiusMaxPixels: showIndividual ? 8 : 18,
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
        id: 'paragliding-cluster-labels',
        data: displayPoints.filter(d => !!(d.data as { isCluster?: boolean }).isCluster),
        getPosition: (d) => [d.longitude, d.latitude],
        getText: (d) => String((d.data as { count: number }).count),
        getSize: 13,
        getColor: [255, 255, 255, 230],
        fontWeight: 700,
        fontFamily: 'monospace',
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
      }),
    ]
  },
  renderContextPanel: (point) => <ParaglidingPanel point={point} />,
}
