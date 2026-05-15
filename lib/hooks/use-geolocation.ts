'use client'
import { useState, useCallback, useRef } from 'react'
import type { FlyToTarget } from '@/components/MapCanvas'

interface UseGeolocationResult {
  geoError: string | null
  handleGeolocate: () => void
  clearGeoError: () => void
}

/** Manages browser geolocation with user-facing error feedback (auto-clears after 6s). */
export function useGeolocation(onLocated: (target: FlyToTarget) => void): UseGeolocationResult {
  const [geoError, setGeoError] = useState<string | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearGeoError = useCallback(() => setGeoError(null), [])

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée par ce navigateur.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onLocated({ longitude: coords.longitude, latitude: coords.latitude, zoom: 11 })
        setGeoError(null)
      },
      (err) => {
        const msg =
          err.code === 1
            ? '📍 Permission refusée — autorisez la géolocalisation dans les paramètres du navigateur.'
            : '📍 Position indisponible. Réessayez.'
        setGeoError(msg)
        if (toastRef.current) clearTimeout(toastRef.current)
        toastRef.current = setTimeout(() => setGeoError(null), 6000)
      },
      { timeout: 8000 },
    )
  }, [onLocated])

  return { geoError, handleGeolocate, clearGeoError }
}
