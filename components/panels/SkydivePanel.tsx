import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
    </div>
  )
}

const COND = {
  green: { label: '🟢 Favorable', color: '#00FF88' },
  yellow: { label: '🟡 Attention', color: '#FFB347' },
  red: { label: '🔴 Fermé', color: '#FF6B35' },
}

interface SkydiveData {
  name: string; icao: string; altitudeM: number; radio: string
  phone: string; website: string; aircraft: string[]; maxAltitudeM: number
  windSurface: number; wind3000: number; visibility: number
  precipitation: boolean; condition: 'green' | 'yellow' | 'red'
}

export default function SkydivePanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as SkydiveData
  const cond = COND[d.condition]
  return (
    <div className="space-y-2">
      <p className="text-[#FF4500] text-sm font-bold">{d.name}</p>
      <p className="text-[11px] font-bold" style={{ color: cond.color }}>{cond.label}</p>
      <Row label="OACI" value={d.icao} />
      <Row label="ALT TERRAIN" value={`${d.altitudeM} m`} />
      <Row label="ALT LARGAGE" value={`${d.maxAltitudeM} m`} />
      <Row label="VENT SOL" value={`${Math.round(d.windSurface)} km/h`} />
      <Row label="VENT 3000m" value={`${Math.round(d.wind3000)} km/h`} />
      <Row label="VISIBILITÉ" value={`${d.visibility.toFixed(1)} km`} />
      <Row label="PRÉCIP" value={d.precipitation ? 'Oui ⚠️' : 'Non'} />
      <Row label="FRÉQUENCE" value={d.radio} />
      <Row label="AVIONS" value={d.aircraft.join(', ')} />
      <a href={`tel:${d.phone}`} className="block text-[10px] text-[#4a6fa5] mt-1">{d.phone}</a>
      {d.website && (
        <a
          href={d.website} target="_blank" rel="noopener noreferrer"
          className="block text-center text-[10px] tracking-wider text-[#4a6fa5] border border-[#1a2840] py-1 hover:border-[#FF4500] hover:text-[#FF4500] transition-colors"
        >
          SITE WEB →
        </a>
      )}
    </div>
  )
}
