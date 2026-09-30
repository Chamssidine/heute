import { formatHHMM } from "@heute/domain";
import type { TaskStatus } from "./housekeeping.ts";

export type TeamShiftRow = {
  employee_id: string;
  display_name: string;
  department: string;
  type: string;
  start1: number;
  end1: number;
  start2: number;
  end2: number;
};

export type TeamEntry = { id: string; name: string; department: string; label: string };

export const TEAM_DEPARTMENTS = ["kueche", "housekeeping", "bfd", "rezeption"] as const;

const ABSENCE_TYPES = new Set(["krank", "urlaub", "abwesend"]);

// Un admin reçoit le motif d'absence de team_shifts : il est masqué ici aussi (jamais de « krank »).
export function shiftLabel(row: TeamShiftRow): string {
  if (ABSENCE_TYPES.has(row.type)) {
    return "Abwesend";
  }
  const first = `${formatHHMM(row.start1)}–${formatHHMM(row.end1)}`;
  if (row.type === "td" && row.start2 !== null && row.end2 !== null) {
    return `${first}, ${formatHHMM(row.start2)}–${formatHHMM(row.end2)}`;
  }
  return first;
}

export function teamByDepartment(rows: readonly TeamShiftRow[]): Map<string, TeamEntry[]> {
  const groups = new Map<string, TeamEntry[]>();
  for (const row of rows) {
    const list = groups.get(row.department) ?? [];
    list.push({
      id: row.employee_id,
      name: row.display_name,
      department: row.department,
      label: shiftLabel(row),
    });
    groups.set(row.department, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "de"));
  }
  return groups;
}

export type TaskCounts = Record<TaskStatus, number> & { total: number; percentDone: number };

export function taskCounts(statuses: readonly TaskStatus[]): TaskCounts {
  const counts: TaskCounts = {
    offen: 0,
    in_arbeit: 0,
    erledigt: 0,
    total: statuses.length,
    percentDone: 0,
  };
  for (const status of statuses) {
    counts[status] += 1;
  }
  counts.percentDone = counts.total === 0 ? 0 : Math.round((counts.erledigt / counts.total) * 100);
  return counts;
}
