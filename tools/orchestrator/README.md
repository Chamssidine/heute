# Orchestrateur Heute

Outil local qui prépare et suit le travail des agents IA (Claude, Gemini, Codex…) sur les issues GitHub, avec un écran de surveillance.

**Principe : l'outil prépare, l'humain décide.** Lancer un agent et merger une PR se font uniquement par un clic dans l'écran. La relecture automatique est en lecture seule : elle valide, commente et pose un label.

## Démarrer

```bash
npm run orchestrator
```

Puis ouvrir http://127.0.0.1:4000. Le serveur n'écoute que sur la machine locale.

## Cycle d'une tâche

1. Une issue porte un label `agent:<id>` et, si besoin, une ligne `Dépend de #12, #14`.
2. **Lancer la prochaine tâche** : l'outil choisit la plus ancienne issue prête de l'agent, remet son worktree sur `origin/main`, puis lance sa CLI en mode non interactif sur la branche `<préfixe>/i<numéro>`.
3. À la fin, s'il trouve la PR, il lance la relecture automatique :
   - périmètre des fichiers ;
   - `typecheck`, `lint` et `test` dans `reviewWorktree` ;
   - avis du relecteur LLM choisi.
4. Il pose l'un de ces labels :
   - `prête` : tout passe ;
   - `changements` : défaut à corriger ;
   - `attente-humain` : contrat touché ou verdict illisible.
5. Toi :
   - **Merger** ;
   - ou **Renvoyer à l'agent**, avec une note si besoin ;
   - ou **Relire** avec un autre relecteur (Claude ou Codex).

## Antigravity CLI (`agy`) : agents L et U

L et U tournent avec la CLI d'Antigravity (`agy -p`), lancée par l'outil comme Claude. Aucun copier-coller.

- **Fichiers :** l'agent les modifie grâce à `--mode accept-edits`.
- **Commandes shell (git, npm, gh) :** en mode non interactif, agy ne peut pas demander la permission. Il refuse donc toute commande qui ne correspond pas à une règle `permissions.allow` de `%USERPROFILE%\.gemini\antigravity-cli\settings.json`. Les commandes refusées apparaissent dans le log de l'agent (« refusé : command »).
- **Relecteur `gemini` :** il tourne en `--mode plan`, en lecture seule.

Ne pas utiliser `--dangerously-skip-permissions`, qui autorise tout.

## Agents dans un IDE sans CLI (mode manuel)

Si un agent ne tourne que dans un IDE, il utilise l'adaptateur `manual` (CLI `antigravity-ide` dans `config.json`) : l'outil ne lance rien lui-même.

1. **Préparer la tâche** : l'outil choisit l'issue, remet le worktree de l'agent sur `origin/main` et affiche le prompt.
2. Ouvre ce worktree dans l'IDE (par exemple `C:\dev\heute-l` pour L), puis **Copier le prompt** et colle-le dans une nouvelle conversation d'agent.
3. L'outil détecte la fin tout seul, à chaque actualisation (toutes les 60 s) :
   - **tâche** : la PR apparaît sur la branche `<préfixe>/i<numéro>` ;
   - **correction** : un nouveau commit arrive sur la PR.

   Il lance alors la relecture automatique.

4. **Terminé** : à utiliser si l'agent s'est arrêté sans PR (la tâche passe en `bloquée`). **Annuler** libère la tâche.

Les tâches en attente survivent à un redémarrage de l'orchestrateur.

## Ajouter ou changer un LLM

- **Changer le modèle ou la CLI d'un agent** : modifier `agents.<id>.cli` et `model` dans `config.json`.
- **Ajouter un agent** : ajouter une entrée dans `agents` (worktree, label, préfixe de branche, brief, chemins autorisés).
- **Ajouter une nouvelle CLI** :
  1. écrire `src/adapters/<nom>.ts`, qui implémente `CliAdapter` (commande, résumé d'une ligne de sortie, texte final) ;
  2. l'ajouter au registre `src/adapters/index.ts` ;
  3. la déclarer dans `clis`.
- **Ajouter un relecteur** : entrée dans `reviewers`.
- **Permissions propres à une CLI** : `clis.<nom>.extraArgs.agent` / `.reviewer`, sans toucher au code.

| Adaptateur    | État                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `claude`      | Vérifié. Agents limités par `--allowedTools` : pas de `gh pr merge`, pas de `gh api`.                               |
| `antigravity` | Vérifié (agy 1.0.12). Fichiers en `accept-edits`, commandes limitées par les règles du settings.json d'Antigravity. |
| `manual`      | Pour les agents d'IDE sans CLI : prompt à coller, fin détectée sur GitHub.                                          |
| `gemini`      | Non utilisable ici : Google refuse Gemini CLI avec un compte gratuit individuel. Il faut une clé `GEMINI_API_KEY`.  |
| `codex`       | Écrit d'après la documentation de `codex exec`, CLI non installée ici : à tester.                                   |

## Sécurité

- **Gemini CLI**, si tu l'utilises un jour avec une clé API : en mode non interactif, il ne peut pas demander de confirmation, et il refuse de travailler dans un dossier non approuvé. Préfère une politique du Policy Engine plutôt que `--approval-mode yolo`, en l'ajoutant via `clis.gemini.extraArgs.agent`.
- **Agents d'IDE :** leurs permissions sont celles que tu règles dans l'IDE. L'outil n'y a aucun accès.

- **Aucun secret** n'est transmis aux agents par l'outil. Ils utilisent toutefois le `gh` connecté de la machine.
- **API locale :** les actions exigent l'en-tête `x-orchestrator: 1` et une origine locale. Une page web externe ne peut donc pas déclencher d'action.
- **Stockage :** état et logs dans `.state/`, ignoré par git.
