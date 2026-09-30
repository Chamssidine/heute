import type { Database } from "@heute/domain";
import { de } from "../strings/de.ts";

export type AppRole = Database["public"]["Enums"]["app_role"];

const ADMIN_ROLES: readonly AppRole[] = ["admin", "kitchen_lead"];

export function canAccessAdmin(role: AppRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export type EmployeeRow = {
  display_name: string;
  role: AppRole;
  active: boolean;
};

export type ProfileState =
  | { status: "error"; message: string }
  | { status: "forbidden"; displayName: string }
  | { status: "ready"; displayName: string; role: AppRole };

// Pas de ligne employees active : aucun accès (la RLS l'impose aussi côté base).
export function profileFromEmployee(row: EmployeeRow | null): ProfileState {
  if (!row || !row.active) {
    return { status: "error", message: de.accountDisabled };
  }
  if (!canAccessAdmin(row.role)) {
    return { status: "forbidden", displayName: row.display_name };
  }
  return { status: "ready", displayName: row.display_name, role: row.role };
}

export function loginErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid.*credentials|invalid_grant|invalid login/i.test(message)) {
    return de.login.invalidCredentials;
  }
  if (/network|offline|failed to fetch|abort|timeout/i.test(message)) {
    return de.login.networkError;
  }
  return de.login.genericError;
}
