import React from 'react'

interface SkeletonProps {
  width?: string | number
  height?: number
  borderRadius?: number
  style?: React.CSSProperties
}

// Animation CSS inline (évite d'alourdir globals.css)
const KEYFRAMES = `
@keyframes skeletonPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.9; }
}
`

export function Skeleton({ width = '100%', height = 10, borderRadius = 3, style }: SkeletonProps) {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        width,
        height,
        borderRadius,
        background: '#1a2840',
        animation: 'skeletonPulse 1.4s ease-in-out infinite',
        ...style,
      }} />
    </>
  )
}

// Preset : bloc de N lignes (pattern "texte en chargement")
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  const widths = ['80%', '60%', '90%', '50%', '75%']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={widths[i % widths.length]} height={8} />
      ))}
    </div>
  )
}
