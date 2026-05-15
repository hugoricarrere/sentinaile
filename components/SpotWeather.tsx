'use client'

import { useEffect, useState } from 'react'

interface WeatherData {
  windKmh: number
  windGustsKmh: number
  windDir: number
  tempC: number
  weatherCode: number
  description: string
}

interface Props {
  lat: number
  lng: number
  color?: string
}

function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '🌤'
  if (code === 45 || code === 48) return '🌫️'
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️'
  if ([95, 96, 99].includes(code)) return '⛈'
  return '🌡️'
}

export function SpotWeather({ lat, lng, color }: Props) {
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)

    fetch(`/api/spot-weather?lat=${lat}&lng=${lng}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('fetch failed')
        return res.json() as Promise<WeatherData>
      })
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(true)
        setLoading(false)
      })

    return () => controller.abort()
  }, [lat, lng])

  if (loading) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div
          style={{
            width: 20,
            height: 20,
            border: '2px solid #3a5a80',
            borderTopColor: color ?? '#00D4FF',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !data) return null

  return (
    <div
      style={{
        fontFamily: 'var(--font-rajdhani, Rajdhani, sans-serif)',
        borderTop: '1px solid #0d1826',
        paddingTop: 8,
        marginTop: 4,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#2a4a6a',
          marginBottom: 6,
        }}
      >
        CONDITIONS ACTUELLES
      </div>

      {/* Wind line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transform: `rotate(${data.windDir}deg)`,
            fontSize: 14,
            color: color ?? '#00D4FF',
            lineHeight: 1,
          }}
        >
          ↑
        </span>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: '#e8f4ff',
          }}
        >
          {Math.round(data.windKmh)} km/h
        </span>
        <span style={{ color: '#3a5a80', fontSize: 11 }}>rafales</span>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: '#e8f4ff',
          }}
        >
          {Math.round(data.windGustsKmh)} km/h
        </span>
      </div>

      {/* Temp + weather line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: '#e8f4ff',
          }}
        >
          {data.tempC.toFixed(1)}°C
        </span>
        <span style={{ fontSize: 14 }}>{getWeatherIcon(data.weatherCode)}</span>
        <span
          style={{
            fontSize: 11,
            color: '#3a5a80',
            letterSpacing: '0.05em',
          }}
        >
          {data.description}
        </span>
      </div>
    </div>
  )
}
