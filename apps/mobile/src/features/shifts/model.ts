import {
  formatHHMM,
  isSundayDate,
  monthBalance,
  workedMinutes,
  type ShiftInput,
  type ShiftType,
} from "@heute/domain";

import { isItemChanged, type ChangeIndicator } from "../../lib/query/lastSeen/index.ts";

/**
 * Libellés allemands pour chaque type de service selon docs/design/copy.md §7.1.
 */
export const SHIFT_LABELS: Record<ShiftType, string> = {
  normal: "Dienst",
  td: "Teildienst",
  sem: "Seminar",
  urlaub: "Urlaub",
  krank: "Krank",
  frei: "Frei",
};

/**
 * Libellés abrégés pour badges/chips selon docs/design/copy.md §7.1 et screens.md §6.5.
 */
export const SHIFT_BADGE_LABELS: Record<ShiftType, string> = {
  normal: "Dienst",
  td: "TD",
  sem: "Seminar",
  urlaub: "Urlaub",
  krank: "Krank",
  frei: "Frei",
};

/**
 * Ancienne valeur d'un service modifié (VG-05 / tokens.md §4.4).
 */
export interface ShiftDayPrevious {
  type?: ShiftType;
  label?: string;
  badgeLabel?: string;
  hours?: string;
  istMinutes?: number;
}

/**
 * Représentation d'une journée de service dans la vue « Mein Dienstplan ».
 * Contrat exposé à l'interface (Agent U).
 */
export interface ShiftDay extends ChangeIndicator<ShiftDayPrevious> {
  date: string;
  type: ShiftType;
  label: string;
  badgeLabel: string;
  hours: string;
  isSunday: boolean;
  istMinutes: number;
}

/**
 * Vue complète d'un mois de service pour l'utilisateur connecté.
 */
export interface MyShiftsView {
  month: string;
  days: ShiftDay[];
  ist: number;
  soll: number;
  diff: number;
  updated_at?: string;
}

/**
 * Données d'entrée d'un service enrichies d'historique éventuel.
 */
export interface ShiftInputWithHistory extends ShiftInput {
  updated_at?: string;
  changed?: boolean;
  previous?: ShiftDayPrevious;
}

/**
 * Formate la plage horaire d'un service au format HH:MM avec tiret demi-cadratin.
 * Exemple : « 08:00–16:30 » ou « 08:00–13:00\n18:00–21:00 » pour un Teildienst (screens.md §6.5).
 */
export function formatShiftHours(shift: ShiftInput): string {
  if (shift.type === "normal" && shift.start1 != null && shift.end1 != null) {
    return `${formatHHMM(shift.start1)}–${formatHHMM(shift.end1)}`;
  }

  if (shift.type === "td" && shift.start1 != null && shift.end1 != null) {
    const slot1 = `${formatHHMM(shift.start1)}–${formatHHMM(shift.end1)}`;
    if (shift.start2 != null && shift.end2 != null) {
      const slot2 = `${formatHHMM(shift.start2)}–${formatHHMM(shift.end2)}`;
      return `${slot1}\n${slot2}`;
    }
    return slot1;
  }

  return "—";
}

/**
 * Transforme une entrée de service en ShiftDay typé pour l'interface.
 */
export function toShiftDay(shift: ShiftInputWithHistory, lastSeen?: string | null): ShiftDay {
  if (!shift.date) {
    throw new Error("ShiftDay requires a valid date (YYYY-MM-DD)");
  }

  const isSunday = typeof shift.isSunday === "boolean" ? shift.isSunday : isSundayDate(shift.date);

  const istMinutes = workedMinutes(shift);

  const isChanged =
    lastSeen !== undefined ? isItemChanged(shift.updated_at, lastSeen) : (shift.changed ?? false);

  return {
    date: shift.date,
    type: shift.type,
    label: SHIFT_LABELS[shift.type],
    badgeLabel: SHIFT_BADGE_LABELS[shift.type],
    hours: formatShiftHours(shift),
    isSunday,
    istMinutes,
    updated_at: shift.updated_at,
    changed: isChanged,
    previous: shift.previous,
  };
}

/**
 * Applique l'indicateur de changement sur un ShiftDay par rapport à lastSeen.
 */
export function applyShiftChanges(day: ShiftDay, lastSeen?: string | null): ShiftDay {
  if (!lastSeen || !day.updated_at) {
    return {
      ...day,
      changed: false,
      previous: undefined,
    };
  }

  const changed = isItemChanged(day.updated_at, lastSeen);
  return {
    ...day,
    changed,
    previous: changed ? day.previous : undefined,
  };
}

