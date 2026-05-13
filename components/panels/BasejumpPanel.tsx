import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
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
    <div className="space-y-2">
      <p className="text-[#FF0080] text-sm font-bold">{d.name}</p>
      <p className="text-[11px] font-bold" style={{ color: cond.color }}>{cond.label}</p>
      <p className="text-[11px]">{LEGAL[d.legal] ?? d.legal}</p>
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
