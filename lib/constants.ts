/**
 * Named constants for magic numbers used across the codebase.
 * Centralises values that would otherwise be scattered as undocumented literals.
 */

// ── Poll intervals (ms) ───────────────────────────────────────────────────────
/** 10 minutes — default refresh for slow-changing weather data */
export const POLL_WEATHER_MS = 600_000
/** 30 minutes — refresh for surf/marine forecasts */
export const POLL_SURF_MS = 1_800_000
/** 5 minutes — refresh for webcams and traffic */
export const POLL_MEDIUM_MS = 300_000
/** 2 minutes — refresh for train data */
export const POLL_TRAINS_MS = 120_000
/** 60 seconds — refresh for ships */
export const POLL_SHIPS_MS = 60_000
/** 30 seconds — refresh for flights */
export const POLL_FLIGHTS_MS = 30_000

// ── Supercluster / clustering ─────────────────────────────────────────────────
/** Pixel radius used by Supercluster for grouping nearby points */
export const CLUSTER_RADIUS_PX = 60
/** Maximum zoom level at which clustering is active */
export const CLUSTER_MAX_ZOOM = 14

// ── Jitter ────────────────────────────────────────────────────────────────────
/** Degree radius for spreading coincident points into a small circle (~500 m) */
export const JITTER_RADIUS_DEG = 0.005

// ── Map ───────────────────────────────────────────────────────────────────────
/** Default map view over metropolitan France */
export const DEFAULT_VIEW = { longitude: 2.3, latitude: 46.8, zoom: 5.6 }

/** France bounding box used for the france-only filter */
export const FRANCE_BBOX = {
  minLat: 41.3, maxLat: 51.1,
  minLon: -5.2, maxLon:  9.6,
}

// ── Weather thresholds ────────────────────────────────────────────────────────
/** Wind speed (km/h) above which surface conditions are considered too strong */
export const WIND_SURFACE_LIMIT_KMPH = 30
/** Wind speed (km/h) at altitude (4 000 m) that makes tandem skydiving inadvisable */
export const WIND_ALTI_LIMIT_KMPH = 60
/** Minimum visibility (km) required for skydiving */
export const VISIBILITY_MIN_KM = 5
/** CAPE threshold (J/kg) indicating significant convective risk */
export const CAPE_RISK_THRESHOLD = 500
