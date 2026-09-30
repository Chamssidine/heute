// Codes d'erreur (SQLSTATE) levés par les RPC d'écriture ; miroir de
// supabase/migrations/20260929150000_write_rpcs_audit.sql et
// supabase/migrations/20260930100000_employee_write_rpcs.sql et
// supabase/migrations/20260930110000_room_task_write_rpcs.sql.
export const RPC_ERROR_CODES = {
  reasonRequired: "HT001",
  forbidden: "HT002",
  invalidEmployee: "HT003",
  lastAdmin: "HT004",
  selfDeactivation: "HT005",
  invalidRoomTask: "HT006",
  invalidAssignee: "HT007",
  taskDone: "HT008",
} as const;

export type RpcErrorCode = (typeof RPC_ERROR_CODES)[keyof typeof RPC_ERROR_CODES];

export const RPC_ERROR_MESSAGES: Readonly<Record<RpcErrorCode, string>> = {
  HT001: "Bitte einen Grund angeben.",
  HT002: "Dazu fehlt dir die Berechtigung.",
  HT003: "Bitte Name, Vertrag und Sollzeit prüfen.",
  HT004: "Der letzte aktive Admin kann nicht entfernt werden.",
  HT005: "Du kannst dich nicht selbst deaktivieren.",
  HT006: "Bitte Datum sowie Zimmer oder Bereich prüfen.",
  HT007: "Nur aktive Mitarbeitende im Housekeeping können zugewiesen werden.",
  HT008: "Eine erledigte Aufgabe kann nicht gelöscht werden.",
};

const UNKNOWN_RPC_ERROR_MESSAGE = "Etwas ist schiefgelaufen. Bitte versuche es erneut.";

export function isRpcErrorCode(code: string): code is RpcErrorCode {
  return Object.prototype.hasOwnProperty.call(RPC_ERROR_MESSAGES, code);
}

export function rpcErrorMessage(code: string | null | undefined): string {
  return code !== null && code !== undefined && isRpcErrorCode(code)
    ? RPC_ERROR_MESSAGES[code]
    : UNKNOWN_RPC_ERROR_MESSAGE;
}
