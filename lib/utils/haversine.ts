/** Distance en km entre deux points GPS (formule de Haversine). */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Formate une distance en km : "< 1 km", "3 km", "42 km". */
export function formatKm(km: number): string {
  if (km < 1) return '< 1 km'
  if (km < 10) return `${Math.round(km)} km`
  return `${Math.round(km / 5) * 5} km`  // arrondi à 5 km pour les grandes distances
}
