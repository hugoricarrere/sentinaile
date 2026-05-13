import { describe, it, expect } from 'vitest'
import { skydiveCondition, paraglideCondition, basejumpCondition, surfScore } from './weather'

describe('skydiveCondition', () => {
  it('returns green on favorable conditions', () => {
    expect(skydiveCondition(20, 50, 8, false)).toBe('green')
  })
  it('returns yellow when surface wind 25-35', () => {
    expect(skydiveCondition(30, 50, 8, false)).toBe('yellow')
  })
  it('returns red when surface wind > 35', () => {
    expect(skydiveCondition(40, 50, 8, false)).toBe('red')
  })
  it('returns red when precipitation', () => {
    expect(skydiveCondition(10, 40, 8, true)).toBe('red')
  })
  it('returns yellow when 3000m wind 60-80', () => {
    expect(skydiveCondition(20, 70, 8, false)).toBe('yellow')
  })
  it('returns red when visibility < 3km', () => {
    expect(skydiveCondition(20, 50, 2, false)).toBe('red')
  })
})

describe('paraglideCondition', () => {
  it('returns green on ideal conditions', () => {
    expect(paraglideCondition(20, 10, 18, 400, false)).toBe('green')
  })
  it('returns red when wind > 45', () => {
    expect(paraglideCondition(50, 20, 18, 400, false)).toBe('red')
  })
  it('returns red on storm forecast', () => {
    expect(paraglideCondition(15, 10, 18, 400, true)).toBe('red')
  })
  it('returns yellow when wind 30-45', () => {
    expect(paraglideCondition(35, 15, 18, 400, false)).toBe('yellow')
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
  it('returns yellow when wind 15-20', () => {
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
