/**
 * URL hash state — encode/decode map position and enabled layers into the URL.
 * Format: #@{lat},{lng},{zoom}z/l:{layer1,layer2,...}
 *
 * Example: #@46.8,2.3,5.6z/l:flights,ships
 */

export interface UrlMapState {
  longitude: number
  latitude: number
  zoom: number
  layers: string[]
}

/**
 * Encode viewState + enabled layers to a URL hash string.
 */
export function encodeUrlState(
  viewState: { longitude: number; latitude: number; zoom: number },
  enabledLayers: string[],
): string {
  const { longitude: lng, latitude: lat, zoom } = viewState
  const pos = `@${lat.toFixed(4)},${lng.toFixed(4)},${zoom.toFixed(2)}z`
  const layers = enabledLayers.length > 0 ? `/l:${enabledLayers.join(',')}` : ''
  return `#${pos}${layers}`
}

/**
 * Decode a URL hash string back to UrlMapState.
 * Returns null if the hash is missing or malformed.
 */
export function decodeUrlState(hash: string): UrlMapState | null {
  if (!hash || hash.length < 2) return null
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  try {
    const [posPart, layerPart] = raw.split('/l:')
    // Parse position: @lat,lng,zoomz
    const posMatch = posPart.match(/^@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z$/)
    if (!posMatch) return null
    const latitude  = parseFloat(posMatch[1])
    const longitude = parseFloat(posMatch[2])
    const zoom      = parseFloat(posMatch[3])
    if (!isFinite(latitude) || !isFinite(longitude) || !isFinite(zoom)) return null
    const layers = layerPart ? layerPart.split(',').filter(Boolean) : []
    return { longitude, latitude, zoom, layers }
  } catch {
    return null
  }
}
