/**
 * Central registry — assembles LAYERS in display order.
 * Each layer is defined in its own file; only wiring + ordering lives here.
 *
 * Layers removed: ships (AIS) and flights (ADS-B) — hors-scope pour sports outdoor.
 */
export type { LayerConfig } from './_types'

import { webcamsLayer }    from './webcams'
import { surfLayer }       from './surf'
import { skydiveLayer }    from './skydive'
import { paraglidingLayer } from './paragliding'
import { basejumpLayer }   from './basejump'

export const LAYERS = [
  // ── Sports aériens ───────────────────────────────────────────────────────
  skydiveLayer,
  paraglidingLayer,
  basejumpLayer,
  // ── Sports nautiques ─────────────────────────────────────────────────────
  surfLayer,
  // ── Webcams ──────────────────────────────────────────────────────────────
  webcamsLayer,
]
