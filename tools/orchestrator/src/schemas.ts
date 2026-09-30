// Schémas JSON pour les messages d'agent et de relecteur.
// Version 1 : relecteur uniquement.

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
    return { valid: false, error: 'approve doit être true ou false' };
  }

  if (!Array.isArray(o.comments)) {
    return { valid: false, error: 'comments doit être un tableau' };
  }

  if (!o.comments.every((c) => typeof c === "string")) {
    return { valid: false, error: 'comments doit contenir que des strings' };
  }

  const extra = Object.keys(o).filter(
    (k) => k !== "approve" && k !== "comments",
  );
  if (extra.length > 0) {
    return { valid: false, error: `Champs non autorisés : ${extra.join(", ")}` };
  }

  return { valid: true, approve: o.approve, comments: o.comments };
}
