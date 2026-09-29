import type { AgentConfig } from "./config.ts";

const AUTONOMY = `Tu travailles sans humain : ne pose aucune question et n'attends aucune réponse.
En cas d'ambiguïté, choisis l'option la plus simple conforme aux règles, et note-la dans la PR.
Lance une seule commande à la fois, sans ; && | ni redirection : les enchaînements sont refusés.
Appelle \`gh\` par son nom, sans chemin complet. Si une commande est refusée, n'essaie pas de la
contourner : note-la dans la PR (ou dans l'issue si tu ne peux pas ouvrir de PR).
Pour explorer le code, utilise tes outils de fichiers (lister un dossier, chercher, lire un fichier),
jamais une commande shell (ls, dir, Get-ChildItem, cat, Get-Content, findstr) : elles sont refusées
et un refus peut arrêter ton travail.`;

export function taskPrompt(id: string, agent: AgentConfig, issue: number, branch: string): string {
  return `Tu es l'agent ${id} (${agent.name}) du projet Heute.
${AUTONOMY}

Dossier de travail : ${agent.worktree} (origin/main est déjà extrait, arbre propre).
Règles : AGENTS.md et ${agent.brief}. Lis-les d'abord.
Tâche : issue #${issue}. Lis-la avec \`gh issue view ${issue}\`.

Étapes :
1. \`git switch -c ${branch}\`
2. Réalise l'issue, uniquement dans tes chemins autorisés.
3. Lance les validations demandées par l'issue.
4. \`git push -u origin ${branch}\`, puis \`gh pr create --base main --head ${branch}\`
   avec un titre « <ID>: … » et un corps qui commence par « Closes #${issue} »,
   suivi des fichiers modifiés et de la sortie des validations.
5. Arrête-toi. Ne merge jamais.

Si l'issue est impossible ou contradictoire : \`gh issue comment ${issue}\` avec la raison,
puis arrête-toi sans ouvrir de PR.`;
}

export function fixPrompt(
  id: string,
  agent: AgentConfig,
  issue: number,
  pr: number,
  branch: string,
  feedback: string,
): string {
  return `Tu es l'agent ${id} (${agent.name}) du projet Heute.
${AUTONOMY}

Dossier de travail : ${agent.worktree}. La branche ${branch} de la PR #${pr} est déjà extraite.
Règles : AGENTS.md et ${agent.brief}. Tâche d'origine : issue #${issue}.

La relecture demande ces corrections :
${feedback}

Étapes :
1. Corrige, uniquement dans tes chemins autorisés. Si un fichier hors périmètre a été modifié, annule ce changement.
2. Relance les validations de l'issue.
3. \`git push\`, puis \`gh pr comment ${pr}\` avec ce que tu as corrigé et la sortie des validations.
4. Arrête-toi. Ne merge jamais.`;
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
