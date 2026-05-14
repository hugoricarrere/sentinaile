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
