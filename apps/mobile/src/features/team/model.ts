import { formatHHMM, type Database } from "@heute/domain";

/**
 * Types de service possibles dans l'interface de l'équipe (screens.md §6.4 et copy.md §7.1).
 * Tout motif d'absence sensible (« urlaub », « krank ») est impérativement transformé en « abwesend ».
 */
export type TeamShiftType = "normal" | "td" | "sem" | "frei" | "abwesend";

/**
 * Libellés allemands pour chaque type de service selon docs/design/copy.md §7.1.
 */
export const TEAM_SHIFT_LABELS: Record<TeamShiftType, string> = {
  normal: "Dienst",
  td: "Teildienst",
  sem: "Seminar",
  frei: "Frei",
  abwesend: "Abwesend",
};

/**
 * Libellés abrégés pour badges/chips selon copy.md §7.1 et screens.md §6.4.
 * Dans la vue Team, seul le Teildienst porte un badge [TD].
 */
export const TEAM_SHIFT_BADGE_LABELS: Partial<Record<TeamShiftType, string>> = {
  td: "TD",
};

type RpcTeamShift = Database["public"]["Functions"]["team_shifts"]["Returns"][number];

/**
 * Données brutes d'un service issues de la RPC `team_shifts(day)` selon le contrat généré.
 * Dérivé de Database["public"]["Functions"]["team_shifts"]["Returns"][number].
 */
export type RawTeamShift = Omit<RpcTeamShift, "start1" | "end1" | "start2" | "end2"> & {
  start1?: number | null;
  end1?: number | null;
  start2?: number | null;
  end2?: number | null;
};

/**
 * Représentation d'un service d'un membre de l'équipe pour l'interface (Agent U).
 * Garanti sans motif sensible d'absence (« krank » ou « urlaub »).
 */
export interface TeamShift {
  id: string;
  name: string;
  type: TeamShiftType;
  label: string;
  badgeLabel: string | null;
  hours: string;
}

/**
 * Identifiants canoniques des groupes de la vue Team (screens.md §6.4).
 */
export type TeamGroupId = "kueche" | "housekeeping_bfd" | "nicht_da";

/**
 * Titres allemands des groupes selon screens.md §6.4.
 */
export const TEAM_GROUP_TITLES: Record<TeamGroupId, string> = {
  kueche: "Küche",
  housekeeping_bfd: "Housekeeping / BFD",
  nicht_da: "Nicht da",
};

/**
 * Groupe d'employés dans la vue Team (Küche, Housekeeping/BFD, Nicht da).
 */
export interface TeamGroup {
  id: TeamGroupId;
  title: string;
  shifts: TeamShift[];
}

/**
 * Vue complète de l'équipe pour un jour donné.
 */
export interface TeamDay {
  date: string;
  groups: TeamGroup[];
}

/**
 * Normalise le type de service en masquant tout motif sensible.
 * « urlaub » et « krank » sont systématiquement transformés en « abwesend »
 * conformément aux règles de confidentialité du personnel (AGENTS.md).
 */
export function normalizeTeamShiftType(rawType: string): TeamShiftType {
  const lower = rawType.toLowerCase().trim();

  if (lower === "urlaub" || lower === "krank" || lower === "abwesend") {
    return "abwesend";
  }
  if (lower === "frei") {
    return "frei";
  }
  if (lower === "td") {
    return "td";
  }
  if (lower === "sem" || lower === "seminar") {
    return "sem";
  }
  if (lower === "normal" || lower === "dienst") {
    return "normal";
  }

  // Tout autre type ou statut non reconnu est considéré comme une absence neutre
  return "abwesend";
}

/**
 * Formate la plage horaire ou le statut pour l'affichage selon screens.md §6.4.
 * Exemples :
 * - normal : « 06:00–14:30 »
 * - td : « 08:00–13:00 · 18:00–21:00 »
 * - frei : « Frei »
 * - abwesend : « Abwesend »
 */
export function formatTeamShiftHours(shift: {
  type: string;
  start1?: number | null;
  end1?: number | null;
  start2?: number | null;
  end2?: number | null;
}): string {
  const normalizedType = normalizeTeamShiftType(shift.type);

  if (normalizedType === "normal" && shift.start1 != null && shift.end1 != null) {
    return `${formatHHMM(shift.start1)}–${formatHHMM(shift.end1)}`;
  }

  if (normalizedType === "td" && shift.start1 != null && shift.end1 != null) {
    const slot1 = `${formatHHMM(shift.start1)}–${formatHHMM(shift.end1)}`;
    if (shift.start2 != null && shift.end2 != null) {
      const slot2 = `${formatHHMM(shift.start2)}–${formatHHMM(shift.end2)}`;
      return `${slot1} · ${slot2}`;
    }
    return slot1;
  }

  if (normalizedType === "frei") {
    return "Frei";
  }

  if (normalizedType === "abwesend") {
    return "Abwesend";
  }

  if (normalizedType === "sem") {
    return "Seminar";
  }

  return "—";
}

