import { describe, it, expect } from 'vitest'
import { normalize, fuzzyScore, fuzzySearch } from './fuzzy'

describe('normalize', () => {
  it('lowercases and strips accents', () => {
    expect(normalize('Parachutisme')).toBe('parachutisme')
    expect(normalize('Île-de-France')).toBe('ile-de-france')
    expect(normalize('Annecy-le-Vieux')).toBe('annecy-le-vieux')
    expect(normalize('École')).toBe('ecole')
  })
})

describe('fuzzyScore', () => {
  it('returns high score for exact substring', () => {
    expect(fuzzyScore('annecy', 'col de la forclaz – annecy')).toBeGreaterThanOrEqual(100)
  })

  it('is case-insensitive', () => {
    expect(fuzzyScore('PONTOISE', 'Skydive Paris – Pontoise')).toBeGreaterThan(0)
  })

  it('is accent-insensitive', () => {
    expect(fuzzyScore('ecole', 'EPCOL – École de Parachutisme')).toBeGreaterThan(0)
    expect(fuzzyScore('ecole', 'EPCOL – École de Parachutisme')).toBeGreaterThanOrEqual(
      fuzzyScore('rien', 'EPCOL – École de Parachutisme'),
    )
  })

  it('handles 1-char typo (parachutizm)', () => {
    expect(fuzzyScore('parachutizm', 'Parachutisme')).toBeGreaterThan(0)
  })

  it('handles missing accent (forclaz vs forclàz)', () => {
    expect(fuzzyScore('forclaz', 'col de la Forclàz')).toBeGreaterThan(0)
  })

  it('returns 0 for completely unrelated query', () => {
    expect(fuzzyScore('zzzzqqqq', 'Skydive Paris Pontoise')).toBe(0)
  })

  it('scores exact match higher than fuzzy', () => {
    const exact = fuzzyScore('pontoise', 'Skydive Paris – Pontoise')
    const fuzzy = fuzzyScore('pontoize', 'Skydive Paris – Pontoise')
    expect(exact).toBeGreaterThan(fuzzy)
  })

  it('partial word match still scores', () => {
    // "paris" is in the name
    expect(fuzzyScore('paris', 'Skydive Paris – Pontoise')).toBeGreaterThan(0)
  })
})

describe('fuzzySearch', () => {
  const items = [
    'Skydive Paris – Pontoise',
    'Col de la Forclaz – Annecy',
    'Saint-Hilaire-du-Touvet',
    'EPCOL – École de Parachutisme',
    'Chamonix – Plan Praz',
  ]
  const getText = (s: string) => s

  it('returns sorted results', () => {
    const results = fuzzySearch(items, getText, 'annecy')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item).toBe('Col de la Forclaz – Annecy')
  })

  it('returns empty for blank query', () => {
    expect(fuzzySearch(items, getText, '')).toHaveLength(0)
    expect(fuzzySearch(items, getText, '  ')).toHaveLength(0)
  })

  it('respects limit', () => {
    const results = fuzzySearch(items, getText, 'a', 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('finds with typo (chamonics)', () => {
    const results = fuzzySearch(items, getText, 'chamonics', 5)
    expect(results.some(r => r.item.includes('Chamonix'))).toBe(true)
  })

  it('finds école with accent stripped', () => {
    const results = fuzzySearch(items, getText, 'ecole', 5)
    expect(results.some(r => r.item.includes('École'))).toBe(true)
  })
})
