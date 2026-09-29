import {
  DEFAULT_BREAK_MINUTES,
  FULL_DAY_MINUTES,
  KRANK_MINUTES,
  SUNDAY_FACTOR,
} from "./constants.ts";
import type { MonthBalance, ShiftInput } from "./types.ts";

/**
 * Détermine si une date YYYY-MM-DD correspond à un dimanche (Europe/Berlin).
 */
export function isSundayDate(dateStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match || !match[1] || !match[2] || !match[3]) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCDay() === 0;
}

/**
 * Calcule les minutes prestées (IST) pour un service selon les règles métier :
 * - normal : amplitude (end1 - start1) − break_min
 * - td (Teildienst) : somme des 2 plages sans déduction de pause (Q2)
 * - sem (Seminar) et urlaub : 480 min forfaitaires (8h)
 * - frei : 0 min
 * - krank : KRANK_MINUTES (0 min dans l'Excel papier, Q3)
 * - dimanche : multiplication par SUNDAY_FACTOR (1,5)
 */
export function workedMinutes(shift: ShiftInput): number {
  let baseMinutes = 0;

  switch (shift.type) {
    case "frei":
      return 0;

    case "krank":
      baseMinutes = KRANK_MINUTES;
      break;

    case "sem":
    case "urlaub":
      baseMinutes = FULL_DAY_MINUTES;
      break;

    case "td": {
      const s1 = shift.start1 ?? 0;
      const e1 = shift.end1 ?? 0;
      const s2 = shift.start2 ?? 0;
      const e2 = shift.end2 ?? 0;
      const part1 = Math.max(0, e1 - s1);
      const part2 = Math.max(0, e2 - s2);
      baseMinutes = part1 + part2;
      break;
    }

    case "normal": {
      const s1 = shift.start1 ?? 0;
      const e1 = shift.end1 ?? 0;
      const breakMin = shift.break_min ?? DEFAULT_BREAK_MINUTES;
      const amplitude = Math.max(0, e1 - s1);
      baseMinutes = Math.max(0, amplitude - Math.max(0, breakMin));
      break;
    }
  }

  const isSunday =
    typeof shift.isSunday === "boolean"
      ? shift.isSunday
      : shift.date
        ? isSundayDate(shift.date)
        : false;

  if (isSunday && baseMinutes > 0) {
    return Math.round(baseMinutes * SUNDAY_FACTOR);
  }

  return baseMinutes;
}

/**
 * Calcule la balance mensuelle d'un ensemble de services face au Soll contractuel du mois.
 */
export function monthBalance(
  shifts: readonly ShiftInput[],
  sollMinutesMonth: number,
): MonthBalance {
  const istMinutes = shifts.reduce((total, s) => total + workedMinutes(s), 0);
  return {
    istMinutes,
    sollMinutes: sollMinutesMonth,
    diffMinutes: istMinutes - sollMinutesMonth,
  };
}
