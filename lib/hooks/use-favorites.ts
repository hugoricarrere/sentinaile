'use client'
import { useState, useCallback } from 'react'

const KEY = 'sentinaile-favorites'

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch { return [] }
}

function save(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)) } catch {}
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    return load()
  })

  const toggle = useCallback((id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      save(next)
      return next
    })
  }, [])

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites])

  return { favorites, toggle, isFavorite }
}
