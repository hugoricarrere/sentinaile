/**
 * Central registry — assembles LAYERS in display order.
 * Each layer is defined in its own file; only wiring + ordering lives here.
 */
export type { LayerConfig } from './_types'

import { airLayer }        from './air'
import { weatherLayer }    from './weather'
import { webcamsLayer }    from './webcams'
import { surfLayer }       from './surf'
import { skydiveLayer }    from './skydive'
import { paraglidingLayer } from './paragliding'
import { basejumpLayer }   from './basejump'
import { flightsLayer }    from './flights'
import { shipsLayer }      from './ships'

export const LAYERS = [
  // ── Aerial sports (default on) ────────────────────────────────────────────
  skydiveLayer,
  paraglidingLayer,
  basejumpLayer,
  // ── Water ────────────────────────────────────────────────────────────────
  surfLayer,
  shipsLayer,
  // ── Air traffic ──────────────────────────────────────────────────────────
  flightsLayer,
  // ── Environment ──────────────────────────────────────────────────────────
  weatherLayer,
  airLayer,
  webcamsLayer,
]
