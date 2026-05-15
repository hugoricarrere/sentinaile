import { describe, it, expect } from 'vitest'
import { applyFilters, hasActiveFilters, DEFAULT_FILTERS, type AllFilters } from './filters'
import type { GeoPoint } from './types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePoint(overrides: Partial<GeoPoint> & { data?: Record<string, unknown> }): GeoPoint {
  return {
    id: 'test-1',
    latitude: 46,
    longitude: 2,
    layerId: 'skydive',
    data: {},
    ...overrides,
  }
}

function cloneFilters(overrides: Partial<AllFilters> = {}): AllFilters {
  return {
    global:    { ...DEFAULT_FILTERS.global },
    skydive:   { ...DEFAULT_FILTERS.skydive,    conditions: [...DEFAULT_FILTERS.skydive.conditions] },
    paragliding: { ...DEFAULT_FILTERS.paragliding, levels: [...DEFAULT_FILTERS.paragliding.levels] },
    basejump:  {
      ...DEFAULT_FILTERS.basejump,
      difficulties: [...DEFAULT_FILTERS.basejump.difficulties],
      legalStatus:  [...DEFAULT_FILTERS.basejump.legalStatus],
      types:        [...DEFAULT_FILTERS.basejump.types],
    },
    surf: { ...DEFAULT_FILTERS.surf },
    ...overrides,
  }
}

// ── applyFilters ───────────────────────────────────────────────────────────────

describe('applyFilters — global franceOnly', () => {
  it('passes a point with country=France through', () => {
    const filters = cloneFilters()
    const point = makePoint({ data: { country: 'France' } })
    expect(applyFilters([point], 'flights', filters)).toHaveLength(1)
  })

  it('removes a point with country=Germany when franceOnly=true', () => {
    const filters = cloneFilters()
    const point = makePoint({ data: { country: 'Germany' } })
    expect(applyFilters([point], 'flights', filters)).toHaveLength(0)
  })

  it('passes all points when franceOnly=false', () => {
    const filters = cloneFilters({ global: { franceOnly: false } })
    const point = makePoint({ data: { country: 'Germany' } })
    expect(applyFilters([point], 'flights', filters)).toHaveLength(1)
  })

  it('falls back to bbox check when no country field', () => {
    const filters = cloneFilters()
    // Paris coords — inside France bbox
    const inFrance = makePoint({ latitude: 48.85, longitude: 2.35, data: {} })
    // Madrid coords — outside France bbox
    const outside = makePoint({ latitude: 40.4, longitude: -3.7, data: {} })
    expect(applyFilters([inFrance], 'flights', filters)).toHaveLength(1)
    expect(applyFilters([outside], 'flights', filters)).toHaveLength(0)
  })
})

describe('applyFilters — skydive', () => {
  const baseFilters = cloneFilters()

  it('keeps points matching all conditions by default', () => {
    const points = ['green', 'yellow', 'red'].map((condition, i) =>
      makePoint({ id: String(i), layerId: 'skydive', data: { country: 'France', condition, maxAltitudeM: 4000 } })
    )
    expect(applyFilters(points, 'skydive', baseFilters)).toHaveLength(3)
  })

  it('filters out points not in selected conditions', () => {
    const filters = cloneFilters({ skydive: { conditions: ['green'], altitudeMin: 0 } })
    const points = ['green', 'red'].map((condition, i) =>
      makePoint({ id: String(i), layerId: 'skydive', data: { country: 'France', condition, maxAltitudeM: 4000 } })
    )
    expect(applyFilters(points, 'skydive', filters)).toHaveLength(1)
  })

  it('filters out points below altitudeMin', () => {
    const filters = cloneFilters({ skydive: { conditions: ['green', 'yellow', 'red'], altitudeMin: 3000 } })
    const points = [
      makePoint({ id: '1', data: { country: 'France', condition: 'green', maxAltitudeM: 4000 } }),
      makePoint({ id: '2', data: { country: 'France', condition: 'green', maxAltitudeM: 2000 } }),
    ]
    expect(applyFilters(points, 'skydive', filters)).toHaveLength(1)
  })

  it('passes all when altitudeMin=0 (disabled)', () => {
    const filters = cloneFilters({ skydive: { conditions: ['green', 'yellow', 'red'], altitudeMin: 0 } })
    const point = makePoint({ data: { country: 'France', condition: 'green', maxAltitudeM: 100 } })
    expect(applyFilters([point], 'skydive', filters)).toHaveLength(1)
  })
})

