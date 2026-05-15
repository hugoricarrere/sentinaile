'use client'
import { useEffect, useRef, useState } from 'react'
import { LAYERS } from '@/lib/layers'
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
    <footer className="h-[34px] shrink-0 flex items-center gap-4 px-5 bg-header border-t border-border overflow-hidden">
      {/* Sources connectées */}
      <span className="font-display font-semibold text-[12px] tracking-[0.12em] text-[#00c87a] uppercase shrink-0">
        ● Sources {connected}/{LAYERS.length}
      </span>

      {/* Données périmées */}
      {staleCount > 0 && (
        <span title={`${staleCount} source(s) avec données périmées`} className="font-display font-semibold text-[12px] tracking-[0.1em] text-stale shrink-0">
          ⚠ {staleCount} Stale
        </span>
      )}

      {/* Erreurs */}
      {errorCount > 0 && (
        <span
          title={LAYERS.filter(l => !!layerStates[l.id]?.error).map(l => `${l.label}: ${layerStates[l.id]?.error}`).join('\n')}
          className="font-display font-semibold text-[12px] tracking-[0.1em] text-[#cc3a20] cursor-help shrink-0"
        >
          ✕ {errorCount} Erreur{errorCount > 1 ? 's' : ''}
        </span>
      )}

      {/* Couches vides */}
      {emptyLayers.length > 0 && (
        <span
          title={`Couches actives sans données : ${emptyLayers.map(l => l.label).join(', ')}`}
          className="font-code text-[9px] text-[#1e3a5a] tracking-[0.04em] cursor-help shrink-0"
        >
          {emptyLayers.map(l => l.icon).join(' ')} vide{emptyLayers.length > 1 ? 's' : ''}
        </span>
      )}

      {/* Coordonnées / zoom */}
      <span className="font-code text-[11px] text-label ml-auto tracking-[0.06em] shrink-0">
        {displayVs.latitude.toFixed(4)}°N &nbsp;
        {Math.abs(displayVs.longitude).toFixed(4)}°{displayVs.longitude >= 0 ? 'E' : 'O'} &nbsp;
        z{displayVs.zoom.toFixed(1)}
      </span>
    </footer>
  )
}
