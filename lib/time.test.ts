import { describe, it, expect, vi, afterEach } from 'vitest'
import { parisHour, currentHourIndex } from './time'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('parisHour', () => {
  it('returns a number between 0 and 23', () => {
    const h = parisHour()
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThanOrEqual(23)
    expect(Number.isInteger(h)).toBe(true)
  })

  it('returns the correct hour for a known UTC timestamp (Paris = UTC+1 in winter)', () => {
    // 2024-01-15T14:00:00Z → 15:00 Paris (UTC+1 CET)
    vi.setSystemTime(new Date('2024-01-15T14:00:00Z'))
    expect(parisHour()).toBe(15)
  })

  it('returns the correct hour for a known UTC timestamp (Paris = UTC+2 in summer)', () => {
    // 2024-07-15T10:00:00Z → 12:00 Paris (UTC+2 CEST)
    vi.setSystemTime(new Date('2024-07-15T10:00:00Z'))
    expect(parisHour()).toBe(12)
  })

  it('handles midnight correctly in winter', () => {
    // 2024-01-15T23:00:00Z → 00:00 Paris next day
    vi.setSystemTime(new Date('2024-01-15T23:00:00Z'))
    expect(parisHour()).toBe(0)
  })
})

describe('currentHourIndex', () => {
  it('returns -1 fallback (paris hour) when array is empty', () => {
    // Any Paris hour is valid as fallback; just check it doesn't throw
    const result = currentHourIndex([])
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(23)
  })

  it('finds the correct index for a Paris winter hour', () => {
    // 2024-01-15T14:00:00Z → 15:00 Paris
    vi.setSystemTime(new Date('2024-01-15T14:00:00Z'))
    const times = Array.from({ length: 24 }, (_, i) =>
      `2024-01-15T${String(i).padStart(2, '0')}:00`
    )
    expect(currentHourIndex(times)).toBe(15)
  })

  it('finds the correct index for a Paris summer hour', () => {
    // 2024-07-15T10:00:00Z → 12:00 Paris
    vi.setSystemTime(new Date('2024-07-15T10:00:00Z'))
    const times = Array.from({ length: 24 }, (_, i) =>
      `2024-07-15T${String(i).padStart(2, '0')}:00`
    )
    expect(currentHourIndex(times)).toBe(12)
  })

  it('returns the Paris hour as fallback when no matching timestamp is found', () => {
    // 2024-01-15T14:00:00Z → Paris hour 15, but times array has wrong dates
    vi.setSystemTime(new Date('2024-01-15T14:00:00Z'))
    const wrongDayTimes = Array.from({ length: 24 }, (_, i) =>
      `2024-01-16T${String(i).padStart(2, '0')}:00`  // next day — no match
    )
    // fallback = parisHour() = 15
    expect(currentHourIndex(wrongDayTimes)).toBe(15)
  })

  it('matches on prefix (ignores minutes in timestamp)', () => {
    // Open-Meteo sometimes includes minutes "T14:00" — startsWith should still match
    vi.setSystemTime(new Date('2024-01-15T13:30:00Z'))  // 14:30 Paris
    const times = ['2024-01-15T14:00', '2024-01-15T15:00']
    expect(currentHourIndex(times)).toBe(0)
  })
})
