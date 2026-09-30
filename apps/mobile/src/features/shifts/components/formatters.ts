import { strings } from "../../../strings/de.ts";

const WEEKDAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

/**
 * Formate une date YYYY-MM-DD en date courte allemande selon screens.md §6.5 (ex. « Do 01.10. »).
 */
export function formatShiftDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid shift date (expected YYYY-MM-DD): ${dateStr}`);
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = WEEKDAY_NAMES[date.getUTCDay()] ?? "";
  return `${weekday} ${parts[2]}.${parts[1]}.`;
}

/**
 * Extrait le nom du mois en allemand à partir d'une chaîne YYYY-MM selon screens.md §6.5 (ex. « Oktober »).
 */
export function formatShiftMonth(monthStr: string): string {
  const parts = monthStr.split("-");
  if (parts.length !== 2) {
    throw new Error(`Invalid shift month (expected YYYY-MM): ${monthStr}`);
  }
  const monthName = strings.shifts.monthNames[Number(parts[1]) - 1];
  if (monthName === undefined) {
    throw new Error(`Invalid shift month (expected YYYY-MM): ${monthStr}`);
  }
  return monthName;
}
