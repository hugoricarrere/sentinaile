'use client'

import { useEffect, useRef, useState } from 'react'

export interface DayForecast {
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

function getScoreColor(score: number): string {
  if (score >= 7) return '#00FF88'
  if (score >= 4) return '#FFB347'
  return '#FF6B35'
}

function getDayLabel(dateStr: string): string {
  const label = new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short' })
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '')
}

const skeletonWidths = ['70%', '55%', '80%']

export function SurfForecast({ lat, lng, color = '#00CED1' }: SurfForecastProps) {
  const [forecasts, setForecasts] = useState<DayForecast[] | null>(null)
  const [bestDayIdx, setBestDayIdx] = useState<number>(0)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
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
    setSelectedDay(null)

    fetch(`/api/surf-forecast?lat=${lat}&lng=${lng}`, { signal: ctrl.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ days: DayForecast[]; bestDayIdx: number }>
      })
      .then(json => {
        setForecasts(json.days)
        setBestDayIdx(json.bestDayIdx)
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

  const selected = selectedDay !== null ? forecasts[selectedDay] : null

  return (
    <div>
      <style>{`
        .surf-forecast-scroll::-webkit-scrollbar { display: none; }
        .surf-day-col {
          cursor: pointer;
          transition: background 0.15s ease;
          border-radius: 6px;
          border: 1px solid transparent;
          padding: 4px 2px;
        }
        .surf-day-col:hover {
          background: #1a2840;
        }
        .surf-day-col.selected {
          background: rgba(0, 212, 255, 0.063);
          border-color: rgba(0, 212, 255, 0.25);
        }
        .surf-day-col.best {
          border-color: #00D4FF;
        }
        .surf-detail-block {
          overflow: hidden;
          transition: max-height 0.25s ease, opacity 0.25s ease;
        }
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
          gap: 4,
          scrollbarWidth: 'none',
        }}
      >
        {forecasts.map((day, idx) => {
          const scoreColor = getScoreColor(day.score)
          const isBest = idx === bestDayIdx
          const isSelected = selectedDay === idx
          const colClass = [
            'surf-day-col',
            isSelected ? 'selected' : '',
            isBest ? 'best' : '',
          ].filter(Boolean).join(' ')

          return (
            <div
              key={day.date}
              className={colClass}
              onClick={() => setSelectedDay(isSelected ? null : idx)}
              style={{
                minWidth: 44,
                textAlign: 'center',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              {isBest && (
                <p style={{
                  fontSize: 10,
                  margin: '0 0 2px 0',
                  lineHeight: 1,
                }}>
                  👑
                </p>
              )}
              <p style={{
                fontFamily: 'var(--font-rajdhani)',
                fontSize: 11,
                color: isBest ? '#00D4FF' : '#3a5a80',
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

      {/* Detail block */}
      <div
        className="surf-detail-block"
        style={{
          maxHeight: selected ? 200 : 0,
          opacity: selected ? 1 : 0,
        }}
      >
        {selected && (
          <div style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid #0d1826',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
              <span style={{
                fontFamily: 'var(--font-rajdhani)',
                fontWeight: 700,
                fontSize: 28,
                color: getScoreColor(selected.score),
              }}>
                {selected.score}
              </span>
              <span style={{
                fontFamily: 'var(--font-rajdhani)',
                fontSize: 13,
                color: '#3a5a80',
              }}>
                /10
              </span>
              <span style={{
                fontFamily: 'var(--font-rajdhani)',
                fontSize: 12,
                color: '#3a5a80',
                marginLeft: 4,
              }}>
                {getDayLabel(selected.date)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 10, letterSpacing: '0.1em', color: '#2a4a6a', textTransform: 'uppercase' }}>
                  HOULE
                </span>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 12, color: '#8ab4cc' }}>
                  {selected.avgSwellM.toFixed(1)} m · {Math.round(selected.avgPeriodS)}s
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 10, letterSpacing: '0.1em', color: '#2a4a6a', textTransform: 'uppercase' }}>
                  VENT
                </span>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 12, color: '#8ab4cc' }}>
                  {Math.round(selected.avgWindKmh)} km/h {selected.avgWindKmh < 20 ? '✓ offshore' : 'onshore'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
