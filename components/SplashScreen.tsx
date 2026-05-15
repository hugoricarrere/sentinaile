'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'sentinaile-seen'

const SPORTS = [
  { icon: '🪂', label: 'Parachutisme' },
  { icon: '🪂', label: 'Parapente' },
  { icon: '🏔️', label: 'BASE Jump' },
  { icon: '🏄', label: 'Surf' },
]

export function SplashScreen() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) setVisible(true)
  }, [])

  if (!visible) return null

  function handleStart() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 30%, #0a1628 0%, #040810 70%)',
        animation: 'splashFadeIn 0.4s ease',
      }}
    >
      <style>{`
        @keyframes splashFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '0 24px',
          maxWidth: 360,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Logo SVG */}
        <svg
          width={64}
          height={50}
          viewBox="0 0 34 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 22 C7 17 16 10 32 3 C28 9 22 15 15 19 C10 21 6 22 2 22Z"
            fill="#00D4FF"
          />
        </svg>

        {/* Title */}
        <div
          style={{
            fontFamily: 'var(--font-rajdhani, Rajdhani, sans-serif)',
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: '0.02em',
            color: '#3a5a80',
            lineHeight: 1,
          }}
        >
          Sentin
          <span style={{ color: '#ffffff' }}>A</span>
          ile
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: 'var(--font-rajdhani, Rajdhani, sans-serif)',
            fontSize: 14,
            color: '#3a5a80',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          Intelligence géospatiale outdoor
        </div>

        {/* Sports grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            width: '100%',
            marginTop: 8,
          }}
        >
          {SPORTS.map(({ icon, label }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 6,
                padding: '8px 12px',
                fontFamily: 'var(--font-rajdhani, Rajdhani, sans-serif)',
                fontSize: 13,
                color: '#8ab4d0',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={handleStart}
          style={{
            marginTop: 8,
            background: '#00D4FF',
            color: '#040810',
            border: 'none',
            cursor: 'pointer',
            padding: '12px 32px',
            fontFamily: 'var(--font-rajdhani, Rajdhani, sans-serif)',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            borderRadius: 4,
          }}
        >
          Commencer →
        </button>
      </div>
    </div>
  )
}
