# SENTINEL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SENTINEL, un dashboard géospatial temps réel inspiré de Palantir, avec 10 couches de données publiques sur une carte Mapbox immersive.

**Architecture:** Next.js 14 App Router avec API routes servant de proxy/cache pour les sources externes. Un registre central (`layers-registry.ts`) déclare chaque couche — MapCanvas, LayerToggle et StatusBar se branchent dessus automatiquement. Polling HTTP client toutes les N secondes selon le TTL de chaque source.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Deck.gl 9, react-map-gl 7, mapbox-gl 3, Vitest

---

## Fichiers créés / modifiés

```
app/
  page.tsx
  globals.css
  layout.tsx
  api/
    _template/route.ts
    flights/route.ts
    ships/route.ts
    weather/route.ts
    air/route.ts
    trains/route.ts
    traffic/route.ts
    webcams/route.ts
    surf/route.ts
    skydive/route.ts
    paragliding/route.ts
    basejump/route.ts
components/
  MapCanvas.tsx
  TopBar.tsx
  StatusBar.tsx
  LayerToggle.tsx
  ContextPanel.tsx
  FrancePanel.tsx
  panels/
    FlightPanel.tsx
    ShipPanel.tsx
    WebcamPanel.tsx
    SurfPanel.tsx
    SkydivePanel.tsx
    ParaglidingPanel.tsx
    BasejumpPanel.tsx
lib/
  cache.ts
  weather.ts
  color.ts
  use-layer-data.ts
  layers-registry.ts
data/
  surf-spots.json
  skydive-dz.json
  paragliding-spots.json
  basejump-exits.json
.env.local.example
```

---

## Task 1 — Project scaffolding

**Files:** `package.json`, `tailwind.config.ts`, `.env.local`, `app/globals.css`, `app/layout.tsx`

- [ ] **Scaffold Next.js project**

