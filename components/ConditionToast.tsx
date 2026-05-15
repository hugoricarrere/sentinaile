'use client'
import { useEffect, useRef, useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'

interface Toast {
  id: string
  message: string
  color: string
}

interface Props {
  layerStates: LayerStates
}

/** Layers that expose a condition field worth monitoring */
const MONITORED = new Set(['skydive', 'paragliding', 'basejump', 'surf'])

/**
 * Watch for any monitored layer going fully red (all points = red / score 0)
 * and surface a brief on-screen toast.
 */
export default function ConditionToast({ layerStates }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const prevConditions = useRef<Record<string, string>>({})

  useEffect(() => {
    const added: Toast[] = []

    for (const layer of LAYERS) {
      if (!MONITORED.has(layer.id)) continue
      const points = layerStates[layer.id]?.points ?? []
      if (points.length === 0) continue

      // Determine dominant condition for the layer
      let redCount = 0
      let greenCount = 0
      for (const pt of points) {
        const c = (pt.data as { condition?: string; score?: number }).condition
        const s = (pt.data as { score?: number }).score
        if (c === 'red' || (s !== undefined && s <= 0)) redCount++
        else if (c === 'green' || (s !== undefined && s > 5)) greenCount++
      }
      const dominant = redCount > points.length * 0.8
        ? 'red'
        : greenCount > points.length * 0.6
          ? 'green'
          : 'mixed'

      const prev = prevConditions.current[layer.id]
      prevConditions.current[layer.id] = dominant

      // Only fire when transitioning to all-red from a better state
      if (dominant === 'red' && prev && prev !== 'red') {
        added.push({
          id: `${layer.id}-${Date.now()}`,
          message: `${layer.icon} ${layer.label} : conditions toutes rouges`,
          color: layer.color,
        })
      }
    }

    if (added.length > 0) {
      setToasts(prev => [...prev, ...added])
      // Auto-dismiss after 6 s
      added.forEach(t => {
        setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 6000)
      })
    }
  }, [layerStates])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 48,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      alignItems: 'center',
      pointerEvents: 'none',
    }}
    role="status"
    aria-live="polite"
    aria-atomic="false"
    >
      {toasts.map(t => (
        <div key={t.id} style={{
          background: '#0a0e1a',
          border: `1px solid ${t.color}60`,
          borderRadius: 4,
          padding: '8px 16px',
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: '0.06em',
          color: t.color,
          boxShadow: `0 4px 24px ${t.color}30`,
          whiteSpace: 'nowrap',
          animation: 'toastIn 0.3s ease-out',
          pointerEvents: 'auto',
        }}>
          ⚠ {t.message}
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
