'use client'

import { useEffect, useRef, useState } from 'react'

interface DayForecast {
  date: string
  avgSwellM: number
  maxSwellM: number
  avgPeriodS: number
  avgWindKmh: number
  score: number
}

interface SurfForecastProps {
  lat: number
  lng: number
  color?: string
}

const DAY_LABELS: Record<number, string> = {
  0: 'Dim',
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
}

function getScoreColor(score: number): string {
  if (score >= 7) return '#00FF88'
  if (score >= 4) return '#FFB347'
  return '#FF6B35'
}

function getDayLabel(dateStr: string): string {
  // Parse "YYYY-MM-DD" safely without time zone shift
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return DAY_LABELS[d.getDay()] ?? dateStr.slice(8)
}

const skeletonWidths = ['70%', '55%', '80%']

export function SurfForecast({ lat, lng, color = '#00CED1' }: SurfForecastProps) {
  const [forecasts, setForecasts] = useState<DayForecast[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(false)
    setForecasts(null)

    fetch(`/api/surf-forecast?lat=${lat}&lng=${lng}`, { signal: ctrl.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ data: DayForecast[] }>
      })
      .then(json => {
        setForecasts(json.data)
        setLoading(false)
      })
      .catch(err => {
        if ((err as { name?: string }).name === 'AbortError') return
        setError(true)
        setLoading(false)
      })

    return () => ctrl.abort()
  }, [lat, lng])

  if (error) return null

  if (loading) {
    return (
      <div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
        {skeletonWidths.map((w, i) => (
          <div
            key={i}
            style={{
              background: '#1a2840',
              borderRadius: 2,
              height: 8,
              width: w,
              marginBottom: 8,
              animation: 'pulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    )
  }

  if (!forecasts || forecasts.length === 0) return null

  return (
    <div>
      <style>{`
        .surf-forecast-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <p style={{
        fontFamily: 'var(--font-rajdhani)',
        fontSize: 10,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: '#2a4a6a',
        marginBottom: 8,
      }}>
        PRÉVISIONS 7 JOURS
      </p>
      <div
        className="surf-forecast-scroll"
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 8,
          scrollbarWidth: 'none',
        }}
      >
        {forecasts.map(day => {
          const scoreColor = getScoreColor(day.score)
          return (
            <div
              key={day.date}
              style={{
                minWidth: 44,
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
              <p style={{
                fontFamily: 'var(--font-rajdhani)',
                fontSize: 11,
                color: '#3a5a80',
                marginBottom: 4,
              }}>
                {getDayLabel(day.date)}
              </p>
              <p style={{
                fontFamily: 'var(--font-rajdhani)',
                fontWeight: 700,
                fontSize: 16,
                color: scoreColor,
                marginBottom: 2,
              }}>
                {day.score}
              </p>
              <p style={{
                fontFamily: 'var(--font-rajdhani)',
                fontSize: 10,
                color: color,
              }}>
                {day.avgSwellM.toFixed(1)}m
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
