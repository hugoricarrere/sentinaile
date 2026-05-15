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

export function dominantConditionColor(
  sc: Supercluster<{ originalPoint: GeoPoint }>,
  clusterId: number,
): [number, number, number, number] {
  const leaves = sc.getLeaves(clusterId, Infinity)
  let red = 0, yellow = 0, green = 0
  for (const leaf of leaves) {
    const cond = (leaf.properties.originalPoint.data as Record<string, unknown>).condition as string | undefined
    if (cond === 'red') red++
    else if (cond === 'yellow') yellow++
    else green++
  }
  if (red > 0) return [255, 107, 53, 220]        // #FF6B35
  if (yellow > green) return [255, 179, 71, 220]  // #FFB347
  return [0, 255, 136, 220]                       // #00FF88
}
