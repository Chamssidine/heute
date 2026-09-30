/**
 * Date du jour au format YYYY-MM-DD, fuseau Europe/Berlin (en-CA donne ce format).
 */
export function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}
