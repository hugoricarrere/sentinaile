import Supercluster from 'supercluster'
import type { GeoPoint } from '@/lib/types'
import { CLUSTER_RADIUS_PX, CLUSTER_MAX_ZOOM } from '@/lib/constants'

/** Module-level WeakMap: avoids rebuilding Supercluster index on every zoom change */
const _scCache = new WeakMap<GeoPoint[], Supercluster<{ originalPoint: GeoPoint }>>()

export function getClusterIndex(points: GeoPoint[]): Supercluster<{ originalPoint: GeoPoint }> {
  if (_scCache.has(points)) return _scCache.get(points)!
  const sc = new Supercluster<{ originalPoint: GeoPoint }>({
    radius: CLUSTER_RADIUS_PX,
    maxZoom: CLUSTER_MAX_ZOOM,
  })
  sc.load(
    points.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
      properties: { originalPoint: p },
    })),
  )
  _scCache.set(points, sc)
  return sc
}

/** Europe occidentale + Méditerranée — bbox used for getClusters calls */
export const EU_BBOX: [number, number, number, number] = [-10, 40, 12, 52]
