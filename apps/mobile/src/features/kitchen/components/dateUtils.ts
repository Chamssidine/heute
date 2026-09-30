import { strings } from "../../../strings/index.ts";

/**
 * Date du jour au format YYYY-MM-DD, fuseau Europe/Berlin (en-CA donne ce format).
 */
export function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

/**
 * Décale une date YYYY-MM-DD d'un certain nombre de jours en UTC (évite tout bug DST).
 */
export function shiftDate(dateStr: string, days: number): string {
  const parts = dateStr.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formate la date selon le standard court allemand : « Di, 30.09. » (screens.md §6.3).
 */
export function formatDayLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = strings.tasks.weekdaysShort[date.getUTCDay()];
  return `${weekday}, ${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.`;
}
