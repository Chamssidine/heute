import { formatHHMM } from "@heute/domain";

export type AuditRow = {
  id: string;
  tableName: string;
  action: string;
  old: unknown;
  new: unknown;
  changedBy: string | null;
  changedAt: string;
  reason: string | null;
  employeeId: string | null;
  date: string | null;
};

export type FieldChange = { field: string; before: string | null; after: string | null };

export const AUDIT_TABLES = ["shifts", "meal_counts", "menu_items", "room_tasks"] as const;

export const PAGE_SIZE = 25;

export const TABLE_LABELS: Record<string, string> = {
  shifts: "Dienst",
  meal_counts: "Verpflegung",
  menu_items: "Speiseplan",
  room_tasks: "Housekeeping",
};

export const ACTION_LABELS: Record<string, string> = {
  insert: "Angelegt",
  update: "Geändert",
  delete: "Gelöscht",
};

const FIELD_LABELS: Record<string, string> = {
  employee_id: "Mitarbeitende",
  date: "Datum",
  type: "Art",
  start1: "Beginn",
  end1: "Ende",
  start2: "Beginn 2. Teil",
  end2: "Ende 2. Teil",
  break_min: "Pause (Min.)",
  note: "Bemerkung",
  booking_id: "Buchung",
  meal: "Mahlzeit",
  total: "Gesamt",
  veg: "Vegetarisch",
  vegan: "Vegan",
  mos: "MOS",
  allergies: "Allergien",
  main_dish: "Hauptgericht",
  veg_variant: "Vegetarische Variante",
  dessert: "Nachtisch",
  room_id: "Zimmer",
  task_type: "Aufgabe",
  zone: "Bereich",
  assigned_to: "Zugewiesen an",
  status: "Status",
  done_at: "Erledigt um",
};

const IGNORED_FIELDS = new Set(["id", "created_at", "updated_at"]);

// Pas de donnée de santé en clair : le motif d'absence et le contenu libre ou allergique
// ne sont jamais affichés, seulement le fait qu'ils ont changé.
const REDACTED_FIELDS = new Set(["note", "allergies"]);
const REDACTED_VALUE = "(ausgeblendet)";
const ABSENCE_TYPES = new Set(["krank", "urlaub"]);
const ABSENT = "Abwesend";

const MINUTE_FIELDS = new Set(["start1", "end1", "start2", "end2"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

export function formatValue(
  field: string,
  value: unknown,
  names: ReadonlyMap<string, string> = new Map(),
): string | null {
  if (isEmpty(value)) {
    return null;
  }
  if (REDACTED_FIELDS.has(field)) {
    return REDACTED_VALUE;
  }
  if (field === "type" && typeof value === "string" && ABSENCE_TYPES.has(value)) {
    return ABSENT;
  }
  if (MINUTE_FIELDS.has(field) && typeof value === "number") {
    return formatHHMM(value);
  }
  if ((field === "employee_id" || field === "assigned_to") && typeof value === "string") {
    return names.get(value) ?? "Unbekannt";
  }
  if (field === "done_at" && typeof value === "string") {
    return formatTimestamp(value);
  }
  if (field === "date" && typeof value === "string") {
    return `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return REDACTED_VALUE;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(d);
}

// Insert : champs renseignés ; delete : champs qui existaient ; update : champs modifiés.
export function diffRow(
  row: Pick<AuditRow, "action" | "old" | "new">,
  names: ReadonlyMap<string, string> = new Map(),
): FieldChange[] {
  const before = isRecord(row.old) ? row.old : {};
  const after = isRecord(row.new) ? row.new : {};
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: FieldChange[] = [];
  for (const field of fields) {
    if (IGNORED_FIELDS.has(field)) {
      continue;
    }
    const b = before[field];
    const a = after[field];
    if (JSON.stringify(b ?? null) === JSON.stringify(a ?? null)) {
      continue;
    }
    changes.push({
      field: FIELD_LABELS[field] ?? field,
      before: formatValue(field, b, names),
      after: formatValue(field, a, names),
    });
  }
  return changes;
}

// Bornes ISO d'une date locale « YYYY-MM-DD » (début de jour ; fin = début du jour suivant).
export function dayStartIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

export function nextDayStartIso(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
