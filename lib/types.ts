export interface GeoPoint {
  id: string
  longitude: number
  latitude: number
  layerId: string
  data: Record<string, unknown>
}

export interface LayerDataState {
  points: GeoPoint[]
  stale: boolean
  lastUpdated: number | null
  error: string | null
}
