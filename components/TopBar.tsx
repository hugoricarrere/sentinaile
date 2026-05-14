'use client'
import { useEffect, useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'

interface Props {
  layerStates: LayerStates
}

const S = {
  bar: {
    height: 56,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '0 24px',
    background: 'linear-gradient(to right, #040810, #060c18)',
    borderBottom: '1px solid #1a2840',
  } as React.CSSProperties,
  logoWrap: {
    display: 'inline-flex',
    alignItems: 'flex-end',
    lineHeight: 1,
    gap: 0,
  },
  logoBase: {
    fontFamily: 'var(--font-rajdhani)',
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#00C4EE',
    textShadow: '0 0 18px rgba(0,196,238,0.35)',
    lineHeight: 1,
  },
  logoA: {
    fontFamily: 'var(--font-rajdhani)',
    fontWeight: 800,
    fontSize: 52,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    color: '#ffffff',
    textShadow: '0 0 28px rgba(0,212,255,0.8), 0 0 8px rgba(0,212,255,0.5)',
    lineHeight: 0.82,
    marginBottom: -1,
  },
  logoAile: {
    fontFamily: 'var(--font-rajdhani)',
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#e8f6ff',
    textShadow: '0 0 18px rgba(0,196,238,0.5)',
    lineHeight: 1,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: '#00D4FF',
    color: '#00D4FF',
    flexShrink: 0,
  },
  liveLabel: {
    fontFamily: 'var(--font-rajdhani)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.2em',
    color: '#3a8aaa',
    textTransform: 'uppercase' as const,
  },
  divider: {
    width: 1,
    height: 20,
    background: '#1a2840',
    flexShrink: 0,
  },
  layerPills: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  time: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: '#2a4a6a',
    letterSpacing: '0.08em',
    marginLeft: 'auto',
  },
} as const

export default function TopBar({ layerStates }: Props) {
  const [utc, setUtc] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const heure = now.toLocaleTimeString('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      })
      setUtc(heure + ' (Paris)')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const activeLayers = LAYERS.filter(
    l => (layerStates[l.id]?.points.length ?? 0) > 0
  )

  return (
    <header style={S.bar}>
      {/* Wing logo */}
      <svg width="34" height="26" viewBox="0 0 34 26" fill="none" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(200,220,255,0.5))' }}>
        {/* Main wing surface — swept back silhouette */}
        <path
          d="M2 22 C7 17 16 10 32 3 C28 9 22 15 15 19 C10 21 6 22 2 22Z"
          fill="white"
          fillOpacity="0.92"
        />
        {/* Secondary feather line for depth */}
        <path
          d="M2 22 C7 19 12 18 17 17"
          stroke="white"
          strokeWidth="0.8"
          strokeOpacity="0.35"
          fill="none"
        />
        {/* Wingtip highlight */}
        <path
          d="M28 5 C30 4 32 3 32 3"
          stroke="white"
          strokeWidth="1.2"
          strokeOpacity="0.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      <span style={S.logoWrap}>
        <span style={S.logoBase}>Sentin</span>
        <span style={S.logoA}>A</span>
        <span style={S.logoAile}>ile</span>
      </span>

      <span style={S.divider} />

      <span className="live-dot" style={S.liveDot} />
      <span style={S.liveLabel}>Live</span>

      {activeLayers.length > 0 && (
        <>
          <span style={S.divider} />
          <div style={S.layerPills}>
            {activeLayers.map(l => (
              <span
                key={l.id}
                style={{
                  fontFamily: 'var(--font-rajdhani)',
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: '0.06em',
                  color: l.color,
                  background: `${l.color}18`,
                  border: `1px solid ${l.color}35`,
                  padding: '2px 10px',
                  borderRadius: 3,
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {l.icon}&nbsp;{(layerStates[l.id]?.points.length ?? 0).toLocaleString('fr-FR')}
              </span>
            ))}
          </div>
        </>
      )}

      <span style={S.time}>{utc}</span>
    </header>
  )
}
