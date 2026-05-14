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
  logo: {
    fontFamily: 'var(--font-rajdhani)',
    fontWeight: 700,
    fontSize: 26,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: '#00D4FF',
    textShadow: '0 0 24px rgba(0,212,255,0.45)',
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
      setUtc(now.toUTCString().slice(17, 25) + ' UTC')
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
      <span style={S.logo}>SentinAile</span>

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
