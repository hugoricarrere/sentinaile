/** Retourne l'heure courante (0-23) dans le fuseau Europe/Paris */
export function parisHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
    10,
  )
}

/**
 * Trouve l'index dans un tableau de temps Open-Meteo (format "YYYY-MM-DDTHH:MM")
 * correspondant à l'heure courante en heure de Paris.
 * À utiliser côté serveur (routes API) pour éviter le décalage UTC vs. heure locale.
 */
export function currentHourIndex(times: string[]): number {
  const now = new Date()
  // en-CA retourne "YYYY-MM-DD" — format ISO sans ambiguïté
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  const hour = parisHour()
  const prefix = `${dateStr}T${String(hour).padStart(2, '0')}`
  const idx = times.findIndex(t => t.startsWith(prefix))
  return idx >= 0 ? idx : hour   // fallback : heure Paris si le tableau est vide
}
