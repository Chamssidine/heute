import type { Database } from "@heute/domain";
import { de } from "../strings/de.ts";

export type AppRole = Database["public"]["Enums"]["app_role"];

const ADMIN_ROLES: readonly AppRole[] = ["admin", "kitchen_lead"];

export function canAccessAdmin(role: AppRole): boolean {
  return ADMIN_ROLES.includes(role);
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
