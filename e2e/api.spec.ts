import { test, expect } from '@playwright/test'

test.describe('Routes API', () => {
  test('GET /api/health retourne status ok', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
    expect(json.service).toBe('SentinAile')
  })

  test('GET /api/geocode refuse sans query param', async ({ request }) => {
    const res = await request.get('/api/geocode')
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('GET /api/spot-weather valide les paramètres', async ({ request }) => {
    // Paramètres manquants → 400
    const bad = await request.get('/api/spot-weather')
    expect(bad.status()).toBe(400)

    // Paramètres hors bornes → 400
    const outOfRange = await request.get('/api/spot-weather?lat=999&lng=0')
    expect(outOfRange.status()).toBe(400)
  })

  test('GET /api/surf-forecast valide les paramètres', async ({ request }) => {
    const bad = await request.get('/api/surf-forecast')
    expect(bad.status()).toBe(400)
  })
})
