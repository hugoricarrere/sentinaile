import { createSportRoute } from '@/lib/create-sport-route'
import staticWebcams from '@/data/webcams.json'

interface WebcamPoint {
  id: string; title: string; longitude: number; latitude: number
  city: string; country: string; streamUrl: string | null
}

async function fetchWebcams(): Promise<WebcamPoint[]> {
  const key = process.env.WINDY_API_KEY

  // ── Windy API (si clé configurée) ───────────────────────────────────────
  if (key) {
    try {
      const res = await fetch(
        // France + Europe bounding box pour des résultats pertinents
        'https://api.windy.com/webcams/api/v3/webcams?limit=500&offset=0&show=webcams:location,player&bbox=35.0,-10.0,55.0,25.0',
        { headers: { 'x-windy-api-key': key }, next: { revalidate: 0 } }
      )
      if (!res.ok) throw new Error(`Windy HTTP ${res.status}`)
      const json: {
        webcams: {
          id: string | number; title: string
          location: { longitude: number; latitude: number; city: string; country: string }
          player?: { live?: { url?: string }; day?: { url?: string } }
        }[]
      } = await res.json()
      const windy = (json.webcams ?? []).map(w => ({
        id: String(w.id),
        title: w.title,
        longitude: w.location.longitude,
        latitude: w.location.latitude,
        city: w.location.city,
        country: w.location.country,
        streamUrl: w.player?.live?.url ?? w.player?.day?.url ?? null,
      }))
      // Merge : Windy d'abord, puis les statiques sans doublon
      const windyIds = new Set(windy.map(w => w.id))
      const extras = (staticWebcams as WebcamPoint[]).filter(w => !windyIds.has(w.id))
      return [...windy, ...extras]
    } catch {
      // Fallback sur les statiques si l'API Windy échoue
    }
  }

  // ── Fallback statique (pas de clé Windy ou erreur API) ──────────────────
  return staticWebcams as WebcamPoint[]
}

export const GET = createSportRoute('webcams', fetchWebcams, 300_000)
