'use client'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'

interface Props {
  layerStates: LayerStates
  viewState: { longitude: number; latitude: number; zoom: number }
}

export default function StatusBar({ layerStates, viewState }: Props) {
  const connected = LAYERS.filter(l => layerStates[l.id]?.lastUpdated !== null).length
  const staleCount = LAYERS.filter(l => layerStates[l.id]?.stale).length

  return (
    <footer style={{
      height: 36,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 22,
      padding: '0 22px',
      background: '#040810',
      borderTop: '1px solid #1a2840',
    }}>
      <span style={{
        fontFamily: 'var(--font-rajdhani)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.12em',
        color: '#00c87a',
        textTransform: 'uppercase',
      }}>
        ● Sources {connected}/{LAYERS.length}
      </span>

      {staleCount > 0 && (
        <span style={{
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.1em',
          color: '#cc8820',
        }}>
          ⚠ {staleCount} Stale
        </span>
      )}

      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: '#2d4a65',
        marginLeft: 'auto',
        letterSpacing: '0.06em',
      }}>
        {viewState.latitude.toFixed(4)}°N &nbsp;
        {viewState.longitude.toFixed(4)}°E &nbsp;
        z{viewState.zoom.toFixed(1)}
      </span>
    </footer>
  )
}
