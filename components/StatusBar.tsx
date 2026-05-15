'use client'
import { useEffect, useRef, useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'

interface Props {
  layerStates: LayerStates
  viewState: { longitude: number; latitude: number; zoom: number }
}

export default function StatusBar({ layerStates, viewState }: Props) {
  // Debounce coordinate display so it doesn't thrash during panning
  const [displayVs, setDisplayVs] = useState(viewState)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDisplayVs(viewState), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [viewState])
  const connected  = LAYERS.filter(l => layerStates[l.id]?.lastUpdated !== null).length
  const staleCount = LAYERS.filter(l => layerStates[l.id]?.stale && !layerStates[l.id]?.error).length
  const errorCount = LAYERS.filter(l => !!layerStates[l.id]?.error).length

  // Couches actives mais sans données (chargées mais vides)
  const emptyLayers = LAYERS.filter(
    l => layerStates[l.id]?.lastUpdated !== null &&
         layerStates[l.id]?.points.length === 0 &&
         !layerStates[l.id]?.error,
  )

  return (
    <footer style={{
      height: 34,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 20px',
      background: '#040810',
      borderTop: '1px solid #1a2840',
      overflow: 'hidden',
    }}>
      {/* Sources connectées */}
      <span style={{
        fontFamily: 'var(--font-rajdhani)',
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: '0.12em',
        color: '#00c87a',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        ● Sources {connected}/{LAYERS.length}
      </span>

      {/* Données périmées */}
      {staleCount > 0 && (
        <span title={`${staleCount} source(s) avec données périmées`} style={{
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: '0.1em',
          color: '#cc8820',
          flexShrink: 0,
        }}>
          ⚠ {staleCount} Stale
        </span>
      )}

      {/* Erreurs */}
      {errorCount > 0 && (
        <span
          title={LAYERS.filter(l => !!layerStates[l.id]?.error).map(l => `${l.label}: ${layerStates[l.id]?.error}`).join('\n')}
          style={{
            fontFamily: 'var(--font-rajdhani)',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.1em',
            color: '#cc3a20',
            cursor: 'help',
            flexShrink: 0,
          }}
        >
          ✕ {errorCount} Erreur{errorCount > 1 ? 's' : ''}
        </span>
      )}

      {/* Couches vides */}
      {emptyLayers.length > 0 && (
        <span
          title={`Couches actives sans données : ${emptyLayers.map(l => l.label).join(', ')}`}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: '#1e3a5a',
            letterSpacing: '0.04em',
            cursor: 'help',
            flexShrink: 0,
          }}
        >
          {emptyLayers.map(l => l.icon).join(' ')} vide{emptyLayers.length > 1 ? 's' : ''}
        </span>
      )}

      {/* Coordonnées / zoom */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: '#243a55',
        marginLeft: 'auto',
        letterSpacing: '0.06em',
        flexShrink: 0,
      }}>
        {displayVs.latitude.toFixed(4)}°N &nbsp;
        {Math.abs(displayVs.longitude).toFixed(4)}°{displayVs.longitude >= 0 ? 'E' : 'O'} &nbsp;
        z{displayVs.zoom.toFixed(1)}
      </span>
    </footer>
  )
}
