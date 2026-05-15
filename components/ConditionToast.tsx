'use client'
import { useEffect, useRef, useState } from 'react'
import { LAYERS } from '@/lib/layers'
import type { LayerStates } from '@/lib/use-layer-data'

interface Toast { id: string; message: string; color: string }
interface Props { layerStates: LayerStates }

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
      const state = layerStates[layer.id]
      const points = state?.points ?? []
      if (points.length === 0) continue

      let redCount = 0, greenCount = 0
      for (const pt of points) {
        const c = (pt.data as { condition?: string }).condition
        const s = (pt.data as { score?: number }).score
        if (c === 'red'   || (s !== undefined && s <= 0)) redCount++
        else if (c === 'green' || (s !== undefined && s > 5)) greenCount++
      }
      const dominant =
        redCount > points.length * 0.8 ? 'red'
        : greenCount > points.length * 0.6 ? 'green'
        : 'mixed'

      const prev = prevConditions.current[layer.id]
      prevConditions.current[layer.id] = dominant

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
      added.forEach(t => {
        setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 6000)
      })
    }
  }, [layerStates])

  if (toasts.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 items-center pointer-events-none"
      style={{ bottom: 'calc(48px + env(safe-area-inset-bottom))' }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className="font-display font-semibold text-[13px] tracking-[0.06em] whitespace-nowrap rounded-[4px] px-4 py-2 pointer-events-auto"
          style={{
            background: '#0a0e1a',
            border: `1px solid ${t.color}60`,
            color: t.color,
            boxShadow: `0 4px 24px ${t.color}30`,
            animation: 'fade-in 0.3s ease-out',
          }}
        >
          ⛔ {t.message}
        </div>
      ))}
    </div>
  )
}