describe('applyFilters — paragliding', () => {
  it('keeps points with matching level', () => {
    const filters = cloneFilters({ paragliding: { levels: ['beginner'], altitudeMin: 0 } })
    const keep = makePoint({ data: { country: 'France', level: 'beginner', altitudeM: 500 } })
    const drop = makePoint({ id: '2', data: { country: 'France', level: 'expert', altitudeM: 500 } })
    const result = applyFilters([keep, drop], 'paragliding', filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('test-1')
  })

  it('filters out points below altitudeMin', () => {
    const filters = cloneFilters({
      paragliding: { levels: ['beginner', 'intermediate', 'advanced', 'expert', 'all'], altitudeMin: 1000 },
    })
    const low = makePoint({ id: '1', data: { country: 'France', level: 'beginner', altitudeM: 500 } })
    const high = makePoint({ id: '2', data: { country: 'France', level: 'beginner', altitudeM: 1500 } })
    expect(applyFilters([low, high], 'paragliding', filters)).toHaveLength(1)
  })
})

describe('applyFilters — basejump', () => {
  function bjPoint(id: string, overrides: Record<string, unknown> = {}): GeoPoint {
    return makePoint({
      id, layerId: 'basejump',
      data: {
        country: 'France', difficulty: 'advanced', legal: 'authorized',
        type: 'cliff', ...overrides,
      },
    })
  }

  it('keeps default points through default filters', () => {
    expect(applyFilters([bjPoint('1')], 'basejump', cloneFilters())).toHaveLength(1)
  })

  it('filters by difficulty', () => {
    const filters = cloneFilters({ basejump: { ...DEFAULT_FILTERS.basejump, difficulties: ['expert'] } })
    expect(applyFilters([bjPoint('1', { difficulty: 'advanced' })], 'basejump', filters)).toHaveLength(0)
    expect(applyFilters([bjPoint('2', { difficulty: 'expert'   })], 'basejump', filters)).toHaveLength(1)
  })

  it('filters by legal status', () => {
    const filters = cloneFilters({ basejump: { ...DEFAULT_FILTERS.basejump, legalStatus: ['authorized'] } })
    expect(applyFilters([bjPoint('1', { legal: 'tolerated' })], 'basejump', filters)).toHaveLength(0)
    expect(applyFilters([bjPoint('2', { legal: 'authorized' })], 'basejump', filters)).toHaveLength(1)
  })

  it('filters by exit type', () => {
    const filters = cloneFilters({ basejump: { ...DEFAULT_FILTERS.basejump, types: ['bridge'] } })
    expect(applyFilters([bjPoint('1', { type: 'cliff' })], 'basejump', filters)).toHaveLength(0)
    expect(applyFilters([bjPoint('2', { type: 'bridge' })], 'basejump', filters)).toHaveLength(1)
  })
})

describe('applyFilters — empty input', () => {
  it('returns empty array for empty points', () => {
    expect(applyFilters([], 'skydive', cloneFilters())).toEqual([])
  })

  it('returns all points unchanged for unknown layerId', () => {
    const filters = cloneFilters({ global: { franceOnly: false } })
    const point = makePoint({ data: { country: 'Germany' } })
    expect(applyFilters([point], 'unknown-layer', filters)).toHaveLength(1)
  })
})

// ── hasActiveFilters ───────────────────────────────────────────────────────────

describe('hasActiveFilters', () => {
  it('returns false for default filters on all layers', () => {
    for (const layerId of ['skydive', 'paragliding', 'basejump', 'flights']) {
      expect(hasActiveFilters(layerId, cloneFilters())).toBe(false)
    }
  })

  it('returns true when franceOnly is changed', () => {
    const filters = cloneFilters({ global: { franceOnly: false } })
    expect(hasActiveFilters('flights', filters)).toBe(true)
  })

  it('returns true when skydive conditions narrowed', () => {
    const filters = cloneFilters({ skydive: { conditions: ['green'], altitudeMin: 0 } })
    expect(hasActiveFilters('skydive', filters)).toBe(true)
  })

  it('returns true when skydive altitudeMin set', () => {
    const filters = cloneFilters({ skydive: { ...DEFAULT_FILTERS.skydive, altitudeMin: 3000 } })
    expect(hasActiveFilters('skydive', filters)).toBe(true)
  })

  it('returns true when paragliding levels narrowed', () => {
    const filters = cloneFilters({ paragliding: { levels: ['beginner'], altitudeMin: 0 } })
    expect(hasActiveFilters('paragliding', filters)).toBe(true)
  })

  it('returns true when basejump difficulty changed', () => {
    const filters = cloneFilters({
      basejump: { ...DEFAULT_FILTERS.basejump, difficulties: ['expert'] },
    })
    expect(hasActiveFilters('basejump', filters)).toBe(true)
  })

  it('returns false for default basejump (order-insensitive comparison)', () => {
    // Shuffle the arrays — should still be "not active"
    const filters = cloneFilters({
      basejump: {
        ...DEFAULT_FILTERS.basejump,
        difficulties: ['expert', 'advanced', 'intermediate'],
        types: ['earth', 'antenna', 'bridge', 'cliff'],
      },
    })
    expect(hasActiveFilters('basejump', filters)).toBe(false)
  })
})
