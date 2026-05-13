import type { GeoPoint } from '@/lib/types'

interface WebcamData {
  title: string; city: string; country: string; streamUrl: string | null
}

export default function WebcamPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as WebcamData
  return (
    <div className="space-y-2">
      <p className="text-[#FFD700] text-sm font-bold">{d.title}</p>
      <p className="text-[#4a6fa5] text-[11px]">{d.city}, {d.country}</p>
      {d.streamUrl ? (
        <iframe
          src={d.streamUrl}
          className="w-full aspect-video border border-[#1a2840] rounded"
          allowFullScreen
          title={d.title}
        />
      ) : (
        <p className="text-[#4a6fa5] text-[11px]">Flux non disponible</p>
      )}
    </div>
  )
}
