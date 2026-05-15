'use client'
import { useCallback, useEffect, useState } from 'react'
import { LAYERS } from '@/lib/layers'
import type { GeoPoint } from '@/lib/types'
import { ErrorBoundary } from './ErrorBoundary'
import { useFavorites } from '@/lib/hooks/use-favorites'

interface Props {
  point: GeoPoint
  onClose: () => void
}

export default function ContextPanel({ point, onClose }: Props) {
  const layer = LAYERS.find(l => l.id === point.layerId)
  const { isFavorite, toggle } = useFavorites()
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  const favorite = isFavorite(point.id)

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="panel-fade-in" style={{ borderTop: '1px solid #1a2840' }}>
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px 8px',
        background: '#040810',
        borderBottom: '1px solid #111c2e',
      }}>
        <span style={{
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: '0.25em',
          color: layer?.color ?? '#00D4FF',
          textTransform: 'uppercase',
        }}>
          {layer?.icon}&nbsp; Détail
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Share button */}
          <button
            onClick={handleShare}
            title="Copier le lien"
            style={{
              background: 'none',
              border: '1px solid #1a2840',
              color: copied ? '#00D4FF' : '#2a4a6a',
              width: 22,
              height: 22,
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            aria-label="Partager"
          >
            {copied ? '✓' : '🔗'}
          </button>
          {/* Favorite button */}
          <button
            onClick={() => toggle(point.id)}
            title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            style={{
              background: 'none',
              border: '1px solid #1a2840',
              color: favorite ? '#FF6B6B' : '#2a4a6a',
              width: 22,
              height: 22,
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            {favorite ? '❤️' : '🤍'}
          </button>
          <button
            onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid #1a2840',
            color: '#2a4a6a',
            width: 22,
            height: 22,
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.borderColor = layer?.color ?? '#00D4FF'
            ;(e.target as HTMLButtonElement).style.color = layer?.color ?? '#00D4FF'
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.borderColor = '#1a2840'
            ;(e.target as HTMLButtonElement).style.color = '#2a4a6a'
          }}
          aria-label="Fermer"
        >
          ×
        </button>
        </div>
      </div>

      {/* Panel content */}
      <div style={{ padding: '14px 16px', fontSize: 12 }}>
        <ErrorBoundary>
          {layer ? (
            layer.renderContextPanel(point)
          ) : (
            <span style={{ fontFamily: 'var(--font-rajdhani)', color: '#2a4a6a' }}>
              Données non disponibles
            </span>
          )}
        </ErrorBoundary>
      </div>
    </div>
  )
}
