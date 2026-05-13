import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
    </div>
  )
}

const scoreColor = (s: number) => s >= 7 ? '#00FF88' : s >= 4 ? '#FFB347' : '#FF6B35'
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Débutant', intermediate: 'Intermédiaire',
  advanced: 'Avancé', expert: 'Expert', all: 'Tous niveaux',
}

interface SurfData {
  name: string; country: string; level: string; breakType: string
  score: number; swellHeightM: number; swellPeriodS: number
  windKmh: number; windOffshore: boolean
}

export default function SurfPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as SurfData
  return (
    <div className="space-y-2">
      <p className="text-[#00CED1] text-sm font-bold">{d.name}</p>
      <p className="text-[#4a6fa5] text-[11px]">{d.country} · {d.breakType}</p>
      <div className="flex items-center gap-2 py-1">
        <span className="text-2xl font-bold" style={{ color: scoreColor(d.score) }}>
          {d.score}
        </span>
        <span className="text-[#4a6fa5] text-[10px]">/ 10</span>
      </div>
      <Row label="HOULE" value={`${d.swellHeightM.toFixed(1)} m · ${Math.round(d.swellPeriodS)}s`} />
      <Row label="VENT" value={`${Math.round(d.windKmh)} km/h ${d.windOffshore ? '(offshore ✓)' : '(onshore)'}`} />
      <Row label="NIVEAU" value={LEVEL_LABEL[d.level] ?? d.level} />
    </div>
  )
}
