'use client'
import { useEffect, useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'

interface Props {
  layerStates: LayerStates
}

export default function TopBar({ layerStates }: Props) {
  const [utc, setUtc] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setUtc(now.toISOString().slice(11, 19) + ' UTC')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const activeLayers = LAYERS.filter(
    l => (layerStates[l.id]?.points.length ?? 0) > 0
  )

  return (
    <header style={{
      height: 64,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '0 24px',
      background: 'linear-gradient(to right, #020609, #040b14)',
      borderBottom: '1px solid #1a2840',
      position: 'relative',
    }}>
      {/* Subtle top accent line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 2,
        background: 'linear-gradient(to right, transparent, #00D4FF50, #00D4FF30, transparent)',
      }} />

      {/* Wing SVG */}
      <svg width="36" height="28" viewBox="0 0 34 26" fill="none" style={{
        flexShrink: 0,
        filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.6))',
      }}>
        <path
          d="M2 22 C7 17 16 10 32 3 C28 9 22 15 15 19 C10 21 6 22 2 22Z"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M2 22 C7 19 12 18 17 17"
          stroke="rgba(0,212,255,0.4)"
          strokeWidth="0.8"
          fill="none"
        />
        <path
          d="M28 5 C30 4 32 3 32 3"
          stroke="white"
          strokeWidth="1.2"
          strokeOpacity="0.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Logo */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        lineHeight: 1,
        gap: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#00C4EE',
          textShadow: '0 0 20px rgba(0,196,238,0.4)',
          lineHeight: 1,
        }}>Sentin</span>
        <span style={{
          fontFamily: 'var(--font-orbitron)',
          fontWeight: 900,
          fontSize: 58,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          color: '#ffffff',
          textShadow: '0 0 32px rgba(0,212,255,0.9), 0 0 12px rgba(0,212,255,0.6)',
          lineHeight: 0.82,
          marginBottom: -2,
        }}>A</span>
        <span style={{
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#e8f6ff',
          textShadow: '0 0 20px rgba(0,196,238,0.5)',
          lineHeight: 1,
        }}>ile</span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: '#1a2840', flexShrink: 0 }} />

      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="live-dot" style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#00D4FF',
          color: '#00D4FF',
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.22em',
          color: '#3a8aaa',
          textTransform: 'uppercase',
        }}>Live</span>
      </div>

      {/* Active layer pills */}
      {activeLayers.length > 0 && (
        <>
          <div style={{ width: 1, height: 28, background: '#1a2840', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {activeLayers.map(l => (
              <span
                key={l.id}
                style={{
                  fontFamily: 'var(--font-rajdhani)',
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.08em',
                  color: l.color,
                  background: `${l.color}18`,
                  border: `1px solid ${l.color}40`,
                  padding: '3px 12px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                {l.icon}&nbsp;{(layerStates[l.id]?.points.length ?? 0).toLocaleString('fr-FR')}
              </span>
            ))}
          </div>
        </>
      )}

      {/* UTC Clock */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        color: '#3a5a7a',
        letterSpacing: '0.1em',
        marginLeft: 'auto',
        fontWeight: 400,
      }}>
        {utc}
      </span>
    </header>
  )
}
