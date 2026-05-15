import type { GeoPoint } from '@/lib/types'
import { Row } from '@/components/ui/Row'
import { SpotWeather } from '@/components/SpotWeather'
import { SurfForecast } from '@/components/SurfForecast'
import { TideForecast } from '@/components/TideForecast'
import { SpotPhoto } from '@/components/SpotPhoto'

const getScoreColor = (s: number) => s >= 7 ? '#00FF88' : s >= 4 ? '#FFB347' : '#FF6B35'
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Débutant', intermediate: 'Intermédiaire',
  advanced: 'Avancé', expert: 'Expert', all: 'Tous niveaux',
}

interface SurfData {
  name: string; country: string; level: string; breakType: string
  score: number; swellHeightM: number; swellPeriodS: number
  windKmh: number; windOffshore: boolean
  windDirDeg?: number; facingDeg?: number
  trend?: 'up' | 'same' | 'down'
  shomHarbor?: string
  photoUrl?: string
  id?: string
}

function isWindOffshore(windDirDeg: number, facingDeg: number): boolean {
  // Wind is offshore if it blows away from the beach (opposite of facing direction)
  const diff = Math.abs(((windDirDeg - facingDeg + 180 + 360) % 360) - 180)
  return diff <= 90
}

export default function SurfPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as SurfData
  const scoreColor = getScoreColor(d.score)
  return (
    <div>
      {d.photoUrl && <SpotPhoto url={d.photoUrl} alt={d.name} />}
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 19, color: '#00CED1', marginBottom: 4, lineHeight: 1.2 }}>
        {d.name}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 400, fontSize: 14, color: '#3a5a80', marginBottom: 10 }}>
        {d.country} · {d.breakType}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 36, color: scoreColor }}>
          {d.score}
        </span>
        <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 400, fontSize: 14, color: '#3a5a80' }}>
          /10
        </span>
        {d.trend === 'up' && <span style={{ color: '#00FF88', fontSize: 16 }}>↑</span>}
        {d.trend === 'down' && <span style={{ color: '#FF6B35', fontSize: 16 }}>↓</span>}
        {d.trend === 'same' && <span style={{ color: '#3a5a80', fontSize: 14 }}>→</span>}
      </div>
      <Row label="HOULE" value={`${(d.swellHeightM ?? 0).toFixed(1)} m · ${Math.round(d.swellPeriodS ?? 0)}s`} />
      <Row label="VENT" value={`${Math.round(d.windKmh ?? 0)} km/h ${d.windOffshore ? '(offshore ✓)' : '(onshore)'}`} />
      <Row label="OFFSHORE" value={
        d.windDirDeg !== undefined
          ? `${Math.round(d.windDirDeg)}° ${(d.facingDeg !== undefined && isWindOffshore(d.windDirDeg, d.facingDeg)) ? '✓ offshore' : 'onshore'}`
          : d.windOffshore ? '✓ offshore' : 'onshore'
      } />
      <Row label="NIVEAU" value={LEVEL_LABEL[d.level] ?? d.level} />
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #0d1826' }}>
        <SpotWeather lat={point.latitude} lng={point.longitude} color="#00CED1" />
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #0d1826' }}>
        <SurfForecast lat={point.latitude} lng={point.longitude} color="#00CED1" />
      </div>
      {d.shomHarbor && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #0d1826' }}>
          <TideForecast harborCode={d.shomHarbor} color="#00D4FF" />
        </div>
      )}
      {/* PushAlertButton: requires VAPID keys + persistent store — disabled until configured */}
    </div>
  )
}
