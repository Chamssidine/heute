// Creating an agent from the dashboard: the request is validated here, in one pure function,
// before anything is written. What comes out is a normal AgentConfig, like those of config.json.
import { dirname, join } from "node:path";
import type { AgentConfig } from "./config.ts";

// What the dashboard sends. Everything except the first five is optional and defaulted.
export interface AgentSpec {
  id: string;
  name: string;
  cli: string;
  model: string;
  brief: string;
  allowedPaths: string[];
  label?: string;
  branchPrefix?: string;
  worktree?: string;
  effort?: AgentConfig["effort"];
  budgetUsd?: number;
}

export interface BuildContext {
  existing: Record<string, AgentConfig>;
  clis: Record<string, unknown>;
  repoDir: string;
  briefExists: (path: string) => boolean;
  // Models the chosen CLI offers; when known, nothing else is accepted.
  models?: readonly string[];
}

const ID = /^[A-Za-z][A-Za-z0-9]{0,5}$/;
const EFFORTS = ["low", "medium", "high", "max"];

export function buildAgent(
  spec: AgentSpec,
  ctx: BuildContext,
): { id: string; agent: AgentConfig } | { errors: string[] } {
  const errors: string[] = [];
  const id = spec.id?.trim() ?? "";
  const others = Object.entries(ctx.existing);

  if (!ID.test(id))
    errors.push("Identifiant : 1 à 6 caractères, lettres et chiffres, commence par une lettre");
  else if (others.some(([k]) => k.toLowerCase() === id.toLowerCase()))
    errors.push(`Identifiant « ${id} » déjà pris`);

  const name = spec.name?.trim() ?? "";
  if (name === "" || name.length > 40) errors.push("Nom : 1 à 40 caractères");
  if (!ctx.clis[spec.cli]) errors.push(`CLI inconnue : ${spec.cli}`);
  const model = spec.model?.trim() ?? "";
  if (model === "") errors.push("Modèle obligatoire");
  else if (ctx.models && ctx.models.length > 0 && !ctx.models.includes(model)) {
    errors.push(`Modèle « ${model} » non proposé par la CLI ${spec.cli}`);
  }

  const brief = spec.brief?.trim() ?? "";
  if (!/^docs\/agents\/[\w.-]+\.md$/.test(brief) || !ctx.briefExists(brief)) {
    errors.push("Brief : un fichier existant de docs/agents/");
  }

  const paths = (spec.allowedPaths ?? []).map((p) => p.trim()).filter(Boolean);
  if (paths.length === 0 || paths.length > 40) errors.push("Chemins autorisés : de 1 à 40");
  for (const p of paths) {
    if (p.includes("..") || p.startsWith("/") || /^[A-Za-z]:/.test(p) || p.includes("\\")) {
      errors.push(`Chemin refusé (relatif au dépôt, avec « / ») : ${p}`);
    }
  }

  const label = spec.label?.trim() || `agent:${id}`;
  const branchPrefix = (spec.branchPrefix?.trim() || id).toLowerCase();
  if (!/^[a-z][a-z0-9]*$/.test(branchPrefix))
    errors.push("Préfixe de branche : lettres minuscules et chiffres");
  if (others.some(([, a]) => a.label === label))
    errors.push(`Étiquette « ${label} » déjà utilisée`);
  if (others.some(([, a]) => a.branchPrefix === branchPrefix)) {
    errors.push(`Préfixe de branche « ${branchPrefix} » déjà utilisé`);
  }
  const worktree = spec.worktree?.trim() || join(dirname(ctx.repoDir), `heute-${id.toLowerCase()}`);
  if (others.some(([, a]) => a.worktree.toLowerCase() === worktree.toLowerCase())) {
    errors.push("Ce dossier de travail est déjà celui d'un autre agent");
  }
  if (spec.effort !== undefined && !EFFORTS.includes(spec.effort))
    errors.push("Effort : low, medium, high ou max");
  if (spec.budgetUsd !== undefined && !(spec.budgetUsd > 0 && spec.budgetUsd <= 20)) {
    errors.push("Budget : entre 0 et 20 $");
  }

  if (errors.length > 0) return { errors };
  return {
    id,
    agent: {
      name,
      cli: spec.cli,
      model: spec.model.trim(),
      worktree,
      label,
      branchPrefix,
      brief,
      allowedPaths: paths,
      ...(spec.effort ? { effort: spec.effort } : {}),
      ...(spec.budgetUsd ? { budgetUsd: spec.budgetUsd } : {}),
      created: true,
    },
  };
}
