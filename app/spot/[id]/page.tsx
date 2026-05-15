import { redirect, notFound } from 'next/navigation'
import surfSpots from '@/data/surf-spots.json'
import skydiveDz from '@/data/skydive-dz.json'
import paraglidingSpots from '@/data/paragliding-spots.json'
import basejumpExits from '@/data/basejump-exits.json'
import webcams from '@/data/webcams.json'

interface SpotRecord { id: string; latitude?: number; longitude?: number; lat?: number; lng?: number }

const ALL_SPOTS: SpotRecord[] = [
  ...(surfSpots as SpotRecord[]),
  ...(skydiveDz as SpotRecord[]),
  ...(paraglidingSpots as SpotRecord[]),
  ...(basejumpExits as SpotRecord[]),
  ...(webcams as SpotRecord[]),
]

export async function generateStaticParams() {
  return ALL_SPOTS.map(s => ({ id: s.id }))
}

export default async function SpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const spot = ALL_SPOTS.find(s => s.id === id)
  if (!spot) notFound()
  const lat = spot.latitude ?? spot.lat
  const lng = spot.longitude ?? spot.lng
  if (lat === undefined || lng === undefined) notFound()
  redirect(`/?spot=${encodeURIComponent(id)}&lat=${lat}&lng=${lng}`)
}
