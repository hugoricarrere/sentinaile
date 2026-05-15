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

// ── Additional edge cases ─────────────────────────────────────────────────

describe('skydiveCondition – edge cases', () => {
  it('storm always red regardless of other conditions', () => {
    expect(skydiveCondition(5, 20, 10, 0, 10, true)).toBe('red')
  })
  it('wind exactly above surface limit (35.1 km/h) is red', () => {
    expect(skydiveCondition(35.1, 20, 10, 0, 10, false)).toBe('red')
  })
  it('wind at 26 km/h (above yellow threshold 25) is yellow', () => {
    expect(skydiveCondition(26, 20, 10, 0, 10, false)).toBe('yellow')
  })
  it('green conditions with zero CAPE', () => {
    expect(skydiveCondition(10, 30, 15, 0, 20, false, 0)).toBe('green')
  })
})

describe('paraglideCondition – edge cases', () => {
  it('zero wind is red (no lift)', () => {
    expect(paraglideCondition(0, 0, 20, 400, false)).toBe('red')
  })
  it('wind exactly at lower good threshold (10 km/h) is green', () => {
    expect(paraglideCondition(10, 5, 20, 400, false, 0, 500, 0)).toBe('green')
  })
  it('wind at 9 km/h (below 10) is yellow', () => {
    expect(paraglideCondition(9, 5, 20, 400, false, 0, 500, 0)).toBe('yellow')
  })
  it('severe CAPE (>2000) is red', () => {
    expect(paraglideCondition(15, 10, 20, 400, false, 2001, 1000, 0)).toBe('red')
  })
  it('storm always red', () => {
    expect(paraglideCondition(10, 5, 20, 400, true)).toBe('red')
  })
})

describe('basejumpCondition – edge cases', () => {
  it('precipitation is red', () => {
    expect(basejumpCondition(10, 5, 10, true, 1000)).toBe('red')
  })
  it('wind above limit (20.1 km/h) is red', () => {
    expect(basejumpCondition(20.1, 5, 10, false, 1000)).toBe('red')
  })
  it('wind at 14 km/h (≤15) with good visibility is green', () => {
    expect(basejumpCondition(14, 5, 10, false, 1000)).toBe('green')
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

  // ── windDirDeg + facingDeg (real offshore calculation) ──
  it('scores higher when wind is exactly offshore vs onshore (same other conditions)', () => {
    // facingDeg=270 (west-facing spot), offshoreDir=90 (east wind → blowing offshore)
    const offshore = surfScore(2, 12, 10, false, 90, 270)  // wind from east = offshore
    const onshore  = surfScore(2, 12, 10, false, 270, 270) // wind from west = onshore
    expect(offshore).toBeGreaterThan(onshore)
  })
  it('detects offshore when wind direction is within 70° of pure offshore direction', () => {
    // facingDeg=270, offshoreDir=90; wind at 130° → diff = 40° → offshore
    const score = surfScore(2, 12, 10, false, 130, 270)
    // Should behave like offshore: same as explicit windOffshore=true
    const reference = surfScore(2, 12, 10, true)
    expect(score).toBe(reference)
  })
  it('detects onshore when wind direction is 90° from pure offshore direction', () => {
    // facingDeg=270, offshoreDir=90; wind at 180° → diff = 90° → onshore
    const score = surfScore(2, 12, 10, false, 180, 270)
    // Should behave like onshore
    const reference = surfScore(2, 12, 10, false)
    expect(score).toBe(reference)
  })
  it('falls back to windOffshore param when windDirDeg and facingDeg are absent', () => {
    const withTrue  = surfScore(2, 12, 10, true)
    const withFalse = surfScore(2, 12, 10, false)
    expect(withTrue).toBeGreaterThanOrEqual(withFalse)
  })

  // ── Additional surf edge cases ──────────────────────────────────────────
  it('cross-shore wind (90° off offshore) triggers wind penalty', () => {
    // facingDeg=270 (west-facing), offshoreDir=(270+180)%360=90
    // wind at 0°: angleDiff(0, 90)=90 ≥ 70 → NOT offshore → penalty applied
    // score: 5 +2(swell 1.8) +2(period 13) -2(not offshore) = 7
    const score = surfScore(1.8, 13, 15, false, 0, 270)
    expect(score).toBeLessThanOrEqual(7)
    // Also verify it's worse than true-offshore with same inputs
    const offshoreScore = surfScore(1.8, 13, 15, true, undefined, undefined)
    expect(score).toBeLessThanOrEqual(offshoreScore)
  })
  it('wind within 70° of offshore direction is treated as offshore', () => {
    // facingDeg=270, offshoreDir=90, wind at 120° — angleDiff(120,90)=30° < 70 → offshore
    const score = surfScore(1.8, 13, 12, false, 120, 270)
    // Same as explicit true offshore with the same swell/wind values
    const scoreRef = surfScore(1.8, 13, 12, true, undefined, undefined)
    expect(score).toBe(scoreRef)
  })
  it('giant swell (>4m) penalizes score', () => {
    const score = surfScore(5.0, 15, 5, true)
    expect(score).toBeLessThan(7)
  })
  it('perfect conditions (swell 2m, period 14s, light offshore) score 10', () => {
    // score: 5 +2(swell 2.0 in 1.5-2.5) +2(period 14 ≥12) +1(offshore & wind<15) = 10 → clamped 10
    const score = surfScore(2.0, 14, 8, true, 90, 270)
    expect(score).toBe(10)
  })
})
