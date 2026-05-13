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
