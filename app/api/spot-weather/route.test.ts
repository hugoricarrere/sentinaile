import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock globalCache to avoid real network calls
vi.mock('@/lib/cache', () => ({
  globalCache: {
    get: vi.fn(async (_key: string, fetcher: () => Promise<unknown>) => ({
      data: await fetcher(),
      fromCache: false,
    })),
  },
}))

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('GET /api/spot-weather', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 400 for missing lat/lng', async () => {
    const req = new NextRequest('http://localhost/api/spot-weather')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid lat (out of range)', async () => {
    const req = new NextRequest('http://localhost/api/spot-weather?lat=999&lng=0')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for NaN lat', async () => {
    const req = new NextRequest('http://localhost/api/spot-weather?lat=abc&lng=0')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 502 when Open-Meteo is unavailable', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const req = new NextRequest('http://localhost/api/spot-weather?lat=43.5&lng=-1.5')
    const res = await GET(req)
    expect(res.status).toBe(502)
  })

  it('returns weather data for valid coordinates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          wind_speed_10m: 15,
          wind_gusts_10m: 22,
          wind_direction_10m: 270,
          temperature_2m: 18,
          weather_code: 0,
        },
      }),
    })
    const req = new NextRequest('http://localhost/api/spot-weather?lat=43.5&lng=-1.5')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.windKmh).toBe(15)
    expect(body.windGustsKmh).toBe(22)
    expect(body.description).toBe('Ciel dégagé')
  })

  it('returns 502 when Open-Meteo returns non-ok status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 })
    const req = new NextRequest('http://localhost/api/spot-weather?lat=43.5&lng=-1.5')
    const res = await GET(req)
    expect(res.status).toBe(502)
  })
})
