import {
  formatHHMM,
  isSundayDate,
  monthBalance,
  workedMinutes,
  type MonthBalance,
  type ShiftInput,
} from "@heute/domain";

export type ScheduleShift = ShiftInput & {
  employeeId: string;
  date: string;
  note: string | null;
};

export type ScheduleEmployee = {
  id: string;
  displayName: string;
  sollMinutesMonth: number;
};

export type DayHeader = { date: string; day: number; weekday: string; isSunday: boolean };

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

// Codes de la ligne Bemerkung de l'Excel ; vide pour un service normal sans note.
const TYPE_CODES = { td: "TD", sem: "SEM", urlaub: "u", krank: "k", frei: "x" } as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year ?? 1970, (m ?? 1) - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function monthRange(month: string): { first: string; last: string; days: number } {
  const [year, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year ?? 1970, m ?? 1, 0)).getUTCDate();
  return { first: `${month}-01`, last: `${month}-${pad(days)}`, days };
}

export function monthDays(month: string): DayHeader[] {
  const { days } = monthRange(month);
  return Array.from({ length: days }, (_, i) => {
    const date = `${month}-${pad(i + 1)}`;
    const [y, m, d] = date.split("-").map(Number);
    const weekday = WEEKDAYS[new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay()] ?? "";
    return { date, day: i + 1, weekday, isSunday: isSundayDate(date) };
  });
}

export type ShiftCell = { start: string; end: string; code: string; ist: string };

export function shiftCell(shift: ScheduleShift | undefined): ShiftCell {
  if (!shift) {
    return { start: "", end: "", code: "", ist: "" };
  }
  const hasHours = shift.type === "normal" || shift.type === "td";
  const fmt = (v: number | null | undefined) => (v == null ? "" : formatHHMM(v));
  const span = (a: number | null | undefined, b: number | null | undefined) =>
    a == null && b == null ? "" : `${fmt(a)}–${fmt(b)}`;
  const first = hasHours ? span(shift.start1, shift.end1) : "";
  const second = hasHours && shift.type === "td" ? span(shift.start2, shift.end2) : "";
  const typeCode = shift.type === "normal" ? "" : TYPE_CODES[shift.type];
  return {
    start: first,
    end: second,
    code: [typeCode, shift.note ?? ""].filter(Boolean).join(" "),
    ist: formatHHMM(workedMinutes(shift)),
  };
}

export function employeeBalance(
  employee: ScheduleEmployee,
  shifts: readonly ScheduleShift[],
): MonthBalance {
  return monthBalance(shifts, employee.sollMinutesMonth);
}
