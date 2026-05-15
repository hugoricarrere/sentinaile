export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { readFileSync } from 'fs'
import path from 'path'

interface SpotRecord {
  id: string
  latitude?: number; longitude?: number
  lat?: number; lng?: number
}

const DATA_FILES = [
  'surf-spots.json',
  'skydive-dz.json',
  'paragliding-spots.json',
  'basejump-exits.json',
  'webcams.json',
]

export default async function SpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  for (const file of DATA_FILES) {
    const filePath = path.join(process.cwd(), 'data', file)
    try {
      const data = JSON.parse(readFileSync(filePath, 'utf-8')) as SpotRecord[]
      const spot = data.find(s => s.id === id)
      if (spot) {
        const lat = spot.latitude ?? spot.lat
        const lng = spot.longitude ?? spot.lng
        if (lat !== undefined && lng !== undefined) {
          redirect(`/?spot=${encodeURIComponent(id)}&lat=${lat}&lng=${lng}`)
        }
      }
    } catch { /* file missing or parse error — skip */ }
  }

  notFound()
}
