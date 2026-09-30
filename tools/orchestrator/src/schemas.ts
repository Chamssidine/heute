import type { ErrorCode } from "./decisions.ts";
import type { AgentFinalMessage } from "./store.ts";

// Schémas JSON pour les messages d'agent et de relecteur.
// Version 1 : agent (fin de run) + relecteur.

export const AGENT_FINAL_MESSAGE_SCHEMA = {
  v: 1,
  type: "object",
  required: ["v"],
  properties: {
    v: { type: "number", const: 1, description: "Version du schéma" },
    id: { type: "number", description: "Numéro d'issue" },
    s: { enum: ["ok", "fail", "blocked"], description: "État final normalisé" },
    ok: { type: "boolean", description: "true si tout compile et teste OK" },
    e: {
      type: "array",
      items: { type: "string" },
      description: "Codes d'erreur (SCOPE_VIOLATION, TEST_FAIL, etc.)",
    },
    val: {
      type: "object",
      properties: {
        tc: { type: "boolean", description: "typecheck OK" },
        li: { type: "boolean", description: "lint OK" },
        lint: { type: "boolean", description: "lint OK" },
        te: { type: "boolean", description: "tests OK" },
        test: { type: "boolean", description: "test OK" },
      },
      description: "Statut des validations",
    },
    pr: { type: "number", description: "Numéro de PR créée (optionnel)" },
  },
  additionalProperties: false,
} as const;

export function validateAgentFinalMessage(obj: unknown): {
  valid: boolean;
  message?: AgentFinalMessage;
  error?: string;
} {
  if (typeof obj !== "object" || obj === null) {
    return { valid: false, error: "Pas un objet JSON" };
  }

  const o = obj as Record<string, unknown>;

  if (typeof o.v !== "number" || o.v !== 1) {
    return { valid: false, error: "v doit être 1" };
  }

  if (o.s !== undefined && o.s !== "ok" && o.s !== "fail" && o.s !== "blocked") {
    return { valid: false, error: "s doit valoir ok, fail ou blocked" };
  }

  if (o.s === undefined && typeof o.ok !== "boolean") {
    return { valid: false, error: "s ou ok est obligatoire" };
  }

  const errors = Array.isArray(o.e) ? o.e.filter((e): e is ErrorCode => typeof e === "string") : [];
  const validations =
    typeof o.val === "object" && o.val !== null ? (o.val as Record<string, unknown>) : {};
  const status =
    o.s === "ok" || o.s === "fail" || o.s === "blocked" ? o.s : o.ok === true ? "ok" : "fail";
  const message: AgentFinalMessage = {
    v: 1,
    s: status,
  };
  if (typeof o.id === "number") message.id = o.id;
  if (typeof o.pr === "number") message.pr = o.pr;
  if (errors.length > 0) message.e = errors;
  message.val = {
    tc: validations.tc as boolean | undefined,
    li: (validations.li ?? validations.lint) as boolean | undefined,
    te: (validations.te ?? validations.test) as boolean | undefined,
  };

  return {
    valid: true,
    message,
  };
}

export const REVIEWER_RESPONSE_SCHEMA = {
  v: 1,
  type: "object",
  required: ["approve", "comments"],
  properties: {
    approve: {
      type: "boolean",
      description: "true si prêt à merger, false si corrections demandées",
    },
    comments: {
      type: "array",
      items: { type: "string" },
      description: "Liste de commentaires/corrections, vide si approve=true",
    },
  },
  additionalProperties: false,
} as const;

export function validateReviewerResponse(obj: unknown): {
  valid: boolean;
  approve?: boolean;
  comments?: string[];
  error?: string;
} {
  if (typeof obj !== "object" || obj === null) {
    return { valid: false, error: "Pas un objet JSON" };
  }

  const o = obj as Record<string, unknown>;

  if (typeof o.approve !== "boolean") {
    return { valid: false, error: "approve doit être true ou false" };
  }

  if (!Array.isArray(o.comments)) {
    return { valid: false, error: "comments doit être un tableau" };
  }

  if (!o.comments.every((c) => typeof c === "string")) {
    return { valid: false, error: "comments doit contenir que des strings" };
  }

  const extra = Object.keys(o).filter((k) => k !== "approve" && k !== "comments");
  if (extra.length > 0) {
    return { valid: false, error: `Champs non autorisés : ${extra.join(", ")}` };
  }

  return { valid: true, approve: o.approve, comments: o.comments };
}
