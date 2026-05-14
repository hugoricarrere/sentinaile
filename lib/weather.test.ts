import { describe, it, expect } from 'vitest'
import { skydiveCondition, paraglideCondition, basejumpCondition, surfScore } from './weather'

// Helper: good base conditions (no storm, dry day, clear sky, light wind)
const GOOD = { wind4k: 40, vis: 10, precip: 0, cloud: 20, storm: false }

describe('skydiveCondition', () => {
  it('returns green on ideal conditions', () => {
    expect(skydiveCondition(15, GOOD.wind4k, GOOD.vis, GOOD.precip, GOOD.cloud, GOOD.storm, 0)).toBe('green')
  })

  // ── Storm ──
  it('returns red on thunderstorm regardless of other conditions', () => {
    expect(skydiveCondition(10, 30, 10, 0, 20, true, 0)).toBe('red')
  })

  // ── Surface wind ──
  it('returns yellow when surface wind 25–35 km/h', () => {
    expect(skydiveCondition(30, GOOD.wind4k, GOOD.vis, GOOD.precip, GOOD.cloud, GOOD.storm, 0)).toBe('yellow')
  })
  it('returns red when surface wind > 35 km/h', () => {
    expect(skydiveCondition(40, GOOD.wind4k, GOOD.vis, GOOD.precip, GOOD.cloud, GOOD.storm, 0)).toBe('red')
  })

  // ── Wind at 4 000m ──
  it('returns yellow when 4000m wind 60–80 km/h', () => {
    expect(skydiveCondition(15, 70, GOOD.vis, GOOD.precip, GOOD.cloud, GOOD.storm, 0)).toBe('yellow')
  })
  it('returns red when 4000m wind > 80 km/h', () => {
    expect(skydiveCondition(15, 90, GOOD.vis, GOOD.precip, GOOD.cloud, GOOD.storm, 0)).toBe('red')
  })

  // ── Visibility ──
  it('returns red when visibility < 3 km', () => {
    expect(skydiveCondition(15, GOOD.wind4k, 2, GOOD.precip, GOOD.cloud, GOOD.storm, 0)).toBe('red')
  })
  it('returns yellow when visibility 3–5 km', () => {
    expect(skydiveCondition(15, GOOD.wind4k, 4, GOOD.precip, GOOD.cloud, GOOD.storm, 0)).toBe('yellow')
  })

  // ── Precipitation fraction ──
  it('returns green when precip < 50% of daylight', () => {
    expect(skydiveCondition(15, GOOD.wind4k, GOOD.vis, 0.3, GOOD.cloud, GOOD.storm, 0)).toBe('green')
  })
  it('returns yellow when precip 50–75% of daylight', () => {
    expect(skydiveCondition(15, GOOD.wind4k, GOOD.vis, 0.6, GOOD.cloud, GOOD.storm, 0)).toBe('yellow')
  })
  it('returns red when precip > 75% of daylight', () => {
    expect(skydiveCondition(15, GOOD.wind4k, GOOD.vis, 0.8, GOOD.cloud, GOOD.storm, 0)).toBe('red')
  })

  // ── Low cloud cover ──
  it('returns yellow when low cloud cover > 75%', () => {
    expect(skydiveCondition(15, GOOD.wind4k, GOOD.vis, GOOD.precip, 80, GOOD.storm, 0)).toBe('yellow')
  })
  it('returns green when low cloud cover ≤ 75%', () => {
    expect(skydiveCondition(15, GOOD.wind4k, GOOD.vis, GOOD.precip, 60, GOOD.storm, 0)).toBe('green')
  })

  // ── CAPE ──
  it('returns red when CAPE > 2500 J/kg', () => {
    expect(skydiveCondition(15, GOOD.wind4k, GOOD.vis, GOOD.precip, GOOD.cloud, GOOD.storm, 3000)).toBe('red')
  })
  it('returns yellow when CAPE 1000–2500 J/kg', () => {
    expect(skydiveCondition(15, GOOD.wind4k, GOOD.vis, GOOD.precip, GOOD.cloud, GOOD.storm, 1500)).toBe('yellow')
  })
  it('returns green when CAPE <= 1000 J/kg', () => {
    expect(skydiveCondition(15, GOOD.wind4k, GOOD.vis, GOOD.precip, GOOD.cloud, GOOD.storm, 500)).toBe('green')
  })
  it('defaults cape to 0 (optional param)', () => {
    expect(skydiveCondition(15, GOOD.wind4k, GOOD.vis, GOOD.precip, GOOD.cloud, GOOD.storm)).toBe('green')
  })
})

