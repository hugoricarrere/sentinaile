import type { GeoPoint } from '@/lib/types'
import { Row } from '@/components/ui/Row'

const LEGAL: Record<string, string> = {
  authorized: '✅ Autorisé', tolerated: '⚠️ Toléré', forbidden: '❌ Interdit',
}
const COND = {
  green:  { label: '🟢 ● Conditions OK',  shape: '●', color: '#00FF88' },
  yellow: { label: '🟡 ▲ Limites',        shape: '▲', color: '#FFB347' },
  red:    { label: '🔴 ■ Ne pas sauter',  shape: '■', color: '#FF6B35' },
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
      <p aria-label={`Condition : ${cond.label}`} style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 15, color: cond.color, marginBottom: 10 }}>
        {cond.label}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 400, fontSize: 13, color: '#3a5a80', marginBottom: 10 }}>
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
