import { describe, it, expect } from 'vitest'
import { haversineKm, formatKm } from './haversine'

describe('haversineKm', () => {
  it('Paris → London ≈ 340 km (±10 km)', () => {
    // Paris: 48.8566, 2.3522 / London: 51.5074, -0.1278
    const dist = haversineKm(48.8566, 2.3522, 51.5074, -0.1278)
    expect(dist).toBeGreaterThan(330)
    expect(dist).toBeLessThan(350)
  })

  it('distance entre un point et lui-même = 0', () => {
    expect(haversineKm(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0)
  })
})

describe('formatKm', () => {
  it('formatKm(0.4) = "< 1 km"', () => {
    expect(formatKm(0.4)).toBe('< 1 km')
  })

  it('formatKm(3.2) = "3 km"', () => {
    expect(formatKm(3.2)).toBe('3 km')
  })

  it('formatKm(47) = "45 km"', () => {
    expect(formatKm(47)).toBe('45 km')
  })
})
