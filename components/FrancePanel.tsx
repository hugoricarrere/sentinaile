'use client'
import { useEffect, useState } from 'react'

interface TrainsData {
  data: { results: { taux_de_ponctualite?: number; axe?: string }[] }
}
interface TrafficData { level: string; label: string }

const TRAFFIC_COLOR: Record<string, string> = {
  green: '#00FF88',
  orange: '#FFB347',
  red: '#FF6B35',
  black: '#FF0080',
}

export default function FrancePanel() {
  const [trains, setTrains] = useState<TrainsData | null>(null)
  const [traffic, setTraffic] = useState<TrafficData | null>(null)

  useEffect(() => {
    const loadData = () => {
      fetch('/api/trains').then(r => r.json()).then(setTrains).catch(() => null)
      fetch('/api/traffic').then(r => r.json()).then(j => setTraffic(j.data)).catch(() => null)
    }
    loadData()
    const id = setInterval(loadData, 120_000)
    return () => clearInterval(id)
  }, [])

  const avgPonct =
    trains?.data?.results?.length
      ? Math.round(
          trains.data.results.reduce((s, r) => s + (r.taux_de_ponctualite ?? 0), 0) /
            trains.data.results.length
        )
      : null

  return (
    <aside className="absolute bottom-7 right-0 z-10 w-52 bg-[#0B1120]/95 border-l border-t border-[#1a2840]">
      <div className="px-3 py-1.5 bg-[#0d1628] border-b border-[#1a2840]">
        <span className="text-[10px] tracking-[0.15em] text-[#FFB347] uppercase">
          🇫🇷 France
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5 text-[11px]">
        {avgPonct !== null && (
          <div className="flex justify-between">
            <span className="text-[#4a6fa5]">TGV PONCTUALITÉ</span>
            <span style={{ color: avgPonct > 85 ? '#00FF88' : '#FFB347' }}>
              {avgPonct}%
            </span>
          </div>
        )}
        {traffic && (
          <div className="flex justify-between">
            <span className="text-[#4a6fa5]">TRAFIC AUTO</span>
            <span style={{ color: TRAFFIC_COLOR[traffic.level] ?? '#00FF88' }}>
              {traffic.label}
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}
