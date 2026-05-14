import type { GeoPoint } from './types'

/**
 * When multiple points share the same coordinates (e.g. two clubs at the
 * same airfield), spread them in a small circle so they are all visible
 * and independently clickable. The original lat/lon are preserved in
 * point.data; only the top-level coordinates used for rendering are shifted.
 */
export function jitterCoincident(points: GeoPoint[], radiusDeg = 0.005): GeoPoint[] {
  // Group point indices by rounded coordinate key
  const groups = new Map<string, number[]>()
  points.forEach((p, i) => {
    const key = `${p.longitude.toFixed(3)},${p.latitude.toFixed(3)}`
    const g = groups.get(key) ?? []
    g.push(i)
    groups.set(key, g)
  })

  return points.map((p, i) => {
    const key = `${p.longitude.toFixed(3)},${p.latitude.toFixed(3)}`
    const group = groups.get(key)!
    if (group.length === 1) return p
    const pos = group.indexOf(i)
    const angle = (2 * Math.PI * pos) / group.length
    return {
      ...p,
      longitude: p.longitude + Math.cos(angle) * radiusDeg,
      latitude:  p.latitude  + Math.sin(angle) * radiusDeg,
    }
  })
}
