// Schémas JSON pour les messages d'agent et de relecteur.
// Version 1 : agent (fin de run) + relecteur.

export const AGENT_FINAL_MESSAGE_SCHEMA = {
  v: 1,
  type: "object",
  required: ["v", "ok"],
  properties: {
    v: { type: "number", const: 1, description: "Version du schéma" },
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
        lint: { type: "boolean", description: "lint OK" },
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
  ok?: boolean;
  errors?: string[];
  validations?: { tc?: boolean; lint?: boolean; test?: boolean };
  error?: string;
} {
  if (typeof obj !== "object" || obj === null) {
    return { valid: false, error: "Pas un objet JSON" };
  }

  const o = obj as Record<string, unknown>;

  if (typeof o.v !== "number" || o.v !== 1) {
    return { valid: false, error: "v doit être 1" };
  }

  if (typeof o.ok !== "boolean") {
    return { valid: false, error: "ok doit être true ou false" };
  }

  const errors = Array.isArray(o.e) ? o.e.filter((e) => typeof e === "string") : [];
  const validations = typeof o.val === "object" && o.val !== null ? (o.val as Record<string, unknown>) : {};

  return {
    valid: true,
    ok: o.ok,
    errors: errors.length > 0 ? errors : undefined,
    validations: {
      tc: validations.tc as boolean | undefined,
      lint: validations.lint as boolean | undefined,
      test: validations.test as boolean | undefined,
    },
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

  const extra = Object.keys(o).filter(
    (k) => k !== "approve" && k !== "comments",
  );
  if (extra.length > 0) {
    return { valid: false, error: `Champs non autorisés : ${extra.join(", ")}` };
  }

  return { valid: true, approve: o.approve, comments: o.comments };
}
