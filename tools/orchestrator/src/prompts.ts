import type { AgentConfig } from "./config.ts";

// Agents have no GitHub access at all: the orchestrator gives them the issue text, and pushes
// and opens the PR itself once its own checks pass. A failed check never costs a PR round trip.
const AUTONOMY = `Tu travailles sans humain : ne pose aucune question et n'attends aucune réponse.
En cas d'ambiguïté, choisis l'option la plus simple conforme aux règles, et note-la dans ta réponse finale.
Si AGENTS.md ou ton brief parlent de PR, de push ou de gh, ignore ces passages : l'orchestrateur s'en charge.
Tu n'as accès ni à GitHub, ni au réseau : ne lance ni \`gh\`, ni \`git push\`, ni \`git fetch\`.
Seules ces commandes shell sont autorisées, toute autre est refusée (même node -v ou npm -v) :
git status|diff|log|show|add|rm|mv|commit|switch|checkout|restore|rev-parse|branch|stash,
npm run typecheck|lint|test|format, npm test, npm install, npm ci, npx prettier|eslint|tsc|expo.
Lance une seule commande à la fois, sans ; && | ni redirection : les enchaînements sont refusés.
Si une commande est refusée, n'essaie pas de la contourner : mentionne-la dans ta réponse finale.
Pour explorer le code, utilise tes outils de fichiers (lister un dossier, chercher, lire un fichier),
jamais une commande shell (ls, dir, Get-ChildItem, cat, Get-Content, findstr) : elles sont refusées
et un refus peut arrêter ton travail.
Pour supprimer ou déplacer un fichier suivi : \`git rm\` ou \`git mv\`. N'utilise jamais \`git reset\`.`;

const FINAL = `Termine par UNE ligne JSON, sans rien après :
{"v":1, "id": <issue>, "s": "ok"|"fail"|"blocked", "e": [codes d'erreur si s != "ok"], "val": {"tc": true|false, "li": true|false, "te": true|false}}`;

// What the orchestrator says to an agent is one JSON object (machine-read, compact), after the
// fixed rules: the rules never change, so they stay first and cache well. Free text is only the
// issue's own spec (a field of the object) and the humans' words in the dashboard.
const PROTOCOL = `Le message de l'orchestrateur est un objet JSON, à la fin de ce texte. Champs :
t "task" (nouvelle tâche) | "fix" (corrections demandées) | "check" (tes vérifications ont échoué) ;
id = numéro de tâche ; dir = ton dossier ; brief = ton brief ; branch = ta branche ; base = branche de base
et baseRef = son nom complet pour git ; resume = true si ta branche existe déjà ;
spec = texte de la tâche ; errors = liste {src, msg} à corriger ; round = numéro de tentative.
Lis d'abord AGENTS.md et ton brief.
Selon t :
- task : si resume est faux, ta branche n'existe pas, crée-la (\`git switch -c <branch>\`) sur la base déjà extraite ;
  sinon elle est déjà extraite, regarde \`git log --oneline <baseRef>..HEAD\` et \`git status\`, reprends là où tu t'es arrêté.
  Réalise la tâche décrite par spec, uniquement dans tes chemins autorisés, et commite après chaque étape qui compile.
- fix : ta branche est extraite. Corrige chaque élément de errors, uniquement dans tes chemins autorisés
  (annule toute modification hors périmètre). Un conflit de fusion avec la base : \`git status\`, édite les
  fichiers pour retirer les marqueurs de conflit, \`git add\`, \`git commit\`.
- check : les vérifications de l'orchestrateur échouent sur ton travail. Corrige uniquement errors.
Dans tous les cas : lance typecheck, lint et tests jusqu'à ce qu'ils passent, commite, et ne pousse pas.
Si la tâche est impossible ou contradictoire, dis pourquoi en une phrase avant le JSON final, avec "s":"blocked".`;

interface AgentMessage {
  t: "task" | "fix" | "check";
  id: number;
  agent: AgentConfig;
  agentId: string;
  branch: string;
  base: string;
  baseRef: string;
}

function envelope(m: AgentMessage, extra: Record<string, unknown>): string {
  const payload = {
    v: 1,
    t: m.t,
    id: m.id,
    dir: m.agent.worktree,
    brief: m.agent.brief,
    branch: m.branch,
    base: m.base,
    baseRef: m.baseRef,
    ...extra,
  };
  return `Tu es l'agent ${m.agentId} (${m.agent.name}) du projet Heute.
${AUTONOMY}
${PROTOCOL}
${FINAL}

Message : ${JSON.stringify(payload)}`;
}

export interface TaskPromptInput {
  agentId: string;
  agent: AgentConfig;
  issue: number;
  branch: string;
  base: string;
  baseRef: string;
  resume: boolean;
  spec: string;
}

export function taskPrompt(i: TaskPromptInput): string {
  return envelope(
    {
      t: "task",
      id: i.issue,
      agent: i.agent,
      agentId: i.agentId,
      branch: i.branch,
      base: i.base,
      baseRef: i.baseRef,
    },
    {
      resume: i.resume,
      spec: i.spec.trim() || "(texte indisponible : lis les critères dans le brief)",
    },
  );
}

export interface FixPromptInput {
  agentId: string;
  agent: AgentConfig;
  issue: number;
  pr: number;
  branch: string;
  base: string;
  baseRef: string;
  errors: { src: string; msg: string }[];
}

export function fixPrompt(i: FixPromptInput): string {
  return envelope(
    {
      t: "fix",
      id: i.issue,
      agent: i.agent,
      agentId: i.agentId,
      branch: i.branch,
      base: i.base,
      baseRef: i.baseRef,
    },
    { pr: i.pr, resume: true, errors: i.errors },
  );
}

// The orchestrator's own checks failed on the agent's commits: same branch, same folder,
// with the exact output, before anything is handed over.
export interface CheckPromptInput {
  agentId: string;
  agent: AgentConfig;
  issue: number;
  branch: string;
  base: string;
  baseRef: string;
  errors: { src: string; msg: string }[];
  round: number;
}

export function localFixPrompt(i: CheckPromptInput): string {
  return envelope(
    {
      t: "check",
      id: i.issue,
      agent: i.agent,
      agentId: i.agentId,
      branch: i.branch,
      base: i.base,
      baseRef: i.baseRef,
    },
    { resume: true, errors: i.errors, round: i.round },
  );
}

export function reviewPrompt(pr: number, diffFile: string, issueFile: string | undefined): string {
  return `Tu es le relecteur du projet Heute. Tu ne modifies rien et tu n'exécutes AUCUNE commande shell.
Le dossier courant contient le code de la PR #${pr}. Lis avec tes outils de fichiers :
- le diff de la PR : ${diffFile}${
    issueFile ? `\n- l'issue et ses critères d'acceptation : ${issueFile}` : ""
  }
- AGENTS.md (règles du projet), et tout fichier du dépôt utile pour comprendre le contexte.
Vérifie : critères d'acceptation remplis, pas de secret,
pas de donnée réelle, pas de donnée de santé dans un push ou un log, pas de code inutile ou hors sujet.
Ne commente pas le style si le lint passe.

Réponds UNIQUEMENT par un objet JSON, sans texte autour :
{"approve": true|false, "comments": ["correction précise et actionnable", "…"]}
« approve » vaut false seulement pour un défaut réel qui doit être corrigé avant le merge.`;
}
