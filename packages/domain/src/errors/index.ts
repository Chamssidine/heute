// Codes d'erreur (SQLSTATE) levés par les RPC d'écriture ; miroir de
// supabase/migrations/20260929150000_write_rpcs_audit.sql.
export const RPC_ERROR_CODES = {
  reasonRequired: "HT001",
  forbidden: "HT002",
} as const;

export type RpcErrorCode = (typeof RPC_ERROR_CODES)[keyof typeof RPC_ERROR_CODES];

export const RPC_ERROR_MESSAGES: Readonly<Record<RpcErrorCode, string>> = {
  HT001: "Bitte einen Grund angeben.",
  HT002: "Dazu fehlt dir die Berechtigung.",
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
