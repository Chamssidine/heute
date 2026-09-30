const WEEKDAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

/**
 * Formate une date YYYY-MM-DD en date courte pour l'en-tête Team selon screens.md §6.4 (ex. « Di, 30.09. »).
 */
export function formatTeamDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid team date (expected YYYY-MM-DD): ${dateStr}`);
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error(`Invalid team date (expected YYYY-MM-DD): ${dateStr}`);
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = WEEKDAY_NAMES[date.getUTCDay()] ?? "";
  return `${weekday}, ${parts[2]}.${parts[1]}.`;
}