/**
 * Applique les indicateurs de changement sur l'ensemble d'un MyShiftsView.
 */
export function applyMyShiftsChanges(view: MyShiftsView, lastSeen?: string | null): MyShiftsView {
  if (!lastSeen) {
    return {
      ...view,
      days: view.days.map((d) => ({
        ...d,
        changed: false,
        previous: undefined,
      })),
    };
  }

  return {
    ...view,
    days: view.days.map((d) => applyShiftChanges(d, lastSeen)),
  };
}

/**
 * Construit un MyShiftsView à partir d'une liste de services et d'un Soll mensuel.
 */
export function createMyShiftsView(
  month: string,
  shifts: readonly ShiftInputWithHistory[],
  sollMinutes = 174 * 60,
  lastSeen?: string | null,
): MyShiftsView {
  const balance = monthBalance(shifts, sollMinutes);
  const days = shifts.map((s) => toShiftDay(s, lastSeen));

  return {
    month,
    days,
    ist: balance.istMinutes,
    soll: balance.sollMinutes,
    diff: balance.diffMinutes,
  };
}

/**
 * Fixture réaliste d'un mois complet (Octobre 2026, 31 jours) avec VZ (Soll 174h).
 * Comprend : Dienst normal, TD, SEM, Urlaub, Krank, Frei et des dimanches travaillés.
 * Total attendu : IST 184:00 (11 040 min), Soll 174:00 (10 440 min), Diff +10:00 (600 min).
 */
export const OCTOBER_2026_SHIFTS: readonly ShiftInputWithHistory[] = [
  { date: "2026-10-01", type: "normal", start1: 360, end1: 870, break_min: 30 },
  { date: "2026-10-02", type: "normal", start1: 360, end1: 870, break_min: 30 },
  { date: "2026-10-03", type: "frei" },
  { date: "2026-10-04", type: "normal", start1: 360, end1: 870, break_min: 30 },
  {
    date: "2026-10-05",
    type: "td",
    start1: 480,
    end1: 780,
    start2: 1080,
    end2: 1260,
    break_min: 0,
  },
  { date: "2026-10-06", type: "normal", start1: 360, end1: 870, break_min: 30 },
  { date: "2026-10-07", type: "sem" },
  { date: "2026-10-08", type: "urlaub" },
  { date: "2026-10-09", type: "urlaub" },
  { date: "2026-10-10", type: "frei" },
  { date: "2026-10-11", type: "frei" },
  { date: "2026-10-12", type: "krank" },
  { date: "2026-10-13", type: "normal", start1: 480, end1: 990, break_min: 30 },
  {
    date: "2026-10-14",
    type: "normal",
    start1: 480,
    end1: 990,
    break_min: 30,
    updated_at: "2026-10-01T14:05:00Z",
    previous: {
      hours: "08:00–16:00",
      label: "Dienst",
      istMinutes: 450,
    },
  },
  { date: "2026-10-15", type: "normal", start1: 480, end1: 990, break_min: 30 },
  { date: "2026-10-16", type: "normal", start1: 480, end1: 990, break_min: 30 },
  { date: "2026-10-17", type: "frei" },
  {
    date: "2026-10-18",
    type: "td",
    start1: 480,
    end1: 780,
    start2: 1080,
    end2: 1260,
    break_min: 0,
  },
  { date: "2026-10-19", type: "frei" },
  { date: "2026-10-20", type: "normal", start1: 630, end1: 1140, break_min: 30 },
  { date: "2026-10-21", type: "normal", start1: 630, end1: 1140, break_min: 30 },
  { date: "2026-10-22", type: "normal", start1: 630, end1: 1140, break_min: 30 },
  { date: "2026-10-23", type: "normal", start1: 630, end1: 1140, break_min: 30 },
  { date: "2026-10-24", type: "frei" },
  { date: "2026-10-25", type: "frei" },
  { date: "2026-10-26", type: "normal", start1: 405, end1: 915, break_min: 30 },
  { date: "2026-10-27", type: "normal", start1: 405, end1: 915, break_min: 30 },
  { date: "2026-10-28", type: "normal", start1: 405, end1: 915, break_min: 30 },
  { date: "2026-10-29", type: "normal", start1: 405, end1: 915, break_min: 30 },
  { date: "2026-10-30", type: "normal", start1: 405, end1: 915, break_min: 30 },
  { date: "2026-10-31", type: "frei" },
];

export const myShiftsFixture: MyShiftsView = createMyShiftsView(
  "2026-10",
  OCTOBER_2026_SHIFTS,
  174 * 60,
);
