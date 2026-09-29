import {
  formatHHMM,
  isSundayDate,
  monthBalance,
  workedMinutes,
  type ShiftInput,
  type ShiftType,
} from "@heute/domain";

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
 * Représentation d'une journée de service dans la vue « Mein Dienstplan ».
 * Contrat exposé à l'interface (Agent U).
 */
export interface ShiftDay {
  date: string;
  type: ShiftType;
  label: string;
  badgeLabel: string;
  hours: string;
  start1?: string;
  end1?: string;
  start2?: string;
  end2?: string;
  isSunday: boolean;
  istMinutes: number;
}

/**
 * Vue complète d'un mois de service pour l'utilisateur connecté.
 */
export interface MyShiftsView {
  month: string;
  days: ShiftDay[];
  istMinutes: number;
  sollMinutes: number;
  diffMinutes: number;
  ist: number;
  soll: number;
  diff: number;
}

/**
 * Formate la plage horaire d'un service au format HH:MM avec tiret demi-cadratin.
 * Exemple : « 08:00–16:30 » ou « 08:00–13:00 · 18:00–21:00 » pour un Teildienst.
 */
export function formatShiftHours(shift: ShiftInput): string {
  if (shift.type === "normal" && shift.start1 != null && shift.end1 != null) {
    return `${formatHHMM(shift.start1)}–${formatHHMM(shift.end1)}`;
  }

  if (shift.type === "td" && shift.start1 != null && shift.end1 != null) {
    const slot1 = `${formatHHMM(shift.start1)}–${formatHHMM(shift.end1)}`;
    if (shift.start2 != null && shift.end2 != null) {
      const slot2 = `${formatHHMM(shift.start2)}–${formatHHMM(shift.end2)}`;
      return `${slot1} · ${slot2}`;
    }
    return slot1;
  }

  return "—";
}

/**
 * Transforme une entrée de service en ShiftDay typé pour l'interface.
 */
export function toShiftDay(shift: ShiftInput): ShiftDay {
  const isSunday =
    typeof shift.isSunday === "boolean"
      ? shift.isSunday
      : shift.date
        ? isSundayDate(shift.date)
        : false;

  const istMinutes = workedMinutes(shift);

  return {
    date: shift.date ?? "",
    type: shift.type,
    label: SHIFT_LABELS[shift.type],
    badgeLabel: SHIFT_BADGE_LABELS[shift.type],
    hours: formatShiftHours(shift),
    start1: shift.start1 != null ? formatHHMM(shift.start1) : undefined,
    end1: shift.end1 != null ? formatHHMM(shift.end1) : undefined,
    start2: shift.start2 != null ? formatHHMM(shift.start2) : undefined,
    end2: shift.end2 != null ? formatHHMM(shift.end2) : undefined,
    isSunday,
    istMinutes,
  };
}

/**
 * Construit un MyShiftsView à partir d'une liste de services et d'un Soll mensuel.
 */
export function createMyShiftsView(
  month: string,
  shifts: readonly ShiftInput[],
  sollMinutes = 174 * 60,
): MyShiftsView {
  const balance = monthBalance(shifts, sollMinutes);
  const days = shifts.map(toShiftDay);

  return {
    month,
    days,
    istMinutes: balance.istMinutes,
    sollMinutes: balance.sollMinutes,
    diffMinutes: balance.diffMinutes,
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
export const OCTOBER_2026_SHIFTS: readonly ShiftInput[] = [
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
  { date: "2026-10-14", type: "normal", start1: 480, end1: 990, break_min: 30 },
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

export const mockMyShifts: MyShiftsView = myShiftsFixture;
