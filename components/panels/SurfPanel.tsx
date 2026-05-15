import type { GeoPoint } from '@/lib/types'
import { Row } from '@/components/ui/Row'
import { SpotWeather } from '@/components/SpotWeather'

const getScoreColor = (s: number) => s >= 7 ? '#00FF88' : s >= 4 ? '#FFB347' : '#FF6B35'
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
  const scoreColor = getScoreColor(d.score)
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 17, color: '#00CED1', marginBottom: 4, lineHeight: 1.2 }}>
        {d.name}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 400, fontSize: 13, color: '#3a5a80', marginBottom: 10 }}>
        {d.country} · {d.breakType}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 36, color: scoreColor }}>
          {d.score}
        </span>
        <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 400, fontSize: 14, color: '#3a5a80' }}>
          /10
        </span>
      </div>
      <Row label="HOULE" value={`${d.swellHeightM.toFixed(1)} m · ${Math.round(d.swellPeriodS)}s`} />
      <Row label="VENT" value={`${Math.round(d.windKmh)} km/h ${d.windOffshore ? '(offshore ✓)' : '(onshore)'}`} />
      <Row label="NIVEAU" value={LEVEL_LABEL[d.level] ?? d.level} />
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #0d1826' }}>
        <SpotWeather lat={point.latitude} lng={point.longitude} color="#00CED1" />
      </div>
    </div>
  )
}
