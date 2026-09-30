import type { Database } from "@heute/domain";
import { rpcErrorMessage } from "@heute/domain/src/errors/index.ts";
import { de } from "../strings/de.ts";

type Department = Database["public"]["Enums"]["department"];
type AppRole = Database["public"]["Enums"]["app_role"];

export const DEPARTMENTS: readonly Department[] = ["kueche", "housekeeping", "bfd", "rezeption"];
export const ROLES: readonly AppRole[] = ["admin", "kitchen_lead", "staff"];
export const CONTRACTS: readonly string[] = ["VZ", "TZ"];

export type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];

export type EmployeeForm = {
  displayName: string;
  department: Department;
  role: AppRole;
  contract: string;
  sollDay: string;
  sollMonth: string;
  reason: string;
};

export const EMPTY_EMPLOYEE_FORM: EmployeeForm = {
  displayName: "",
  department: "rezeption",
  role: "staff",
  contract: "VZ",
  sollDay: "08:00",
  sollMonth: "160:00",
  reason: "",
};

export type SaveEmployeeArgs = Database["public"]["Functions"]["save_employee"]["Args"];

export type EmployeeFormResult =
  { ok: true; args: Omit<SaveEmployeeArgs, "p_id"> } | { ok: false; error: string };

// Comme parseTime, mais les heures peuvent dépasser 23 (Soll mensuel, ex. 160:00).
export function parseDuration(value: string): number | null {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(value.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function initialEmployeeForm(employee: EmployeeRow | undefined): EmployeeForm {
  if (!employee) {
    return EMPTY_EMPLOYEE_FORM;
  }
  return {
    displayName: employee.display_name,
    department: employee.department,
    role: employee.role,
    contract: employee.contract,
    sollDay: formatDuration(employee.soll_min_day),
    sollMonth: formatDuration(employee.soll_min_month),
    reason: "",
  };
}

export function buildEmployeeArgs(form: EmployeeForm): EmployeeFormResult {
  if (form.reason.trim() === "") {
    return { ok: false, error: de.employees.reasonRequired };
  }
  const name = form.displayName.trim();
  const day = parseDuration(form.sollDay);
  const month = parseDuration(form.sollMonth);
  if (name === "" || day === null || day > 1440 || month === null) {
    return { ok: false, error: de.employees.invalid };
  }
  return {
    ok: true,
    args: {
      p_display_name: name,
      p_department: form.department,
      p_role: form.role,
      p_contract: form.contract,
      p_soll_min_day: day,
      p_soll_min_month: month,
      p_reason: form.reason.trim(),
    },
  };
}

export function employeeErrorMessage(error: { code?: string } | null): string {
  return rpcErrorMessage(error?.code);
}

export function sortEmployees(rows: readonly EmployeeRow[]): EmployeeRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.active) - Number(a.active) || a.display_name.localeCompare(b.display_name, "de"),
  );
}
