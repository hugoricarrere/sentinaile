import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid #0d1826' }}>
      <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 13, letterSpacing: '0.05em', color: '#5a7a9a' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#a0c4dc', textAlign: 'right', maxWidth: '55%' }}>
        {value}
      </span>
    </div>
  )
}

const LEGAL: Record<string, string> = {
  authorized: '✅ Autorisé', tolerated: '⚠️ Toléré', forbidden: '❌ Interdit',
}
const COND = {
  green: { label: '🟢 Conditions OK', color: '#00FF88' },
  yellow: { label: '🟡 Limites', color: '#FFB347' },
  red: { label: '🔴 Ne pas sauter', color: '#FF6B35' },
}

interface BJData {
  name: string; country: string; type: string; heightM: number
  openingAltitudeM: number; difficulty: string; legal: string
  windKmh: number; gustKmh: number; visibilityKm: number
  precipitation: boolean; ceilingM: number; condition: 'green' | 'yellow' | 'red'
}

export default function BasejumpPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as BJData
  const cond = COND[d.condition]
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 17, color: '#FF0080', marginBottom: 4, lineHeight: 1.2 }}>
        {d.name}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 15, color: cond.color, marginBottom: 10 }}>
        {cond.label}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 14, color: '#5a7a9a', marginBottom: 10 }}>
        {LEGAL[d.legal] ?? d.legal}
      </p>
      <Row label="PAYS" value={d.country} />
      <Row label="TYPE" value={d.type} />
      <Row label="HAUTEUR" value={`${d.heightM} m`} />
      <Row label="ALT OUVERTURE" value={`${d.openingAltitudeM} m`} />
      <Row label="DIFFICULTÉ" value={d.difficulty} />
      <Row label="VENT" value={`${Math.round(d.windKmh)} km/h`} />
      <Row label="RAFALES" value={`${Math.round(d.gustKmh)} km/h`} />
      <Row label="VISIBILITÉ" value={`${d.visibilityKm.toFixed(1)} km`} />
      <Row label="PRÉCIP" value={d.precipitation ? 'Oui ⚠️' : 'Non'} />
      <Row label="PLAFOND" value={`${d.ceilingM} m`} />
    </div>
  )
}
