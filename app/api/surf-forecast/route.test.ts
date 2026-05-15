import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/cache', () => ({
  globalCache: {
    get: vi.fn(async (_key: string, fetcher: () => Promise<unknown>) => ({
      data: await fetcher(),
      fromCache: false,
    })),
  },
}))

// Mock rateLimit to always allow requests
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => true),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('GET /api/surf-forecast', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 400 for missing params', async () => {
    const req = new NextRequest('http://localhost/api/surf-forecast')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 502 when marine API fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const req = new NextRequest('http://localhost/api/surf-forecast?lat=43.5&lng=-1.5')
    const res = await GET(req)
    expect(res.status).toBe(502)
  })

  it('returns days array for valid coordinates', async () => {
    // Build a mock marine response with 7*24 hours
    const times = Array.from({ length: 168 }, (_, i) => {
      const d = new Date('2026-05-15T00:00:00')
      d.setHours(d.getHours() + i)
      return d.toISOString().replace('Z', '')
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        hourly: {
          time: times,
          swell_wave_height: Array(168).fill(1.5),
          swell_wave_period: Array(168).fill(12),
          wind_speed_10m: Array(168).fill(10),
          wind_direction_10m: Array(168).fill(90),
          wave_height: Array(168).fill(1.5),
          wave_period: Array(168).fill(12),
        },
      }),
    })
    const req = new NextRequest('http://localhost/api/surf-forecast?lat=43.5&lng=-1.5')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.days)).toBe(true)
    expect(body.days.length).toBeGreaterThan(0)
    expect(typeof body.bestDayIdx).toBe('number')
  })
})
