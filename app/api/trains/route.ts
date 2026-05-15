import { createSportRoute } from '@/lib/create-sport-route'

async function fetchTrains() {
  const res = await fetch(
    'https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/regularite-mensuelle-tgv-aqst/records?limit=20&order_by=date%20DESC',
    { next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`SNCF HTTP ${res.status}`)
  const json: { results: Record<string, unknown>[] } = await res.json()
  return json.results ?? []
}

export const GET = createSportRoute('trains', fetchTrains, 120_000)
