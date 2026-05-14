export type ConditionStatus = 'green' | 'yellow' | 'red'

export function skydiveCondition(
  windKmhSurface: number,
  windKmh4000m: number,        // 600 hPa ≈ 4 300 m (altitude de largage tandem)
  visibilityKm: number,
  precipFraction: number,       // fraction des heures de jour avec précipitation (0–1)
  cloudcoverLowPct: number,     // couverture nuageuse basse < 2 000 m (0–100)
  hasStorm: boolean,            // weathercode ≥ 95 dans les 4 prochaines heures
): ConditionStatus {
  // ── Rouge immédiat ────────────────────────────────────────────────────────
  if (hasStorm)                     return 'red'   // orage/foudre
  if (visibilityKm < 3)             return 'red'   // visibilité insuffisante
  if (windKmhSurface > 35)          return 'red'   // vent atterrissage trop fort
  if (windKmh4000m > 80)            return 'red'   // vent largage trop fort
  if (precipFraction > 0.75)        return 'red'   // pluie toute la journée

  // ── Orange ───────────────────────────────────────────────────────────────
  if (precipFraction > 0.5)         return 'yellow' // pluie + de 50 % du jour
  if (cloudcoverLowPct > 75)        return 'yellow' // plafond bas bloque le saut
  if (visibilityKm < 5)             return 'yellow'
  if (windKmhSurface > 25)          return 'yellow'
  if (windKmh4000m > 60)            return 'yellow'

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
  if (swellHeightM >= 1.5 && swellHeightM <= 2.5) score += 2
  else if (swellHeightM >= 0.8 && swellHeightM < 1.5) score += 0.5
  else if (swellHeightM < 0.5 || swellHeightM > 4) score -= 2
  if (swellPeriodS >= 12) score += 2
  else if (swellPeriodS >= 8) score += 0.5
  else score -= 1
  if (windOffshore && windKmh < 15) score += 1
  else if (!windOffshore || windKmh > 25) score -= 2
  return Math.max(1, Math.min(10, Math.round(score)))
}
