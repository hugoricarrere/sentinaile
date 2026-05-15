import { createSportRoute } from '@/lib/create-sport-route'

interface WebcamPoint {
  id: string; title: string; longitude: number; latitude: number
  city: string; country: string; streamUrl: string | null
}

async function fetchWebcams(): Promise<WebcamPoint[]> {
  const key = process.env.WINDY_API_KEY
  if (!key) {
    // Return empty without erroring if key not configured
    return []
  }
  const res = await fetch(
    'https://api.windy.com/webcams/api/v3/webcams?limit=200&offset=0&show=webcams:location,player',
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
  return (json.webcams ?? []).map(w => ({
    id: String(w.id),
    title: w.title,
    longitude: w.location.longitude,
    latitude: w.location.latitude,
    city: w.location.city,
    country: w.location.country,
    streamUrl: w.player?.live?.url ?? w.player?.day?.url ?? null,
  }))
}

export const GET = createSportRoute('webcams', fetchWebcams, 300_000)