describe('paraglideCondition', () => {
  it('returns green on ideal conditions', () => {
    expect(paraglideCondition(20, 10, 18, 400, false, 0, 1000, 0)).toBe('green')
  })
  it('returns red when wind > 45', () => {
    expect(paraglideCondition(50, 20, 18, 400, false, 0, 1000, 0)).toBe('red')
  })
  it('returns red on storm forecast', () => {
    expect(paraglideCondition(15, 10, 18, 400, true, 0, 1000, 0)).toBe('red')
  })
  it('returns yellow when wind 30–45', () => {
    expect(paraglideCondition(35, 15, 18, 400, false, 0, 1000, 0)).toBe('yellow')
  })

  // ── CAPE ──
  it('returns red when CAPE > 2000 J/kg', () => {
    expect(paraglideCondition(20, 10, 18, 400, false, 2500, 1000, 0)).toBe('red')
  })
  it('returns yellow when CAPE 800–2000 J/kg', () => {
    expect(paraglideCondition(20, 10, 18, 400, false, 1200, 1000, 0)).toBe('yellow')
  })
  it('returns green when CAPE <= 800 J/kg', () => {
    expect(paraglideCondition(20, 10, 18, 400, false, 400, 1000, 0)).toBe('green')
  })

  // ── Boundary Layer Height ──
  it('returns red when blHeight < 200m', () => {
    expect(paraglideCondition(20, 10, 18, 400, false, 0, 100, 0)).toBe('red')
  })
  it('returns yellow when blHeight 200–400m', () => {
    expect(paraglideCondition(20, 10, 18, 400, false, 0, 300, 0)).toBe('yellow')
  })
  it('returns green when blHeight >= 400m with good conditions', () => {
    expect(paraglideCondition(20, 10, 18, 400, false, 0, 800, 0)).toBe('green')
  })

  // ── Lifted Index ──
  it('returns red when liftedIndex < -6', () => {
    expect(paraglideCondition(20, 10, 18, 400, false, 0, 1000, -7)).toBe('red')
  })
  it('returns yellow when liftedIndex -6 to -3', () => {
    expect(paraglideCondition(20, 10, 18, 400, false, 0, 1000, -4)).toBe('yellow')
  })
  it('returns green when liftedIndex >= -3 with good conditions', () => {
    expect(paraglideCondition(20, 10, 18, 400, false, 0, 1000, 2)).toBe('green')
  })
  it('defaults optional params', () => {
    expect(paraglideCondition(20, 10, 18, 400, false)).toBe('green')
  })
})

describe('basejumpCondition', () => {
  it('returns green on ideal conditions', () => {
    expect(basejumpCondition(10, 8, 8, false, 800)).toBe('green')
  })
  it('returns red when wind > 20', () => {
    expect(basejumpCondition(25, 10, 8, false, 800)).toBe('red')
  })
  it('returns red when ceiling < 600m', () => {
    expect(basejumpCondition(10, 8, 8, false, 400)).toBe('red')
  })
  it('returns yellow when wind 15–20', () => {
    expect(basejumpCondition(17, 10, 8, false, 800)).toBe('yellow')
  })
})

describe('surfScore', () => {
  it('returns high score for ideal conditions', () => {
    expect(surfScore(2, 14, 12, true)).toBeGreaterThan(7)
  })
  it('returns low score for poor conditions', () => {
    expect(surfScore(0.3, 6, 30, false)).toBeLessThan(4)
  })
  it('clamps score between 1 and 10', () => {
    const score = surfScore(2.2, 16, 5, true)
    expect(score).toBeGreaterThanOrEqual(1)
    expect(score).toBeLessThanOrEqual(10)
  })
})
