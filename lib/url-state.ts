/**
 * URL hash state — encode/decode map position, enabled layers, and key filters.
 * Format: #@{lat},{lng},{zoom}z[/l:{layer1,layer2,...}][/f:1]
 *
 * Segments (all optional after position):
 *   /l:flights,ships   — comma-separated enabled layer IDs
 *   /f:1               — franceOnly filter active (absent = false)
 *
 * Example: #@46.8,2.3,5.60z/l:flights,ships/f:1
 */

export interface UrlMapState {
  longitude: number
  latitude: number
  zoom: number
  layers: string[]
  franceOnly?: boolean
}

/**
 * Encode viewState + enabled layers + active filters to a URL hash string.
 */
export function encodeUrlState(
  viewState: { longitude: number; latitude: number; zoom: number },
  enabledLayers: string[],
  franceOnly?: boolean,
): string {
  const { longitude: lng, latitude: lat, zoom } = viewState
  const pos     = `@${lat.toFixed(4)},${lng.toFixed(4)},${zoom.toFixed(2)}z`
  const layers  = enabledLayers.length > 0 ? `/l:${enabledLayers.join(',')}` : ''
  const filters = franceOnly ? '/f:1' : ''
  return `#${pos}${layers}${filters}`
}

/**
 * Decode a URL hash string back to UrlMapState.
 * Returns null if the hash is missing or malformed.
 */
export function decodeUrlState(hash: string): UrlMapState | null {
  if (!hash || hash.length < 2) return null
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  try {
    const parts   = raw.split('/')
    const posPart = parts[0]
    const posMatch = posPart.match(/^@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z$/)
    if (!posMatch) return null
    const latitude  = parseFloat(posMatch[1])
    const longitude = parseFloat(posMatch[2])
    const zoom      = parseFloat(posMatch[3])
    if (!isFinite(latitude) || !isFinite(longitude) || !isFinite(zoom)) return null

    let layers: string[]        = []
    let franceOnly: boolean | undefined

    for (const part of parts.slice(1)) {
      if (part.startsWith('l:')) layers     = part.slice(2).split(',').filter(Boolean)
      if (part === 'f:1')        franceOnly = true
      if (part === 'f:0')        franceOnly = false
    }

    return { longitude, latitude, zoom, layers, franceOnly }
  } catch {
    return null
  }
}
