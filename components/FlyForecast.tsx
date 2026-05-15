'use client'

import { useEffect, useRef, useState } from 'react'

interface DayFlyForecast {
  date: string
  condition: 'green' | 'yellow' | 'red'
  avgWindKmh: number
  maxGustKmh: number
  maxBLHeight: number
  minLiftedIndex: number
  maxCape: number
  flyingHours: number
}

function getConditionColor(condition: 'green' | 'yellow' | 'red'): string {
  if (condition === 'green') return '#00FF88'
  if (condition === 'yellow') return '#FFB347'
  return '#FF6B35'
}

function getDayLabel(dateStr: string): string {
  const label = new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short' })
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '')
}

const skeletonWidths = ['70%', '55%', '80%']

export function FlyForecast({ lat, lng }: { lat: number; lng: number }) {
  const [forecasts, setForecasts] = useState<DayFlyForecast[] | null>(null)
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

    fetch(`/api/fly-forecast?lat=${lat}&lng=${lng}`, { signal: ctrl.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ days: DayFlyForecast[]; bestDayIdx: number }>
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
          @keyframes fly-pulse {
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
              animation: 'fly-pulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    )
  }

  if (!forecasts || forecasts.length === 0) return null

  const selected = selectedDay !== null ? forecasts[selectedDay] : null
  const color = '#9B59B6'

  return (
    <div>
      <style>{`
        .fly-forecast-scroll::-webkit-scrollbar { display: none; }
        .fly-day-col {
          cursor: pointer;
          transition: background 0.15s ease;
          border-radius: 6px;
          border: 1px solid transparent;
          padding: 4px 2px;
        }
        .fly-day-col:hover {
          background: #1a2840;
        }
        .fly-day-col.selected {
          background: rgba(155, 89, 182, 0.063);
          border-color: rgba(155, 89, 182, 0.25);
        }
        .fly-day-col.best {
          border-color: #9B59B6;
        }
        .fly-detail-block {
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
        PRÉVISIONS VOL 7 JOURS
      </p>
      <div
        className="fly-forecast-scroll"
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 4,
          scrollbarWidth: 'none',
        }}
      >
        {forecasts.map((day, idx) => {
          const condColor = getConditionColor(day.condition)
          const isBest = idx === bestDayIdx
          const isSelected = selectedDay === idx
          const colClass = [
            'fly-day-col',
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
                color: isBest ? color : '#3a5a80',
                marginBottom: 4,
              }}>
                {getDayLabel(day.date)}
              </p>
              {/* Condition color bar */}
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                background: condColor,
                opacity: 0.85,
                margin: '0 auto 4px',
              }} />
              <p style={{
                fontFamily: 'var(--font-rajdhani)',
                fontSize: 10,
                color: color,
              }}>
                {day.flyingHours}h
              </p>
            </div>
          )
        })}
      </div>

      {/* Detail block */}
      <div
        className="fly-detail-block"
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <span style={{
                fontFamily: 'var(--font-rajdhani)',
                fontWeight: 700,
                fontSize: 22,
                color: getConditionColor(selected.condition),
              }}>
                {selected.condition === 'green' ? 'VOL OK' : selected.condition === 'yellow' ? 'LIMITES' : 'DÉCONSEILLÉ'}
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
                  VENT MOY
                </span>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 12, color: '#8ab4cc' }}>
                  {selected.avgWindKmh} km/h
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 10, letterSpacing: '0.1em', color: '#2a4a6a', textTransform: 'uppercase' }}>
                  RAFALES MAX
                </span>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 12, color: '#8ab4cc' }}>
                  {selected.maxGustKmh} km/h
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 10, letterSpacing: '0.1em', color: '#2a4a6a', textTransform: 'uppercase' }}>
                  COUCHE LIMITE
                </span>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 12, color: '#8ab4cc' }}>
                  {selected.maxBLHeight} m
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 10, letterSpacing: '0.1em', color: '#2a4a6a', textTransform: 'uppercase' }}>
                  LIFTED INDEX
                </span>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 12, color: '#8ab4cc' }}>
                  {selected.minLiftedIndex}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 10, letterSpacing: '0.1em', color: '#2a4a6a', textTransform: 'uppercase' }}>
                  HEURES DE VOL
                </span>
                <span style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 12, color: '#8ab4cc' }}>
                  {selected.flyingHours}h
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