```bash
cd /Users/hugoricarrere/Documents/Projet_Perso/Palantir
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

Answer prompts: TypeScript=yes, ESLint=yes, Tailwind=yes, `src/`=no, App Router=yes, alias=yes (`@/*`)

- [ ] **Install dependencies**

```bash
npm install @deck.gl/react@^9 @deck.gl/layers@^9 @deck.gl/aggregation-layers@^9 @deck.gl/core@^9 react-map-gl@^7 mapbox-gl@^3
npm install -D vitest @vitest/ui
```

- [ ] **Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Create .env.local from example**

Create `.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
WINDY_API_KEY=your_windy_key_here
STORMGLASS_API_KEY=your_stormglass_key_here
```

- [ ] **Update app/globals.css**

```css
@import 'mapbox-gl/dist/mapbox-gl.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; background: #070B14; }
```

- [ ] **Update app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = { title: 'SENTINEL', description: 'Intelligence Platform' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${mono.variable} font-mono`}>{children}</body>
    </html>
  )
}
```

- [ ] **Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2 — `lib/cache.ts` avec TDD

**Files:** Create `lib/cache.ts`, `lib/cache.test.ts`

- [ ] **Write failing tests**

Create `lib/cache.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCache } from './cache'

describe('createCache', () => {
  beforeEach(() => { vi.useFakeTimers() })

  it('returns data on first fetch', async () => {
    const cache = createCache()
    const fetcher = vi.fn().mockResolvedValue({ count: 1 })
    const result = await cache.get('key', fetcher, 1000)
    expect(result.data).toEqual({ count: 1 })
    expect(result.stale).toBe(false)
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('returns cached data within TTL without re-fetching', async () => {
    const cache = createCache()
    const fetcher = vi.fn().mockResolvedValue({ count: 1 })
    await cache.get('key', fetcher, 5000)
    vi.advanceTimersByTime(3000)
    const result = await cache.get('key', fetcher, 5000)
    expect(fetcher).toHaveBeenCalledOnce()
    expect(result.stale).toBe(false)
  })

  it('re-fetches after TTL expires', async () => {
    const cache = createCache()
    const fetcher = vi.fn().mockResolvedValue({ count: 1 })
    await cache.get('key', fetcher, 1000)
    vi.advanceTimersByTime(1500)
    await cache.get('key', fetcher, 1000)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('returns stale data when fetcher throws', async () => {
    const cache = createCache()
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(new Error('network error'))
    await cache.get('key', fetcher, 1000)
    vi.advanceTimersByTime(1500)
    const result = await cache.get('key', fetcher, 1000)
    expect(result.data).toEqual({ count: 1 })
    expect(result.stale).toBe(true)
  })

  it('throws on first fetch failure with no cached data', async () => {
    const cache = createCache()
    const fetcher = vi.fn().mockRejectedValue(new Error('network error'))
    await expect(cache.get('key', fetcher, 1000)).rejects.toThrow('network error')
  })
})
```

- [ ] **Run tests — expect FAIL**

```bash
npx vitest run lib/cache.test.ts
```

Expected: FAIL — `lib/cache.ts` not found

- [ ] **Implement `lib/cache.ts`**

```ts
interface CacheEntry<T> {
  data: T
  fetchedAt: number
  stale: boolean
}

export interface CacheResult<T> {
  data: T
  stale: boolean
}

export function createCache() {
  const store = new Map<string, CacheEntry<unknown>>()

  async function get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
  ): Promise<CacheResult<T>> {
    const entry = store.get(key) as CacheEntry<T> | undefined
    const now = Date.now()

    if (entry && now - entry.fetchedAt < ttlMs) {
      return { data: entry.data, stale: false }
    }

    try {
      const data = await fetcher()
      store.set(key, { data, fetchedAt: now, stale: false })
      return { data, stale: false }
    } catch (err) {
      if (entry) {
        return { data: entry.data, stale: true }
      }
      throw err
    }
  }

  return { get }
}

export const globalCache = createCache()
```

- [ ] **Run tests — expect PASS**

```bash
npx vitest run lib/cache.test.ts
```

Expected: 5 tests PASS

- [ ] **Commit**

```bash
git add lib/cache.ts lib/cache.test.ts
git commit -m "feat: add in-memory cache with TTL and stale fallback"
```

---

## Task 3 — `lib/weather.ts` avec TDD

**Files:** Create `lib/weather.ts`, `lib/weather.test.ts`

- [ ] **Write failing tests**

Create `lib/weather.test.ts`:
```ts
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
```

- [ ] **Run — expect FAIL**

```bash
npx vitest run lib/weather.test.ts
```

- [ ] **Implement `lib/weather.ts`**

```ts
export type ConditionStatus = 'green' | 'yellow' | 'red'

export function skydiveCondition(
  windKmhSurface: number,
  windKmh3000m: number,
  visibilityKm: number,
  precipitation: boolean,
): ConditionStatus {
  if (precipitation || visibilityKm < 3 || windKmhSurface > 35 || windKmh3000m > 80) return 'red'
  if (visibilityKm < 5 || windKmhSurface > 25 || windKmh3000m > 60) return 'yellow'
  return 'green'
}

export function paraglideCondition(
  windKmh: number,
  gustKmh: number,
  tempC: number,
  solarRadiationWm2: number,
  stormForecast: boolean,
): ConditionStatus {
  if (stormForecast || windKmh > 45 || gustKmh > 30) return 'red'
  if (windKmh > 30) return 'yellow'
  if (windKmh < 10) return 'yellow'
  return 'green'
}

export function basejumpCondition(
  windKmh: number,
  gustKmh: number,
  visibilityKm: number,
  precipitation: boolean,
  ceilingM: number,
): ConditionStatus {
  if (precipitation || windKmh > 20 || gustKmh > 15 || visibilityKm < 3 || ceilingM < 600) return 'red'
  if (windKmh > 15 || visibilityKm < 5) return 'yellow'
  return 'green'
}

export function surfScore(
  swellHeightM: number,
  swellPeriodS: number,
  windKmh: number,
  windOffshore: boolean,
): number {
  let score = 5
  // Swell height: ideal 1.5-2.5m
  if (swellHeightM >= 1.5 && swellHeightM <= 2.5) score += 2
  else if (swellHeightM >= 0.8 && swellHeightM < 1.5) score += 0.5
  else if (swellHeightM < 0.5 || swellHeightM > 4) score -= 2
  // Period: ideal > 12s
  if (swellPeriodS >= 12) score += 2
  else if (swellPeriodS >= 8) score += 0.5
  else score -= 1
  // Wind
  if (windOffshore && windKmh < 15) score += 1
  else if (!windOffshore || windKmh > 25) score -= 2
  return Math.max(1, Math.min(10, Math.round(score)))
}
```

- [ ] **Run — expect PASS**

```bash
npx vitest run lib/weather.test.ts
```

Expected: all tests PASS

- [ ] **Commit**

```bash
git add lib/weather.ts lib/weather.test.ts
git commit -m "feat: add weather condition calculators with tests"
```

---

## Task 4 — Types + static datasets

**Files:** Create `lib/types.ts`, `lib/color.ts`, `data/*.json`

- [ ] **Create `lib/types.ts`**

```ts
export interface GeoPoint {
  id: string
  longitude: number
  latitude: number
  layerId: string
  data: Record<string, unknown>
}

export interface LayerDataState {
  points: GeoPoint[]
  stale: boolean
  lastUpdated: number | null
  error: string | null
}
```

- [ ] **Create `lib/color.ts`**

```ts
export function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}
```

- [ ] **Create `data/surf-spots.json`**

```json
[
  { "id": "hossegor", "name": "Hossegor", "longitude": -1.79, "latitude": 43.66, "country": "France", "level": "advanced", "breakType": "beach" },
  { "id": "lacanau", "name": "Lacanau Ocean", "longitude": -1.20, "latitude": 44.99, "country": "France", "level": "all", "breakType": "beach" },
  { "id": "biarritz", "name": "Biarritz Grande Plage", "longitude": -1.56, "latitude": 43.49, "country": "France", "level": "beginner", "breakType": "beach" },
  { "id": "mundaka", "name": "Mundaka", "longitude": -2.69, "latitude": 43.40, "country": "Spain", "level": "expert", "breakType": "river mouth" },
  { "id": "nazare", "name": "Nazaré", "longitude": -8.92, "latitude": 39.60, "country": "Portugal", "level": "expert", "breakType": "beach" },
  { "id": "pipeline", "name": "Pipeline", "longitude": -158.05, "latitude": 21.66, "country": "USA", "level": "expert", "breakType": "reef" },
  { "id": "uluwatu", "name": "Uluwatu", "longitude": 115.09, "latitude": -8.82, "country": "Indonesia", "level": "advanced", "breakType": "reef" }
]
```

- [ ] **Create `data/skydive-dz.json`**

```json
[
  { "id": "dz-perris", "name": "Skydive Paris - Perris", "longitude": 2.72, "latitude": 48.83, "icao": "LFPT", "altitudeM": 76, "radio": "122.5", "phone": "+33 1 34 66 00 00", "website": "https://skydiveparis.com", "aircraft": ["PC-6", "Caravan"], "maxAltitudeM": 4200 },
  { "id": "dz-empuriabrava", "name": "Skydive Empuriabrava", "longitude": 3.12, "latitude": 42.26, "icao": "LEEP", "altitudeM": 17, "radio": "118.45", "phone": "+34 972 45 01 11", "website": "https://skydiveempuriabrava.com", "aircraft": ["CASA 212", "Caravan"], "maxAltitudeM": 4200 },
  { "id": "dz-saintjean", "name": "Parachutisme Sarlat", "longitude": 1.22, "latitude": 44.89, "icao": "LFDS", "altitudeM": 174, "radio": "123.5", "phone": "+33 5 53 59 00 00", "website": "https://parachutisme-sarlat.fr", "aircraft": ["Cessna 182"], "maxAltitudeM": 3000 },
  { "id": "dz-hinton", "name": "UK Parachuting Hinton", "longitude": -1.29, "latitude": 51.98, "icao": "EGBH", "altitudeM": 71, "radio": "130.1", "phone": "+44 1295 750555", "website": "https://ukparachuting.co.uk", "aircraft": ["BN2 Islander"], "maxAltitudeM": 4270 }
]
```

- [ ] **Create `data/paragliding-spots.json`**

```json
[
  { "id": "pg-planfait", "name": "Planfait - Doussard", "longitude": 6.19, "latitude": 45.77, "country": "France", "type": "takeoff", "level": "intermediate", "windDirections": ["N","NE","E"], "altitudeM": 1200 },
  { "id": "pg-sthilaire", "name": "Saint-Hilaire du Touvet", "longitude": 5.91, "latitude": 45.33, "country": "France", "type": "takeoff", "level": "advanced", "windDirections": ["W","NW"], "altitudeM": 1350 },
  { "id": "pg-chamonix", "name": "Chamonix Plan Praz", "longitude": 6.87, "latitude": 45.92, "country": "France", "type": "takeoff", "level": "advanced", "windDirections": ["SW","W"], "altitudeM": 2000 },
  { "id": "pg-oludeniz", "name": "Ölüdeniz Babadag", "longitude": 29.12, "latitude": 36.55, "country": "Turkey", "type": "takeoff", "level": "all", "windDirections": ["N","NW"], "altitudeM": 1975 },
  { "id": "pg-interlaken", "name": "Interlaken Beatenberg", "longitude": 7.87, "latitude": 46.71, "country": "Switzerland", "type": "takeoff", "level": "intermediate", "windDirections": ["W","NW","N"], "altitudeM": 1312 }
]
```

- [ ] **Create `data/basejump-exits.json`**

```json
[
  { "id": "bj-brento", "name": "Monte Brento", "longitude": 10.77, "latitude": 45.82, "country": "Italy", "type": "cliff", "heightM": 1300, "openingAltitudeM": 500, "difficulty": "advanced", "legal": "authorized" },
  { "id": "bj-eiger", "name": "Eiger Nordwand", "longitude": 7.99, "latitude": 46.58, "country": "Switzerland", "type": "cliff", "heightM": 1800, "openingAltitudeM": 600, "difficulty": "expert", "legal": "tolerated" },
  { "id": "bj-kjerag", "name": "Kjerag", "longitude": 6.57, "latitude": 59.03, "country": "Norway", "type": "cliff", "heightM": 1000, "openingAltitudeM": 400, "difficulty": "advanced", "legal": "authorized" },
  { "id": "bj-proctor", "name": "Proctor Valley Bridge", "longitude": -116.96, "latitude": 32.85, "country": "USA", "type": "bridge", "heightM": 120, "openingAltitudeM": 60, "difficulty": "intermediate", "legal": "authorized" }
]
```

- [ ] **Commit**

```bash
git add lib/types.ts lib/color.ts data/
git commit -m "feat: add shared types, color utils, and static sport datasets"
```

---

## Task 5 — Layer registry

**Files:** Create `lib/layers-registry.ts`

- [ ] **Create `lib/layers-registry.ts`**

```ts
import type { LayersList } from '@deck.gl/core'
import type { ReactNode } from 'react'
import type { GeoPoint } from './types'

export interface LayerConfig {
  id: string
  label: string
  icon: string
  color: string
  colorRgb: [number, number, number]
  apiRoute: string
  pollIntervalMs: number
  defaultEnabled: boolean
  getDeckLayer: (points: GeoPoint[], onClick: (point: GeoPoint) => void) => LayersList[number] | null
  renderContextPanel: (point: GeoPoint) => ReactNode
  transformResponse: (raw: unknown) => GeoPoint[]
}

// Registry populated in Task 9+. Exported as mutable array so layers can be imported and pushed.
export const LAYERS: LayerConfig[] = []
```

- [ ] **Commit**

```bash
git add lib/layers-registry.ts
git commit -m "feat: add layer registry interface"
```

---

## Task 6 — Map foundation

**Files:** Create `app/page.tsx`, `components/MapCanvas.tsx`, `lib/use-layer-data.ts`

- [ ] **Create `lib/use-layer-data.ts`**

```ts
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { GeoPoint, LayerDataState } from './types'
import type { LayerConfig } from './layers-registry'

export type LayerStates = Record<string, LayerDataState>

export function useLayerData(layers: LayerConfig[], enabledMap: Record<string, boolean>) {
  const [states, setStates] = useState<LayerStates>(() =>
    Object.fromEntries(layers.map(l => [l.id, { points: [], stale: false, lastUpdated: null, error: null }]))
  )

  const fetchLayer = useCallback(async (layer: LayerConfig) => {
    try {
      const res = await fetch(layer.apiRoute)
      const json = await res.json()
      const stale = json.stale ?? false
      const points: GeoPoint[] = layer.transformResponse(json.data ?? json)
      setStates(prev => ({
        ...prev,
        [layer.id]: { points, stale, lastUpdated: Date.now(), error: null },
      }))
    } catch {
      setStates(prev => ({
        ...prev,
        [layer.id]: { ...prev[layer.id], error: 'Données indisponibles', stale: true },
      }))
    }
  }, [])

  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = []
    for (const layer of layers) {
      if (!enabledMap[layer.id]) continue
      fetchLayer(layer)
      const id = setInterval(() => fetchLayer(layer), layer.pollIntervalMs)
      intervals.push(id)
    }
    return () => intervals.forEach(clearInterval)
  }, [layers, enabledMap, fetchLayer])

  return states
}
```

- [ ] **Create `components/MapCanvas.tsx`**

```tsx
'use client'
import DeckGL from '@deck.gl/react'
import Map from 'react-map-gl'
import { useState, useMemo } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import { useLayerData } from '@/lib/use-layer-data'
import type { GeoPoint } from '@/lib/types'

interface Props {
  enabledMap: Record<string, boolean>
  onPointClick: (point: GeoPoint | null) => void
  onViewStateChange: (vs: { longitude: number; latitude: number; zoom: number }) => void
}

const INITIAL_VIEW = { longitude: 2.3, latitude: 20, zoom: 2, pitch: 0, bearing: 0 }

export default function MapCanvas({ enabledMap, onPointClick, onViewStateChange }: Props) {
  const [viewState, setViewState] = useState(INITIAL_VIEW)
  const layerStates = useLayerData(LAYERS, enabledMap)

  const deckLayers = useMemo(() =>
    LAYERS
      .filter(l => enabledMap[l.id])
      .map(l => l.getDeckLayer(layerStates[l.id]?.points ?? [], onPointClick))
      .filter(Boolean),
    [enabledMap, layerStates, onPointClick]
  )

  return (
    <DeckGL
      viewState={viewState}
      controller={true}
      layers={deckLayers}
      onViewStateChange={({ viewState: vs }: { viewState: typeof INITIAL_VIEW }) => {
        setViewState(vs)
        onViewStateChange(vs)
      }}
      onClick={({ object }) => { if (!object) onPointClick(null) }}
    >
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      />
    </DeckGL>
  )
}
```

- [ ] **Create `app/page.tsx`**

```tsx
'use client'
import dynamic from 'next/dynamic'
import { useState, useMemo } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import type { GeoPoint } from '@/lib/types'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false })

export default function Home() {
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(LAYERS.map(l => [l.id, l.defaultEnabled]))
  )
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null)
  const [viewState, setViewState] = useState({ longitude: 2.3, latitude: 20, zoom: 2 })

  const isFranceView = viewState.zoom >= 5 &&
    viewState.longitude > -5 && viewState.longitude < 10 &&
    viewState.latitude > 41 && viewState.latitude < 52

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#070B14] font-mono">
      <MapCanvas
        enabledMap={enabledMap}
        onPointClick={setSelectedPoint}
        onViewStateChange={setViewState}
      />
    </main>
  )
}
```

- [ ] **Run dev server — verify map loads**

```bash
npm run dev
```

Open http://localhost:3000 — expect a full-screen dark Mapbox map with no errors.

- [ ] **Commit**

```bash
git add app/page.tsx components/MapCanvas.tsx lib/use-layer-data.ts
git commit -m "feat: add map foundation with Deck.gl and polling hook"
```

---

## Task 7 — UI shell (TopBar, StatusBar, LayerToggle)

**Files:** Create `components/TopBar.tsx`, `components/StatusBar.tsx`, `components/LayerToggle.tsx`

- [ ] **Create `components/TopBar.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'

interface Props { layerStates: LayerStates }

export default function TopBar({ layerStates }: Props) {
  const [utc, setUtc] = useState('')
  useEffect(() => {
    const tick = () => setUtc(new Date().toUTCString().slice(17, 25) + ' UTC')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const activeLayers = LAYERS.filter(l => (layerStates[l.id]?.points.length ?? 0) > 0)

  return (
    <header className="absolute top-0 left-0 right-0 z-10 flex items-center gap-4 px-4 h-10 bg-[#07111f]/95 border-b border-[#1a2840]">
      <span className="text-[#00D4FF] tracking-[0.2em] text-xs font-bold">SENTINEL</span>
      <span className="w-2 h-2 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF] animate-pulse" />
      <div className="flex gap-4 ml-2">
        {activeLayers.map(l => (
          <span key={l.id} className="text-[10px] tracking-wider" style={{ color: l.color }}>
            {l.icon} {layerStates[l.id]?.points.length.toLocaleString()}
          </span>
        ))}
      </div>
      <span className="ml-auto text-[10px] text-[#4a6fa5] tracking-wider">{utc}</span>
    </header>
  )
}
```

- [ ] **Create `components/StatusBar.tsx`**

```tsx
'use client'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'

interface Props {
  layerStates: LayerStates
  viewState: { longitude: number; latitude: number; zoom: number }
}

export default function StatusBar({ layerStates, viewState }: Props) {
  const connected = LAYERS.filter(l => layerStates[l.id]?.lastUpdated !== null).length
  const staleCount = LAYERS.filter(l => layerStates[l.id]?.stale).length

  return (
    <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-6 px-4 h-7 bg-[#07111f]/90 border-t border-[#1a2840] text-[10px] text-[#2a4a6a] tracking-wider">
      <span className="text-[#00ff88]">● LIVE</span>
      <span>{connected}/{LAYERS.length} SOURCES</span>
      {staleCount > 0 && <span className="text-[#FFB347]">⚠ {staleCount} STALE</span>}
      <span className="ml-auto">
        LAT {viewState.latitude.toFixed(2)} LON {viewState.longitude.toFixed(2)} ZOOM {viewState.zoom.toFixed(1)}
      </span>
    </footer>
  )
}
```

- [ ] **Create `components/LayerToggle.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import type { LayerStates } from '@/lib/use-layer-data'

interface Props {
  enabledMap: Record<string, boolean>
  onToggle: (id: string, enabled: boolean) => void
  layerStates: LayerStates
}

export default function LayerToggle({ enabledMap, onToggle, layerStates }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`absolute top-12 left-0 z-10 bg-[#0B1120]/95 border-r border-[#1a2840] transition-all ${collapsed ? 'w-10' : 'w-44'}`}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full h-8 flex items-center justify-center text-[#4a6fa5] hover:text-[#00D4FF] border-b border-[#1a2840] text-xs"
      >
        {collapsed ? '›' : '‹ LAYERS'}
      </button>
      {LAYERS.map(l => {
        const count = layerStates[l.id]?.points.length ?? 0
        const enabled = enabledMap[l.id]
        return (
          <button
            key={l.id}
            onClick={() => onToggle(l.id, !enabled)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-[10px] tracking-wider border-b border-[#1a2840]/50 hover:bg-[#1a2840]/30 transition-colors ${enabled ? 'opacity-100' : 'opacity-40'}`}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: enabled ? l.color : '#2a4a6a' }} />
            {collapsed ? null : (
              <>
                <span className="flex-1 text-left" style={{ color: enabled ? l.color : '#4a6fa5' }}>{l.label}</span>
                {count > 0 && <span className="text-[#4a6fa5]">{count > 999 ? `${(count / 1000).toFixed(1)}k` : count}</span>}
              </>
            )}
          </button>
        )
      })}
    </aside>
  )
}
```

- [ ] **Wire TopBar, StatusBar, LayerToggle into `app/page.tsx`**

Replace `app/page.tsx` content:
```tsx
'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { LAYERS } from '@/lib/layers-registry'
import { useLayerData } from '@/lib/use-layer-data'
import TopBar from '@/components/TopBar'
import StatusBar from '@/components/StatusBar'
import LayerToggle from '@/components/LayerToggle'
import ContextPanel from '@/components/ContextPanel'
import type { GeoPoint } from '@/lib/types'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false })

export default function Home() {
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(LAYERS.map(l => [l.id, l.defaultEnabled]))
  )
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null)
  const [viewState, setViewState] = useState({ longitude: 2.3, latitude: 20, zoom: 2 })
  const layerStates = useLayerData(LAYERS, enabledMap)

  const isFranceView = viewState.zoom >= 5 &&
    viewState.longitude > -5 && viewState.longitude < 10 &&
    viewState.latitude > 41 && viewState.latitude < 52

  function handleToggle(id: string, enabled: boolean) {
    setEnabledMap(prev => ({ ...prev, [id]: enabled }))
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#070B14] font-mono">
      <TopBar layerStates={layerStates} />
      <MapCanvas
        enabledMap={enabledMap}
        onPointClick={setSelectedPoint}
        onViewStateChange={setViewState}
      />
      <LayerToggle enabledMap={enabledMap} onToggle={handleToggle} layerStates={layerStates} />
      {selectedPoint && <ContextPanel point={selectedPoint} onClose={() => setSelectedPoint(null)} />}
      <StatusBar layerStates={layerStates} viewState={viewState} />
    </main>
  )
}
```

Note: `ContextPanel` is created in Task 8. This will cause a TS error until then — that's fine.

- [ ] **Commit**

```bash
git add components/TopBar.tsx components/StatusBar.tsx components/LayerToggle.tsx app/page.tsx
git commit -m "feat: add TopBar, StatusBar, LayerToggle UI shell"
```

---

## Task 8 — ContextPanel + API template

**Files:** Create `components/ContextPanel.tsx`, `app/api/_template/route.ts`

- [ ] **Create `components/ContextPanel.tsx`**

```tsx
'use client'
import { LAYERS } from '@/lib/layers-registry'
import type { GeoPoint } from '@/lib/types'

interface Props { point: GeoPoint; onClose: () => void }

export default function ContextPanel({ point, onClose }: Props) {
  const layer = LAYERS.find(l => l.id === point.layerId)

  return (
    <aside className="absolute top-12 right-0 bottom-7 z-10 w-72 bg-[#0B1120]/97 border-l border-[#1a2840] overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2840] bg-[#0d1628]">
        <span className="text-[10px] tracking-[0.15em] uppercase" style={{ color: layer?.color ?? '#00D4FF' }}>
          {layer?.icon} {layer?.label}
        </span>
        <button onClick={onClose} className="text-[#4a6fa5] hover:text-[#00D4FF] text-lg leading-none">×</button>
      </div>
      <div className="p-3 text-xs text-[#7a9ac0]">
        {layer ? layer.renderContextPanel(point) : <span>Données non disponibles</span>}
      </div>
    </aside>
  )
}
```

- [ ] **Create `app/api/_template/route.ts`**

```ts
// TEMPLATE — Copy this file to app/api/<name>/route.ts
// Replace EXTERNAL_URL, TTL_MS, and the transform function.
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

const TTL_MS = 30_000 // adjust per source

async function fetchData() {
  const EXTERNAL_URL = 'https://example.com/api/data'
  const res = await fetch(EXTERNAL_URL, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = await res.json()
  // Transform raw → clean domain shape here
  return raw
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('template', fetchData, TTL_MS)
    return NextResponse.json({ data, stale })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
```

- [ ] **Commit**

```bash
git add components/ContextPanel.tsx app/api/_template/route.ts
git commit -m "feat: add ContextPanel dispatcher and API route template"
```

---

## Task 9 — Flights layer (pattern complet)

**Files:** Create `app/api/flights/route.ts`, `components/panels/FlightPanel.tsx`, add entry to `lib/layers-registry.ts`

- [ ] **Create `app/api/flights/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

interface FlightPoint {
  id: string; callsign: string; origin: string
  longitude: number; latitude: number
  altitudeM: number; velocityMs: number; headingDeg: number; onGround: boolean
}

type OpenSkyState = [string, string, string, number|null, number, number|null, number|null, number|null, boolean, number|null, number|null, ...unknown[]]

async function fetchFlights(): Promise<FlightPoint[]> {
  const res = await fetch('https://opensky-network.org/api/states/all', { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`)
  const raw: { states: OpenSkyState[] | null } = await res.json()
  if (!raw.states) return []
  return raw.states
    .filter(s => s[5] != null && s[6] != null && !s[8])
    .map(s => ({
      id: s[0],
      callsign: s[1]?.trim() ?? s[0],
      origin: s[2],
      longitude: s[5]!,
      latitude: s[6]!,
      altitudeM: s[7] ?? 0,
      velocityMs: s[9] ?? 0,
      headingDeg: s[10] ?? 0,
      onGround: s[8],
    }))
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('flights', fetchFlights, 30_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
```

- [ ] **Test API route manually**

```bash
npm run dev
# in another terminal:
curl http://localhost:3000/api/flights | head -c 500
```

Expected: JSON with `{ data: [...], stale: false }`

- [ ] **Create `components/panels/FlightPanel.tsx`**

```tsx
import type { GeoPoint } from '@/lib/types'

interface FlightData {
  callsign: string; origin: string
  altitudeM: number; velocityMs: number; headingDeg: number
}

export default function FlightPanel({ point }: { point: GeoPoint }) {
  const d = point.data as FlightData
  return (
    <div className="space-y-2">
      <p className="text-[#00D4FF] text-sm font-bold">{d.callsign || point.id.toUpperCase()}</p>
      <Row label="ICAO24" value={point.id} />
      <Row label="ORIGINE" value={d.origin} />
      <Row label="ALTITUDE" value={`${Math.round(d.altitudeM)} m`} />
      <Row label="VITESSE" value={`${Math.round(d.velocityMs * 3.6)} km/h`} />
      <Row label="CAP" value={`${Math.round(d.headingDeg)}°`} />
      <a
        href={`https://www.flightaware.com/live/flight/${d.callsign}`}
        target="_blank" rel="noopener"
        className="block mt-3 text-center text-[10px] tracking-wider text-[#4a6fa5] border border-[#1a2840] py-1 hover:border-[#00D4FF] hover:text-[#00D4FF] transition-colors"
      >
        FLIGHTAWARE →
      </a>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
    </div>
  )
}
```

- [ ] **Add flights layer to `lib/layers-registry.ts`**

Replace entire `lib/layers-registry.ts`:
```ts
import { ScatterplotLayer } from '@deck.gl/layers'
import type { LayersList } from '@deck.gl/core'
import type { ReactNode } from 'react'
import type { GeoPoint } from './types'
import { hexToRgb } from './color'
import FlightPanel from '@/components/panels/FlightPanel'

export interface LayerConfig {
  id: string
  label: string
  icon: string
  color: string
  colorRgb: [number, number, number]
  apiRoute: string
  pollIntervalMs: number
  defaultEnabled: boolean
  getDeckLayer: (points: GeoPoint[], onClick: (point: GeoPoint) => void) => LayersList[number] | null
  renderContextPanel: (point: GeoPoint) => ReactNode
  transformResponse: (raw: unknown) => GeoPoint[]
}

export const LAYERS: LayerConfig[] = [
  {
    id: 'flights',
    label: 'Vols',
    icon: '✈',
    color: '#00D4FF',
    colorRgb: hexToRgb('#00D4FF'),
    apiRoute: '/api/flights',
    pollIntervalMs: 30_000,
    defaultEnabled: true,
    transformResponse: (raw) => {
      const items = (raw as { id: string; longitude: number; latitude: number; callsign: string; origin: string; altitudeM: number; velocityMs: number; headingDeg: number }[])
      return items.map(f => ({
        id: f.id,
        longitude: f.longitude,
        latitude: f.latitude,
        layerId: 'flights',
        data: { callsign: f.callsign, origin: f.origin, altitudeM: f.altitudeM, velocityMs: f.velocityMs, headingDeg: f.headingDeg },
      }))
    },
    getDeckLayer: (points, onClick) =>
      new ScatterplotLayer({
        id: 'flights-layer',
        data: points,
        getPosition: (d: GeoPoint) => [d.longitude, d.latitude],
        getColor: hexToRgb('#00D4FF'),
        getRadius: 4000,
        radiusMinPixels: 2,
        radiusMaxPixels: 6,
        pickable: true,
        onClick: ({ object }) => object && onClick(object as GeoPoint),
      }),
    renderContextPanel: (point) => <FlightPanel point={point} />,
  },
]
```

- [ ] **Verify flights layer appears on map**

Open http://localhost:3000 — expect blue dots for flights worldwide. Click one → FlightPanel opens on the right.

- [ ] **Commit**

```bash
git add app/api/flights/ components/panels/FlightPanel.tsx lib/layers-registry.ts
git commit -m "feat: add flights layer (OpenSky Network)"
```

---

## Task 10 — Ships layer

**Files:** `app/api/ships/route.ts`, `components/panels/ShipPanel.tsx`, update `lib/layers-registry.ts`

- [ ] **Create `app/api/ships/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

// VT Explorer free public endpoint — no auth required
// Returns vessels in bounding box (world)
interface VesselRaw {
  mmsi: string; name: string; flag: string; type: string
  lat: number; lng: number; speed: number; course: number
  destination?: string; eta?: string
}

async function fetchShips() {
  // AISStream.io v2 public snapshot — free, no key for basic vessel list
  const res = await fetch(
    'https://api.vtexplorer.com/vessels?userkey=demo&format=json&sat=1',
    { next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`Ships HTTP ${res.status}`)
  const raw: VesselRaw[] = await res.json()
  return raw.filter(v => v.lat && v.lng).map(v => ({
    id: v.mmsi,
    name: v.name || v.mmsi,
    flag: v.flag ?? '',
    type: v.type ?? 'cargo',
    longitude: v.lng,
    latitude: v.lat,
    speedKnots: v.speed ?? 0,
    courseDeg: v.course ?? 0,
    destination: v.destination ?? '',
    eta: v.eta ?? '',
  }))
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('ships', fetchShips, 60_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
```

- [ ] **Create `components/panels/ShipPanel.tsx`**

```tsx
import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
    </div>
  )
}

export default function ShipPanel({ point }: { point: GeoPoint }) {
  const d = point.data as { name: string; flag: string; type: string; speedKnots: number; courseDeg: number; destination: string; eta: string }
  return (
    <div className="space-y-2">
      <p className="text-[#00FF88] text-sm font-bold">{d.name}</p>
      <Row label="MMSI" value={point.id} />
      <Row label="PAVILLON" value={d.flag || '—'} />
      <Row label="TYPE" value={d.type} />
      <Row label="VITESSE" value={`${d.speedKnots.toFixed(1)} nœuds`} />
      <Row label="CAP" value={`${Math.round(d.courseDeg)}°`} />
      {d.destination && <Row label="DESTINATION" value={d.destination} />}
      {d.eta && <Row label="ETA" value={d.eta} />}
    </div>
  )
}
```

- [ ] **Add ships to `lib/layers-registry.ts`** — append to `LAYERS` array:

```ts
// Add at top of file:
import ShipPanel from '@/components/panels/ShipPanel'

// Add to LAYERS array:
{
  id: 'ships',
  label: 'Navires',
  icon: '🚢',
  color: '#00FF88',
  colorRgb: hexToRgb('#00FF88'),
  apiRoute: '/api/ships',
  pollIntervalMs: 60_000,
  defaultEnabled: true,
  transformResponse: (raw) => {
    const items = raw as { id: string; longitude: number; latitude: number; name: string; flag: string; type: string; speedKnots: number; courseDeg: number; destination: string; eta: string }[]
    return items.map(s => ({ id: s.id, longitude: s.longitude, latitude: s.latitude, layerId: 'ships', data: s }))
  },
  getDeckLayer: (points, onClick) =>
    new ScatterplotLayer({
      id: 'ships-layer',
      data: points,
      getPosition: (d: GeoPoint) => [d.longitude, d.latitude],
      getColor: hexToRgb('#00FF88'),
      getRadius: 5000,
      radiusMinPixels: 2,
      radiusMaxPixels: 7,
      pickable: true,
      onClick: ({ object }) => object && onClick(object as GeoPoint),
    }),
  renderContextPanel: (point) => <ShipPanel point={point} />,
},
```

- [ ] **Commit**

```bash
git add app/api/ships/ components/panels/ShipPanel.tsx lib/layers-registry.ts
git commit -m "feat: add ships layer (VT Explorer AIS)"
```

---

## Task 11 — Air quality layer

**Files:** `app/api/air/route.ts`, update `lib/layers-registry.ts`

- [ ] **Create `app/api/air/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

interface OpenAQResult {
  id: number; name: string
  coordinates: { latitude: number; longitude: number }
  lastValue: number; unit: string; parameter: string
}

async function fetchAir() {
  // Fetch PM2.5 stations worldwide, limit 500
  const res = await fetch(
    'https://api.openaq.org/v3/locations?parameters_id=2&limit=500&order_by=lastUpdated&sort_order=desc',
    { headers: { 'X-API-Key': '' }, next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`OpenAQ HTTP ${res.status}`)
  const json = await res.json()
  return (json.results ?? []).map((r: { id: number; name: string; coordinates: { latitude: number; longitude: number }; sensors?: { lastValue?: { value: number }; parameter?: { name: string } }[] }) => ({
    id: String(r.id),
    name: r.name,
    longitude: r.coordinates.longitude,
    latitude: r.coordinates.latitude,
    aqi: r.sensors?.[0]?.lastValue?.value ?? 0,
    parameter: r.sensors?.[0]?.parameter?.name ?? 'pm25',
  }))
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('air', fetchAir, 600_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
```

- [ ] **Add air layer to `lib/layers-registry.ts`**

Add import at top:
```ts
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
```

Add to LAYERS:
```ts
{
  id: 'air',
  label: 'Qualité air',
  icon: '💨',
  color: '#FF6B35',
  colorRgb: hexToRgb('#FF6B35'),
  apiRoute: '/api/air',
  pollIntervalMs: 600_000,
  defaultEnabled: false,
  transformResponse: (raw) => {
    const items = raw as { id: string; longitude: number; latitude: number; name: string; aqi: number; parameter: string }[]
    return items.filter(a => a.longitude && a.latitude).map(a => ({
      id: a.id, longitude: a.longitude, latitude: a.latitude, layerId: 'air',
      data: { name: a.name, aqi: a.aqi, parameter: a.parameter },
    }))
  },
  getDeckLayer: (points) =>
    new HeatmapLayer({
      id: 'air-layer',
      data: points,
      getPosition: (d: GeoPoint) => [d.longitude, d.latitude],
      getWeight: (d: GeoPoint) => (d.data as { aqi: number }).aqi,
      radiusPixels: 60,
      colorRange: [[255, 107, 53, 0], [255, 107, 53, 50], [255, 107, 53, 120], [255, 50, 0, 200]],
    }),
  renderContextPanel: (point) => {
    const d = point.data as { name: string; aqi: number; parameter: string }
    return (
      <div className="space-y-2">
        <p className="text-[#FF6B35] text-sm font-bold">{d.name}</p>
        <div className="flex justify-between text-[11px]"><span className="text-[#4a6fa5]">PARAMÈTRE</span><span className="text-[#a0c4d8]">{d.parameter.toUpperCase()}</span></div>
        <div className="flex justify-between text-[11px]"><span className="text-[#4a6fa5]">VALEUR</span><span className="text-[#a0c4d8]">{d.aqi} µg/m³</span></div>
      </div>
    )
  },
},
```

- [ ] **Commit**

```bash
git add app/api/air/ lib/layers-registry.ts
git commit -m "feat: add air quality heatmap layer (OpenAQ)"
```

---

## Task 11b — Weather overlay layer

**Files:** `app/api/weather/route.ts`, update `lib/layers-registry.ts`

- [ ] **Create `app/api/weather/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

// Fetch current weather for a grid of cities worldwide
const CITIES = [
  { id: 'paris', name: 'Paris', lat: 48.85, lon: 2.35 },
  { id: 'london', name: 'London', lat: 51.51, lon: -0.13 },
  { id: 'madrid', name: 'Madrid', lat: 40.42, lon: -3.7 },
  { id: 'berlin', name: 'Berlin', lat: 52.52, lon: 13.4 },
  { id: 'rome', name: 'Rome', lat: 41.9, lon: 12.5 },
  { id: 'new-york', name: 'New York', lat: 40.71, lon: -74.01 },
  { id: 'tokyo', name: 'Tokyo', lat: 35.69, lon: 139.69 },
  { id: 'sydney', name: 'Sydney', lat: -33.87, lon: 151.21 },
  { id: 'dubai', name: 'Dubai', lat: 25.2, lon: 55.27 },
  { id: 'sao-paulo', name: 'São Paulo', lat: -23.55, lon: -46.63 },
  { id: 'cape-town', name: 'Cape Town', lat: -33.93, lon: 18.42 },
  { id: 'mumbai', name: 'Mumbai', lat: 19.08, lon: 72.88 },
  { id: 'toronto', name: 'Toronto', lat: 43.65, lon: -79.38 },
  { id: 'moscow', name: 'Moscow', lat: 55.75, lon: 37.62 },
  { id: 'beijing', name: 'Beijing', lat: 39.9, lon: 116.4 },
]

async function fetchWeather() {
  const lats = CITIES.map(c => c.lat).join(',')
  const lons = CITIES.map(c => c.lon).join(',')
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,windspeed_10m,precipitation,weathercode&windspeed_unit=kmh&timezone=auto`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`Open-Meteo weather HTTP ${res.status}`)
  const json = await res.json()
  const results = Array.isArray(json) ? json : [json]
  return CITIES.map((city, i) => ({
    id: city.id,
    name: city.name,
    longitude: city.lon,
    latitude: city.lat,
    tempC: results[i]?.current?.temperature_2m ?? 0,
    windKmh: results[i]?.current?.windspeed_10m ?? 0,
    precipitation: results[i]?.current?.precipitation ?? 0,
    weatherCode: results[i]?.current?.weathercode ?? 0,
  }))
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('weather', fetchWeather, 600_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
```

- [ ] **Add weather layer to `lib/layers-registry.ts`**

Add to LAYERS:
```ts
{
  id: 'weather',
  label: 'Météo',
  icon: '🌦',
  color: '#B388FF',
  colorRgb: hexToRgb('#B388FF'),
  apiRoute: '/api/weather',
  pollIntervalMs: 600_000,
  defaultEnabled: false,
  transformResponse: (raw) => {
    const items = raw as { id: string; longitude: number; latitude: number; name: string; tempC: number; windKmh: number; precipitation: number; weatherCode: number }[]
    return items.map(w => ({ id: w.id, longitude: w.longitude, latitude: w.latitude, layerId: 'weather', data: w }))
  },
  getDeckLayer: (points, onClick) =>
    new ScatterplotLayer({
      id: 'weather-layer',
      data: points,
      getPosition: (d: GeoPoint) => [d.longitude, d.latitude],
      getColor: (d: GeoPoint) => {
        const t = (d.data as { tempC: number }).tempC
        if (t > 30) return [255, 100, 50]
        if (t > 20) return [255, 200, 100]
        if (t > 10) return [179, 136, 255]
        if (t > 0) return [100, 160, 255]
        return [200, 230, 255]
      },
      getRadius: 80_000,
      radiusMinPixels: 6,
      radiusMaxPixels: 18,
      opacity: 0.7,
      pickable: true,
      onClick: ({ object }) => object && onClick(object as GeoPoint),
    }),
  renderContextPanel: (point) => {
    const d = point.data as { name: string; tempC: number; windKmh: number; precipitation: number }
    return (
      <div className="space-y-2">
        <p className="text-[#B388FF] text-sm font-bold">{d.name}</p>
        <div className="flex justify-between text-[11px]"><span className="text-[#4a6fa5]">TEMPÉRATURE</span><span className="text-[#a0c4d8]">{Math.round(d.tempC)}°C</span></div>
        <div className="flex justify-between text-[11px]"><span className="text-[#4a6fa5]">VENT</span><span className="text-[#a0c4d8]">{Math.round(d.windKmh)} km/h</span></div>
        <div className="flex justify-between text-[11px]"><span className="text-[#4a6fa5]">PRÉCIP</span><span className="text-[#a0c4d8]">{d.precipitation} mm</span></div>
      </div>
    )
  },
},
```

- [ ] **Commit**

```bash
git add app/api/weather/ lib/layers-registry.ts
git commit -m "feat: add weather overlay layer (Open-Meteo)"
```

---

## Task 12 — Trains + BISON FUTÉ + FrancePanel

**Files:** `app/api/trains/route.ts`, `app/api/traffic/route.ts`, `components/FrancePanel.tsx`, update `lib/layers-registry.ts`

- [ ] **Create `app/api/trains/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

async function fetchTrains() {
  const res = await fetch(
    'https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/regularite-mensuelle-tgv-aqst/records?limit=20&order_by=date%20DESC',
    { next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`SNCF HTTP ${res.status}`)
  const json = await res.json()
  return json.results ?? []
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('trains', fetchTrains, 120_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
```

- [ ] **Create `app/api/traffic/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

async function fetchTraffic() {
  // BISON FUTÉ — niveau de trafic national (open data)
  const res = await fetch(
    'https://www.bison-fute.gouv.fr/api/weather/',
    { next: { revalidate: 0 } }
  )
  // If endpoint unavailable, return placeholder
  if (!res.ok) return { level: 'green', label: 'Trafic normal', source: 'bison-fute' }
  const json = await res.json()
  return json
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('traffic', fetchTraffic, 300_000)
    return NextResponse.json({ data, stale })
  } catch {
    return NextResponse.json({ data: { level: 'green', label: 'Données indisponibles' }, stale: true })
  }
}
```

- [ ] **Create `components/FrancePanel.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'

interface TrainsData { results: { taux_de_ponctualite?: number; axe?: string }[] }
interface TrafficData { level: string; label: string }

const TRAFFIC_COLOR: Record<string, string> = {
  green: '#00FF88', orange: '#FFB347', red: '#FF6B35', black: '#FF0080',
}

export default function FrancePanel() {
  const [trains, setTrains] = useState<TrainsData | null>(null)
  const [traffic, setTraffic] = useState<TrafficData | null>(null)

  useEffect(() => {
    fetch('/api/trains').then(r => r.json()).then(j => setTrains(j))
    fetch('/api/traffic').then(r => r.json()).then(j => setTraffic(j.data))
    const id = setInterval(() => {
      fetch('/api/trains').then(r => r.json()).then(j => setTrains(j))
    }, 120_000)
    return () => clearInterval(id)
  }, [])

  const avgPonct = trains?.results?.length
    ? Math.round(trains.results.reduce((s, r) => s + (r.taux_de_ponctualite ?? 0), 0) / trains.results.length)
    : null

  return (
    <aside className="absolute bottom-7 right-0 z-10 w-52 bg-[#0B1120]/95 border-l border-t border-[#1a2840]">
      <div className="px-3 py-1.5 bg-[#0d1628] border-b border-[#1a2840]">
        <span className="text-[10px] tracking-[0.15em] text-[#FFB347] uppercase">🇫🇷 France</span>
      </div>
      <div className="px-3 py-2 space-y-1.5 text-[11px]">
        {avgPonct !== null && (
          <div className="flex justify-between">
            <span className="text-[#4a6fa5]">TGV PONCTUALITÉ</span>
            <span style={{ color: avgPonct > 85 ? '#00FF88' : '#FFB347' }}>{avgPonct}%</span>
          </div>
        )}
        {traffic && (
          <div className="flex justify-between">
            <span className="text-[#4a6fa5]">TRAFIC AUTO</span>
            <span style={{ color: TRAFFIC_COLOR[traffic.level] ?? '#00FF88' }}>{traffic.label}</span>
          </div>
        )}
      </div>
    </aside>
  )
}
```

- [ ] **Wire FrancePanel into `app/page.tsx`**

Add import and render conditionally:
```tsx
import FrancePanel from '@/components/FrancePanel'

// inside JSX, before </main>:
{isFranceView && <FrancePanel />}
```

- [ ] **Commit**

```bash
git add app/api/trains/ app/api/traffic/ components/FrancePanel.tsx app/page.tsx
git commit -m "feat: add SNCF trains, BISON FUTÉ traffic, and FrancePanel"
```

---

## Task 13 — Webcams layer

**Files:** `app/api/webcams/route.ts`, `components/panels/WebcamPanel.tsx`, update `lib/layers-registry.ts`

- [ ] **Create `app/api/webcams/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'

async function fetchWebcams() {
  const key = process.env.WINDY_API_KEY
  if (!key) throw new Error('WINDY_API_KEY not set')
  const res = await fetch(
    'https://api.windy.com/webcams/api/v3/webcams?limit=200&offset=0&show=webcams:location,player',
    { headers: { 'x-windy-api-key': key }, next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`Windy HTTP ${res.status}`)
  const json = await res.json()
  return (json.webcams ?? []).map((w: { id: string; title: string; location: { longitude: number; latitude: number; city: string; country: string }; player: { live?: { url?: string }; day?: { url?: string } } }) => ({
    id: String(w.id),
    title: w.title,
    longitude: w.location.longitude,
    latitude: w.location.latitude,
    city: w.location.city,
    country: w.location.country,
    streamUrl: w.player?.live?.url ?? w.player?.day?.url ?? null,
  }))
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('webcams', fetchWebcams, 300_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
```

- [ ] **Create `components/panels/WebcamPanel.tsx`**

```tsx
import type { GeoPoint } from '@/lib/types'

export default function WebcamPanel({ point }: { point: GeoPoint }) {
  const d = point.data as { title: string; city: string; country: string; streamUrl: string | null }
  return (
    <div className="space-y-2">
      <p className="text-[#FFD700] text-sm font-bold">{d.title}</p>
      <p className="text-[#4a6fa5] text-[11px]">{d.city}, {d.country}</p>
      {d.streamUrl ? (
        <iframe
          src={d.streamUrl}
          className="w-full aspect-video border border-[#1a2840] rounded"
          allowFullScreen
        />
      ) : (
        <p className="text-[#4a6fa5] text-[11px]">Flux non disponible</p>
      )}
    </div>
  )
}
```

- [ ] **Add webcams layer to `lib/layers-registry.ts`**

Add import:
```ts
import { IconLayer } from '@deck.gl/layers'
import WebcamPanel from '@/components/panels/WebcamPanel'
```

Add to LAYERS:
```ts
{
  id: 'webcams',
  label: 'Webcams',
  icon: '📷',
  color: '#FFD700',
  colorRgb: hexToRgb('#FFD700'),
  apiRoute: '/api/webcams',
  pollIntervalMs: 300_000,
  defaultEnabled: false,
  transformResponse: (raw) => {
    const items = raw as { id: string; longitude: number; latitude: number; title: string; city: string; country: string; streamUrl: string | null }[]
    return items.map(w => ({ id: w.id, longitude: w.longitude, latitude: w.latitude, layerId: 'webcams', data: w }))
  },
  getDeckLayer: (points, onClick) =>
    new ScatterplotLayer({
      id: 'webcams-layer',
      data: points,
      getPosition: (d: GeoPoint) => [d.longitude, d.latitude],
      getColor: hexToRgb('#FFD700'),
      getRadius: 8000,
      radiusMinPixels: 3,
      radiusMaxPixels: 8,
      pickable: true,
      onClick: ({ object }) => object && onClick(object as GeoPoint),
    }),
  renderContextPanel: (point) => <WebcamPanel point={point} />,
},
```

- [ ] **Commit**

```bash
git add app/api/webcams/ components/panels/WebcamPanel.tsx lib/layers-registry.ts
git commit -m "feat: add webcams layer (Windy API)"
```

---

## Task 14 — Surf layer

**Files:** `app/api/surf/route.ts`, `components/panels/SurfPanel.tsx`, update `lib/layers-registry.ts`

- [ ] **Create `app/api/surf/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import surfSpots from '@/data/surf-spots.json'
import { surfScore } from '@/lib/weather'

interface SurfSpot { id: string; name: string; longitude: number; latitude: number; country: string; level: string; breakType: string }

async function fetchSurfConditions() {
  const spots = surfSpots as SurfSpot[]
  const key = process.env.STORMGLASS_API_KEY
  if (!key) {
    // Return spots without live conditions
    return spots.map(s => ({ ...s, score: 5, swellHeightM: 1.5, swellPeriodS: 10, windKmh: 15, windOffshore: true }))
  }

  const now = new Date()
  const end = new Date(now.getTime() + 3_600_000)

  const results = await Promise.allSettled(spots.map(async (spot) => {
    const url = `https://api.stormglass.io/v2/weather/point?lat=${spot.latitude}&lng=${spot.longitude}&params=waveHeight,wavePeriod,windSpeed&start=${now.toISOString()}&end=${end.toISOString()}`
    const res = await fetch(url, { headers: { Authorization: key }, next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`Stormglass ${res.status}`)
    const json = await res.json()
    const h = json.hours?.[0]
    const swellHeightM = h?.waveHeight?.noaa ?? 1.5
    const swellPeriodS = h?.wavePeriod?.noaa ?? 10
    const windKmh = (h?.windSpeed?.noaa ?? 5) * 3.6
    return { ...spot, swellHeightM, swellPeriodS, windKmh, windOffshore: windKmh < 20, score: surfScore(swellHeightM, swellPeriodS, windKmh, windKmh < 20) }
  }))

  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...spots[i], score: 5, swellHeightM: 0, swellPeriodS: 0, windKmh: 0, windOffshore: false }
  )
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('surf', fetchSurfConditions, 1_800_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
```

- [ ] **Create `components/panels/SurfPanel.tsx`**

```tsx
import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
    </div>
  )
}

const SCORE_COLOR = (s: number) => s >= 7 ? '#00FF88' : s >= 4 ? '#FFB347' : '#FF6B35'
const LEVEL_LABEL: Record<string, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé', expert: 'Expert', all: 'Tous niveaux' }

export default function SurfPanel({ point }: { point: GeoPoint }) {
  const d = point.data as { name: string; country: string; level: string; breakType: string; score: number; swellHeightM: number; swellPeriodS: number; windKmh: number; windOffshore: boolean }
  return (
    <div className="space-y-2">
      <p className="text-[#00CED1] text-sm font-bold">{d.name}</p>
      <p className="text-[#4a6fa5] text-[11px]">{d.country} · {d.breakType}</p>
      <div className="flex items-center gap-2 py-1">
        <span className="text-2xl font-bold" style={{ color: SCORE_COLOR(d.score) }}>{d.score}</span>
        <span className="text-[#4a6fa5] text-[10px]">/ 10</span>
      </div>
      <Row label="HOULE" value={`${d.swellHeightM.toFixed(1)} m · ${Math.round(d.swellPeriodS)}s`} />
      <Row label="VENT" value={`${Math.round(d.windKmh)} km/h ${d.windOffshore ? '(offshore ✓)' : '(onshore)'}`} />
      <Row label="NIVEAU" value={LEVEL_LABEL[d.level] ?? d.level} />
    </div>
  )
}
```

- [ ] **Add surf layer to `lib/layers-registry.ts`**

Add import:
```ts
import SurfPanel from '@/components/panels/SurfPanel'
```

Add to LAYERS:
```ts
{
  id: 'surf',
  label: 'Surf',
  icon: '🏄',
  color: '#00CED1',
  colorRgb: hexToRgb('#00CED1'),
  apiRoute: '/api/surf',
  pollIntervalMs: 1_800_000,
  defaultEnabled: true,
  transformResponse: (raw) => {
    const items = raw as { id: string; longitude: number; latitude: number; name: string; country: string; level: string; breakType: string; score: number; swellHeightM: number; swellPeriodS: number; windKmh: number; windOffshore: boolean }[]
    return items.map(s => ({ id: s.id, longitude: s.longitude, latitude: s.latitude, layerId: 'surf', data: s }))
  },
  getDeckLayer: (points, onClick) =>
    new ScatterplotLayer({
      id: 'surf-layer',
      data: points,
      getPosition: (d: GeoPoint) => [d.longitude, d.latitude],
      getColor: (d: GeoPoint) => {
        const score = (d.data as { score: number }).score
        if (score >= 7) return [0, 255, 136]
        if (score >= 4) return [255, 179, 71]
        return [255, 107, 53]
      },
      getRadius: 15_000,
      radiusMinPixels: 4,
      radiusMaxPixels: 12,
      pickable: true,
      onClick: ({ object }) => object && onClick(object as GeoPoint),
    }),
  renderContextPanel: (point) => <SurfPanel point={point} />,
},
```

- [ ] **Commit**

```bash
git add app/api/surf/ components/panels/SurfPanel.tsx lib/layers-registry.ts
git commit -m "feat: add surf layer with Stormglass conditions"
```

---

## Task 15 — Skydive layer

**Files:** `app/api/skydive/route.ts`, `components/panels/SkydivePanel.tsx`, update `lib/layers-registry.ts`

- [ ] **Create `app/api/skydive/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import dz from '@/data/skydive-dz.json'
import { skydiveCondition, type ConditionStatus } from '@/lib/weather'

interface DZ { id: string; name: string; longitude: number; latitude: number; icao: string; altitudeM: number; radio: string; phone: string; website: string; aircraft: string[]; maxAltitudeM: number }

async function fetchSkydive() {
  const dzList = dz as DZ[]
  const results = await Promise.allSettled(dzList.map(async (d) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${d.latitude}&longitude=${d.longitude}&hourly=windspeed_10m,windspeed_925hPa,visibility,precipitation&windspeed_unit=kmh&forecast_days=1&timezone=auto`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const json = await res.json()
    const h = json.hourly
    const idx = new Date().getHours()
    const windSurface = h.windspeed_10m?.[idx] ?? 0
    const wind3000 = h.windspeed_925hPa?.[idx] ?? 0
    const visibility = (h.visibility?.[idx] ?? 10000) / 1000
    const precipitation = (h.precipitation?.[idx] ?? 0) > 0
    const condition: ConditionStatus = skydiveCondition(windSurface, wind3000, visibility, precipitation)
    return { ...d, windSurface, wind3000, visibility, precipitation, condition }
  }))
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...dzList[i], windSurface: 0, wind3000: 0, visibility: 10, precipitation: false, condition: 'green' as ConditionStatus }
  )
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('skydive', fetchSkydive, 600_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
```

- [ ] **Create `components/panels/SkydivePanel.tsx`**

```tsx
import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
    </div>
  )
}

const COND = { green: { label: '🟢 Favorable', color: '#00FF88' }, yellow: { label: '🟡 Attention', color: '#FFB347' }, red: { label: '🔴 Fermé', color: '#FF6B35' } }

export default function SkydivePanel({ point }: { point: GeoPoint }) {
  const d = point.data as { name: string; icao: string; altitudeM: number; radio: string; phone: string; website: string; aircraft: string[]; maxAltitudeM: number; windSurface: number; wind3000: number; visibility: number; precipitation: boolean; condition: 'green' | 'yellow' | 'red' }
  const cond = COND[d.condition]
  return (
    <div className="space-y-2">
      <p className="text-[#FF4500] text-sm font-bold">{d.name}</p>
      <p className="text-[11px] font-bold" style={{ color: cond.color }}>{cond.label}</p>
      <Row label="OACI" value={d.icao} />
      <Row label="ALT TERRAIN" value={`${d.altitudeM} m`} />
      <Row label="ALT LARGAGE" value={`${d.maxAltitudeM} m`} />
      <Row label="VENT SOL" value={`${Math.round(d.windSurface)} km/h`} />
      <Row label="VENT 3000m" value={`${Math.round(d.wind3000)} km/h`} />
      <Row label="VISIBILITÉ" value={`${d.visibility.toFixed(1)} km`} />
      <Row label="PRÉCIP" value={d.precipitation ? 'Oui ⚠️' : 'Non'} />
      <Row label="FRÉQUENCE" value={d.radio} />
      <Row label="AVIONS" value={d.aircraft.join(', ')} />
      <a href={`tel:${d.phone}`} className="block text-[10px] text-[#4a6fa5] mt-1">{d.phone}</a>
      {d.website && (
        <a href={d.website} target="_blank" rel="noopener"
          className="block text-center text-[10px] tracking-wider text-[#4a6fa5] border border-[#1a2840] py-1 hover:border-[#FF4500] hover:text-[#FF4500] transition-colors">
          SITE WEB →
        </a>
      )}
    </div>
  )
}
```

- [ ] **Add skydive layer to `lib/layers-registry.ts`**

Add import:
```ts
import SkydivePanel from '@/components/panels/SkydivePanel'
```

Add to LAYERS:
```ts
{
  id: 'skydive',
  label: 'Parachutisme',
  icon: '🪂',
  color: '#FF4500',
  colorRgb: hexToRgb('#FF4500'),
  apiRoute: '/api/skydive',
  pollIntervalMs: 600_000,
  defaultEnabled: true,
  transformResponse: (raw) => {
    const items = raw as { id: string; longitude: number; latitude: number; [key: string]: unknown }[]
    return items.map(d => ({ id: d.id, longitude: d.longitude, latitude: d.latitude, layerId: 'skydive', data: d }))
  },
  getDeckLayer: (points, onClick) =>
    new ScatterplotLayer({
      id: 'skydive-layer',
      data: points,
      getPosition: (d: GeoPoint) => [d.longitude, d.latitude],
      getColor: (d: GeoPoint) => {
        const c = (d.data as { condition: string }).condition
        if (c === 'green') return [0, 255, 136]
        if (c === 'yellow') return [255, 179, 71]
        return [255, 69, 0]
      },
      getRadius: 20_000,
      radiusMinPixels: 5,
      radiusMaxPixels: 14,
      pickable: true,
      onClick: ({ object }) => object && onClick(object as GeoPoint),
    }),
  renderContextPanel: (point) => <SkydivePanel point={point} />,
},
```

- [ ] **Commit**

```bash
git add app/api/skydive/ components/panels/SkydivePanel.tsx lib/layers-registry.ts
git commit -m "feat: add skydive layer with Open-Meteo conditions"
```

---

## Task 16 — Paragliding layer

**Files:** `app/api/paragliding/route.ts`, `components/panels/ParaglidingPanel.tsx`, update `lib/layers-registry.ts`

- [ ] **Create `app/api/paragliding/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import spots from '@/data/paragliding-spots.json'
import { paraglideCondition, type ConditionStatus } from '@/lib/weather'

interface PGSpot { id: string; name: string; longitude: number; latitude: number; country: string; type: string; level: string; windDirections: string[]; altitudeM: number }

async function fetchParagliding() {
  const list = spots as PGSpot[]
  const results = await Promise.allSettled(list.map(async (s) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.latitude}&longitude=${s.longitude}&hourly=windspeed_10m,windgusts_10m,temperature_2m,shortwave_radiation&forecast_days=2&windspeed_unit=kmh&timezone=auto`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const json = await res.json()
    const h = json.hourly
    const idx = new Date().getHours()
    const windKmh = h.windspeed_10m?.[idx] ?? 0
    const gustKmh = h.windgusts_10m?.[idx] ?? 0
    const tempC = h.temperature_2m?.[idx] ?? 15
    const radiation = h.shortwave_radiation?.[idx] ?? 200
    const condition: ConditionStatus = paraglideCondition(windKmh, gustKmh, tempC, radiation, false)
    const forecast = Array.from({ length: 24 }, (_, i) => ({
      hour: i, wind: h.windspeed_10m?.[i] ?? 0, gust: h.windgusts_10m?.[i] ?? 0,
    }))
    return { ...s, windKmh, gustKmh, tempC, radiation, condition, forecast }
  }))
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...list[i], windKmh: 0, gustKmh: 0, tempC: 15, radiation: 0, condition: 'yellow' as ConditionStatus, forecast: [] }
  )
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('paragliding', fetchParagliding, 600_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
```

- [ ] **Create `components/panels/ParaglidingPanel.tsx`**

```tsx
import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
    </div>
  )
}

const COND = { green: { label: '🟢 Vol possible', color: '#00FF88' }, yellow: { label: '🟡 Conditions limites', color: '#FFB347' }, red: { label: '🔴 Vol déconseillé', color: '#FF6B35' } }

export default function ParaglidingPanel({ point }: { point: GeoPoint }) {
  const d = point.data as { name: string; country: string; type: string; level: string; altitudeM: number; windDirections: string[]; windKmh: number; gustKmh: number; tempC: number; condition: 'green' | 'yellow' | 'red' }
  const cond = COND[d.condition]
  return (
    <div className="space-y-2">
      <p className="text-[#9B59B6] text-sm font-bold">{d.name}</p>
      <p className="text-[11px] font-bold" style={{ color: cond.color }}>{cond.label}</p>
      <Row label="PAYS" value={d.country} />
      <Row label="TYPE" value={d.type} />
      <Row label="NIVEAU" value={d.level} />
      <Row label="ALTITUDE DÉCO" value={`${d.altitudeM} m`} />
      <Row label="VENT FAVORABLE" value={d.windDirections.join(', ')} />
      <Row label="VENT ACTUEL" value={`${Math.round(d.windKmh)} km/h`} />
      <Row label="RAFALES" value={`${Math.round(d.gustKmh)} km/h`} />
      <Row label="TEMP" value={`${Math.round(d.tempC)}°C`} />
    </div>
  )
}
```

- [ ] **Add paragliding to `lib/layers-registry.ts`**

```ts
import ParaglidingPanel from '@/components/panels/ParaglidingPanel'

// Add to LAYERS:
{
  id: 'paragliding',
  label: 'Parapente',
  icon: '🪂',
  color: '#9B59B6',
  colorRgb: hexToRgb('#9B59B6'),
  apiRoute: '/api/paragliding',
  pollIntervalMs: 600_000,
  defaultEnabled: true,
  transformResponse: (raw) => {
    const items = raw as { id: string; longitude: number; latitude: number; [key: string]: unknown }[]
    return items.map(d => ({ id: d.id, longitude: d.longitude, latitude: d.latitude, layerId: 'paragliding', data: d }))
  },
  getDeckLayer: (points, onClick) =>
    new ScatterplotLayer({
      id: 'paragliding-layer',
      data: points,
      getPosition: (d: GeoPoint) => [d.longitude, d.latitude],
      getColor: (d: GeoPoint) => {
        const c = (d.data as { condition: string }).condition
        if (c === 'green') return [155, 89, 182]
        if (c === 'yellow') return [255, 179, 71]
        return [255, 107, 53]
      },
      getRadius: 18_000,
      radiusMinPixels: 5,
      radiusMaxPixels: 12,
      pickable: true,
      onClick: ({ object }) => object && onClick(object as GeoPoint),
    }),
  renderContextPanel: (point) => <ParaglidingPanel point={point} />,
},
```

- [ ] **Commit**

```bash
git add app/api/paragliding/ components/panels/ParaglidingPanel.tsx lib/layers-registry.ts
git commit -m "feat: add paragliding layer with wind/thermal conditions"
```

---

## Task 17 — BASE jump layer

**Files:** `app/api/basejump/route.ts`, `components/panels/BasejumpPanel.tsx`, update `lib/layers-registry.ts`

- [ ] **Create `app/api/basejump/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache'
import exits from '@/data/basejump-exits.json'
import { basejumpCondition, type ConditionStatus } from '@/lib/weather'

interface Exit { id: string; name: string; longitude: number; latitude: number; country: string; type: string; heightM: number; openingAltitudeM: number; difficulty: string; legal: string }

async function fetchBasejump() {
  const list = exits as Exit[]
  const results = await Promise.allSettled(list.map(async (e) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${e.latitude}&longitude=${e.longitude}&hourly=windspeed_10m,windgusts_10m,visibility,precipitation,cloudcover_low&forecast_days=1&windspeed_unit=kmh&timezone=auto`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const json = await res.json()
    const h = json.hourly
    const idx = new Date().getHours()
    const windKmh = h.windspeed_10m?.[idx] ?? 0
    const gustKmh = h.windgusts_10m?.[idx] ?? 0
    const visibilityKm = (h.visibility?.[idx] ?? 10000) / 1000
    const precipitation = (h.precipitation?.[idx] ?? 0) > 0
    const ceilingM = h.cloudcover_low?.[idx] > 50 ? 400 : 1000
    const condition: ConditionStatus = basejumpCondition(windKmh, gustKmh, visibilityKm, precipitation, ceilingM)
    return { ...e, windKmh, gustKmh, visibilityKm, precipitation, ceilingM, condition }
  }))
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...list[i], windKmh: 0, gustKmh: 0, visibilityKm: 10, precipitation: false, ceilingM: 1000, condition: 'green' as ConditionStatus }
  )
}

export async function GET() {
  try {
    const { data, stale } = await globalCache.get('basejump', fetchBasejump, 600_000)
    return NextResponse.json({ data, stale })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
```

- [ ] **Create `components/panels/BasejumpPanel.tsx`**

```tsx
import type { GeoPoint } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#4a6fa5] tracking-wider">{label}</span>
      <span className="text-[#a0c4d8]">{value}</span>
    </div>
  )
}

const LEGAL = { authorized: '✅ Autorisé', tolerated: '⚠️ Toléré', forbidden: '❌ Interdit' }
const COND = { green: { label: '🟢 Conditions OK', color: '#00FF88' }, yellow: { label: '🟡 Limites', color: '#FFB347' }, red: { label: '🔴 Ne pas sauter', color: '#FF6B35' } }

export default function BasejumpPanel({ point }: { point: GeoPoint }) {
  const d = point.data as { name: string; country: string; type: string; heightM: number; openingAltitudeM: number; difficulty: string; legal: string; windKmh: number; gustKmh: number; visibilityKm: number; precipitation: boolean; ceilingM: number; condition: 'green' | 'yellow' | 'red' }
  const cond = COND[d.condition]
  return (
    <div className="space-y-2">
      <p className="text-[#FF0080] text-sm font-bold">{d.name}</p>
      <p className="text-[11px] font-bold" style={{ color: cond.color }}>{cond.label}</p>
      <p className="text-[11px]">{LEGAL[d.legal as keyof typeof LEGAL] ?? d.legal}</p>
      <Row label="PAYS" value={d.country} />
      <Row label="TYPE" value={d.type} />
      <Row label="HAUTEUR" value={`${d.heightM} m`} />
      <Row label="ALT OUVERTURE" value={`${d.openingAltitudeM} m`} />
      <Row label="DIFFICULTÉ" value={d.difficulty} />
      <Row label="VENT" value={`${Math.round(d.windKmh)} km/h`} />
      <Row label="RAFALES" value={`${Math.round(d.gustKmh)} km/h`} />
      <Row label="VISIBILITÉ" value={`${d.visibilityKm.toFixed(1)} km`} />
      <Row label="PRÉCIP" value={d.precipitation ? 'Oui ⚠️' : 'Non'} />
      <Row label="PLAFOND" value={`${d.ceilingM} m`} />
    </div>
  )
}
```

- [ ] **Add basejump to `lib/layers-registry.ts`**

```ts
import BasejumpPanel from '@/components/panels/BasejumpPanel'

// Add to LAYERS:
{
  id: 'basejump',
  label: 'BASE jump',
  icon: '🏔',
  color: '#FF0080',
  colorRgb: hexToRgb('#FF0080'),
  apiRoute: '/api/basejump',
  pollIntervalMs: 600_000,
  defaultEnabled: true,
  transformResponse: (raw) => {
    const items = raw as { id: string; longitude: number; latitude: number; [key: string]: unknown }[]
    return items.map(d => ({ id: d.id, longitude: d.longitude, latitude: d.latitude, layerId: 'basejump', data: d }))
  },
  getDeckLayer: (points, onClick) =>
    new ScatterplotLayer({
      id: 'basejump-layer',
      data: points,
      getPosition: (d: GeoPoint) => [d.longitude, d.latitude],
      getColor: (d: GeoPoint) => {
        const c = (d.data as { condition: string }).condition
        if (c === 'green') return [255, 0, 128]
        if (c === 'yellow') return [255, 179, 71]
        return [100, 0, 50]
      },
      getRadius: 22_000,
      radiusMinPixels: 6,
      radiusMaxPixels: 14,
      pickable: true,
      onClick: ({ object }) => object && onClick(object as GeoPoint),
    }),
  renderContextPanel: (point) => <BasejumpPanel point={point} />,
},
```

- [ ] **Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Commit**

```bash
git add app/api/basejump/ components/panels/BasejumpPanel.tsx lib/layers-registry.ts
git commit -m "feat: add BASE jump layer with safety conditions"
```

---

## Task 18 — Deployment

**Files:** `.env.local.example`, `.gitignore`, `README.md` (minimal)

- [ ] **Create `.env.local.example`**

```
NEXT_PUBLIC_MAPBOX_TOKEN=get_free_token_at_mapbox.com
WINDY_API_KEY=get_free_key_at_api.windy.com
STORMGLASS_API_KEY=get_free_key_at_stormglass.io
```

- [ ] **Update `.gitignore`** — ensure these lines are present:

```
.env.local
.superpowers/
```

- [ ] **Final build check**

```bash
npm run build
```

Expected: build succeeds with no errors. If TypeScript errors appear, fix them before proceeding.

- [ ] **Push to GitHub and deploy to Vercel**

```bash
git add .env.local.example .gitignore
git commit -m "feat: add deployment config and env example"
# Create repo on github.com, then:
git remote add origin https://github.com/<username>/sentinel.git
git push -u origin main
```

Then on vercel.com: Import project → set env vars (`NEXT_PUBLIC_MAPBOX_TOKEN`, `WINDY_API_KEY`, `STORMGLASS_API_KEY`) → Deploy.

- [ ] **Verify prod deployment**

Open the Vercel URL. Check:
- Map loads with dark style ✓
- Flights layer shows blue dots ✓
- Sports layers visible (surf, skydive, paragliding, BASE) ✓
- Click a point → ContextPanel opens with correct data ✓
- LayerToggle toggles layers on/off ✓
- TopBar shows live counts ✓
- StatusBar shows coordinates ✓
