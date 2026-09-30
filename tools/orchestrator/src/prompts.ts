import type { AgentConfig } from "./config.ts";

// Agents have no GitHub access at all: the orchestrator gives them the issue text, and pushes
// and opens the PR itself once its own checks pass. A failed check never costs a PR round trip.
const AUTONOMY = `Tu travailles sans humain : ne pose aucune question et n'attends aucune réponse.
En cas d'ambiguïté, choisis l'option la plus simple conforme aux règles, et note-la dans ta réponse finale.
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

export function taskPrompt(
  id: string,
  agent: AgentConfig,
  issue: number,
  branch: string,
  resume = false,
  base = "main",
  issueText = "",
): string {
  const start = resume
    ? `La branche ${branch} est déjà extraite : elle contient le travail d'un run précédent interrompu.
Commence par \`git log --oneline origin/${base}..HEAD\` et \`git status\`, puis reprends là où il s'est arrêté,
sans refaire ce qui est fait.`
    : `origin/${base} est déjà extrait, arbre propre. Crée ta branche : \`git switch -c ${branch}\`.`;
  return `Tu es l'agent ${id} (${agent.name}) du projet Heute.
${AUTONOMY}

Dossier de travail : ${agent.worktree}.
Règles : AGENTS.md et ${agent.brief}. Lis-les d'abord.

Tâche : issue #${issue}. Son texte complet :
<<<
${issueText.trim() || "(texte indisponible : lis les critères dans le brief)"}
>>>

Étapes :
1. ${start}
2. Réalise l'issue, uniquement dans tes chemins autorisés. Commite après chaque étape qui compile.
3. Lance les validations demandées (typecheck, lint, tests) et corrige jusqu'à ce qu'elles passent toutes.
4. Commite le tout. Ne pousse pas et n'ouvre pas de PR : l'orchestrateur revalide, pousse et ouvre la PR.
5. ${FINAL}

Si l'issue est impossible ou contradictoire : explique pourquoi en une phrase avant le JSON, avec "s":"blocked".`;
}

export function fixPrompt(
  id: string,
  agent: AgentConfig,
  issue: number,
  pr: number,
  branch: string,
  feedback: string,
  base = "main",
): string {
  return `Tu es l'agent ${id} (${agent.name}) du projet Heute.
${AUTONOMY}

Dossier de travail : ${agent.worktree}. La branche ${branch} de la PR #${pr} est déjà extraite.
Règles : AGENTS.md et ${agent.brief}. Tâche d'origine : issue #${issue}.

La relecture demande ces corrections :
${feedback}

Étapes :
1. Corrige, uniquement dans tes chemins autorisés. Si un fichier hors périmètre a été modifié, annule ce changement.
   Si un conflit de fusion avec ${base} est signalé, résous-le : \`git status\`, édite les fichiers
   (supprime les marqueurs de conflit), \`git add\`, \`git commit\`.
2. Relance les validations (typecheck, lint, tests) jusqu'à ce qu'elles passent.
3. Commite. Ne pousse pas : l'orchestrateur revalide et pousse.
4. ${FINAL}`;
}

// The orchestrator's own checks failed on the agent's commits: same branch, same folder,
// with the exact output, before anything reaches GitHub.
export function localFixPrompt(
  id: string,
  agent: AgentConfig,
  issue: number,
  branch: string,
  problems: string,
  round: number,
): string {
  return `Tu es l'agent ${id} (${agent.name}) du projet Heute.
${AUTONOMY}

Dossier de travail : ${agent.worktree}. Ta branche ${branch} est déjà extraite (issue #${issue}).
Règles : AGENTS.md et ${agent.brief}.

Les vérifications de l'orchestrateur échouent sur ton travail (tentative ${round}) :
${problems}

Corrige uniquement cela, relance les validations concernées, puis commite. Ne pousse pas.
${FINAL}`;
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