/**
 * Transforme un enregistrement brut RPC en TeamShift prêt pour l'UI,
 * en masquant tout motif sensible.
 */
export function toTeamShift(raw: RawTeamShift): TeamShift {
  const type = normalizeTeamShiftType(raw.type);
  const label = TEAM_SHIFT_LABELS[type];
  const badgeLabel = TEAM_SHIFT_BADGE_LABELS[type] ?? null;
  const hours = formatTeamShiftHours({ ...raw, type });

  return {
    id: raw.employee_id,
    name: raw.display_name,
    type,
    label,
    badgeLabel,
    hours,
  };
}

/**
 * Détermine le groupe d'affectation selon screens.md §6.4 :
 * - Toute personne non présente (frei, abwesend) va dans « Nicht da »
 * - Les personnes en cuisine vont dans « Küche »
 * - Les personnes en ménage, volontariat ou autre département (ex. rezeption) vont dans « Housekeeping / BFD »
 */
export function getTeamGroupId(shift: { type: string; department: string }): TeamGroupId {
  const normalizedType = normalizeTeamShiftType(shift.type);
  if (normalizedType === "frei" || normalizedType === "abwesend") {
    return "nicht_da";
  }

  const dept = shift.department.toLowerCase().trim();
  if (dept === "kueche") {
    return "kueche";
  }

  return "housekeeping_bfd";
}

/**
 * Groupe les services par Küche, Housekeeping/BFD et Nicht da selon screens.md §6.4.
 * Trie les personnes par ordre alphabétique dans chaque groupe.
 */
export function groupTeamShifts(shifts: readonly RawTeamShift[]): TeamGroup[] {
  const kuecheShifts: TeamShift[] = [];
  const hkBfdShifts: TeamShift[] = [];
  const nichtDaShifts: TeamShift[] = [];

  for (const raw of shifts) {
    const shift = toTeamShift(raw);
    const groupId = getTeamGroupId(raw);
    if (groupId === "kueche") {
      kuecheShifts.push(shift);
    } else if (groupId === "housekeeping_bfd") {
      hkBfdShifts.push(shift);
    } else {
      nichtDaShifts.push(shift);
    }
  }

  const sortByName = (a: TeamShift, b: TeamShift) => a.name.localeCompare(b.name, "de");
  kuecheShifts.sort(sortByName);
  hkBfdShifts.sort(sortByName);
  nichtDaShifts.sort(sortByName);

  return [
    {
      id: "kueche",
      title: TEAM_GROUP_TITLES.kueche,
      shifts: kuecheShifts,
    },
    {
      id: "housekeeping_bfd",
      title: TEAM_GROUP_TITLES.housekeeping_bfd,
      shifts: hkBfdShifts,
    },
    {
      id: "nicht_da",
      title: TEAM_GROUP_TITLES.nicht_da,
      shifts: nichtDaShifts,
    },
  ];
}

/**
 * Construit un TeamDay à partir d'une liste de services pour une date donnée.
 */
export function createTeamDay(date: string, shifts: readonly RawTeamShift[]): TeamDay {
  return {
    date,
    groups: groupTeamShifts(shifts),
  };
}

/**
 * Fixture réaliste correspondant exactement à la maquette de docs/design/screens.md §6.4 :
 * - Date : Di, 30.09.2026 (« 2026-09-30 »)
 * - Küche :
 *     Anna Beispiel : normal 06:00–14:30
 *     Ben Muster : normal 10:30–19:00
 * - Housekeeping / BFD :
 *     Clara Test : td 08:00–13:00 · 18:00–21:00 [TD]
 * - Nicht da :
 *     David Probe : frei (Frei)
 *     Eva Muster : abwesend (Abwesend)
 */
export const RAW_TEAM_SHIFTS_FIXTURE: readonly RawTeamShift[] = [
  {
    employee_id: "emp-anna",
    display_name: "Anna Beispiel",
    department: "kueche",
    type: "normal",
    start1: 360,
    end1: 870,
  },
  {
    employee_id: "emp-ben",
    display_name: "Ben Muster",
    department: "kueche",
    type: "normal",
    start1: 630,
    end1: 1140,
  },
  {
    employee_id: "emp-clara",
    display_name: "Clara Test",
    department: "housekeeping",
    type: "td",
    start1: 480,
    end1: 780,
    start2: 1080,
    end2: 1260,
  },
  {
    employee_id: "emp-david",
    display_name: "David Probe",
    department: "bfd",
    type: "frei",
  },
  {
    employee_id: "emp-eva",
    display_name: "Eva Muster",
    department: "kueche",
    type: "abwesend",
  },
];

export const teamDayFixture: TeamDay = createTeamDay("2026-09-30", RAW_TEAM_SHIFTS_FIXTURE);
