import type { GeoPoint } from './types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GlobalFilters {
  /** Show only points whose data.country === 'France' */
  franceOnly: boolean
}

export interface SkydiveFilters {
  /** Weather conditions to show */
  conditions: string[]
  /** Minimum maxAltitudeM for the drop zone */
  altitudeMin: number
}

export interface ParaglidingFilters {
  /** Pilot level categories to show */
  levels: string[]
  /** Minimum takeoff altitude in metres */
  altitudeMin: number
}

export interface BasejumpFilters {
  /** Difficulty levels to show */
  difficulties: string[]
  /** Legal status to show */
  legalStatus: string[]
  /** Exit types to show */
  types: string[]
}

export interface AllFilters {
  global: GlobalFilters
  skydive: SkydiveFilters
  paragliding: ParaglidingFilters
  basejump: BasejumpFilters
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_FILTERS: AllFilters = {
  global: {
    franceOnly: true,
  },
  skydive: {
    conditions: ['green', 'yellow', 'red'],
    altitudeMin: 0,
  },
  paragliding: {
    levels: ['beginner', 'intermediate', 'advanced', 'expert', 'all'],
    altitudeMin: 0,
  },
  basejump: {
    difficulties: ['intermediate', 'advanced', 'expert'],
    legalStatus: ['authorized', 'tolerated'],
    types: ['cliff', 'bridge', 'antenna', 'earth'],
  },
}

// ─── Filter application ───────────────────────────────────────────────────────

export function applyFilters(
  points: GeoPoint[],
  layerId: string,
  filters: AllFilters,
): GeoPoint[] {
  let result = points

  // Global: France only
  if (filters.global.franceOnly) {
    result = result.filter(
      (p) => (p.data as Record<string, unknown>).country === 'France',
    )
  }

  switch (layerId) {
    case 'skydive': {
      const f = filters.skydive
      result = result.filter((p) => {
        const d = p.data as Record<string, unknown>
        if (!f.conditions.includes(d.condition as string)) return false
        if (f.altitudeMin > 0 && ((d.maxAltitudeM as number) ?? 0) < f.altitudeMin) return false
        return true
      })
      break
    }
    case 'paragliding': {
      const f = filters.paragliding
      result = result.filter((p) => {
        const d = p.data as Record<string, unknown>
        if (!f.levels.includes(d.level as string)) return false
        if (f.altitudeMin > 0 && ((d.altitudeM as number) ?? 0) < f.altitudeMin) return false
        return true
      })
      break
    }
    case 'basejump': {
      const f = filters.basejump
      result = result.filter((p) => {
        const d = p.data as Record<string, unknown>
        if (!f.difficulties.includes(d.difficulty as string)) return false
        if (!f.legalStatus.includes(d.legal as string)) return false
        if (!f.types.includes(d.type as string)) return false
        return true
      })
      break
    }
  }

  return result
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true if any filter for this layer differs from the default. */
export function hasActiveFilters(layerId: string, filters: AllFilters): boolean {
  const def = DEFAULT_FILTERS
  if (filters.global.franceOnly !== def.global.franceOnly) return true

  switch (layerId) {
    case 'skydive': {
      const f = filters.skydive
      const d = def.skydive
      return (
        f.conditions.length !== d.conditions.length ||
        f.altitudeMin !== d.altitudeMin
      )
    }
    case 'paragliding': {
      const f = filters.paragliding
      const d = def.paragliding
      return (
        f.levels.length !== d.levels.length ||
        f.altitudeMin !== d.altitudeMin
      )
    }
    case 'basejump': {
      const f = filters.basejump
      const d = def.basejump
      return (
        f.difficulties.length !== d.difficulties.length ||
        f.legalStatus.length !== d.legalStatus.length ||
        f.types.length !== d.types.length
      )
    }
    default:
      return false
  }
}
