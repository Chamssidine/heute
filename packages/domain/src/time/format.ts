/**
 * Formate un nombre de minutes sous la forme « HH:MM » (ex. « 08:00 »).
 * Gère les durées supérieures à 24h et les valeurs négatives.
 */
export function formatHHMM(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Formate une durée en heures pour l'affichage selon la charte (ex. « 8:00 Std. »).
 * Pas de zéro initial sur l'heure, jamais de décimales.
 */
export function formatHours(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, "0")} Std.`;
}
