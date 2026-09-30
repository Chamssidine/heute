# Orchestrateur Heute

Outil local qui fait travailler des agents IA (Claude, Gemini via `agy`, Codex…) sur les tâches du projet, vérifie leur travail, le relit, et te montre tout dans un écran de surveillance.

**Principe : l'outil travaille, l'humain décide de ce qui entre.** Les agents n'ont aucun accès à GitHub. Tu merges (un clic) ce qui entre dans `dev`, puis tu publies `dev` vers `main`. Tout le reste est automatique, avec des arrêts explicites (jamais silencieux).

## Démarrer et arrêter

```bash
npm run orchestrator
```

Puis ouvre http://127.0.0.1:4000 (le serveur n'écoute que sur la machine locale). Pour l'arrêter : Ctrl+C, ou fermer le processus `node src/main.ts`.

Variables utiles : `ORCHESTRATOR_PORT` (autre port) et `STATE_DIR` (autre dossier d'état) pour lancer une instance de test à côté de la vraie.

## Le circuit d'une tâche (mode local)

1. **La tâche** est une entrée de `.state/local.json` (importée des issues GitHub au premier démarrage), avec une étiquette `agent:<id>` et, si besoin, une ligne `Dépend de #12`.
2. **L'agent** reçoit un message JSON (voir « Protocole ») et travaille dans son dossier git dédié, sur la branche `<préfixe>/i<numéro>`. Il commite en local. Il n'a ni `gh`, ni `git push`, ni réseau.
3. **Vérifications de l'orchestrateur** sur ses commits : périmètre des fichiers, `typecheck`, `lint`, tests. En cas d'échec, l'agent corrige dans le même dossier avec la sortie exacte de l'erreur (2 tours), avant que rien ne soit transmis.
4. **PR locale** : tout est vert, elle est enregistrée dans `local.json`.
5. **Relecture** : l'orchestrateur fusionne `dev` dans la tête de la PR, rejoue les vérifications sur ce résultat (ce qui entrerait vraiment dans `dev`), puis un relecteur LLM rend un verdict JSON. Verdicts : `prête`, `changements`, `attente-humain` (un contrat est touché : migrations, `model.ts`, types générés…).
6. **Toi** : sur la carte, « Voir le diff », puis **Merger** (fusion squash dans `dev`, en local), ou **Renvoyer à l'agent**, ou **Relire**.
7. **Publication** : quand `dev` a de l'avance, l'orchestrateur pousse `dev` (un seul push) et ouvre **une** PR GitHub « Publier dev → main ». Tu la merges avec « Create a merge commit ».

Le mode GitHub historique (issues, étiquettes et PR sur GitHub) reste disponible avec `"mode": "github"`.

## Autopilote et garde-fous

Interrupteur « Autopilote » en haut de l'écran. Il relit les PR sans verdict, renvoie les corrections, lance l'agent suivant, redirige les PR vers `dev`, garde `dev` à jour avec `main` et maintient la PR de publication. **Il ne merge jamais.**

Il s'arrête, avec la raison affichée et un bouton « Reprendre », dans ces cas :

- 4 runs de suite sans PR ;
- budget du jour atteint (`autopilot.dailyBudgetUsd`) ;
- **la branche `dev` échoue déjà aux vérifications** (ce n'est alors pas la faute des agents : preuve affichée) ;
- quota d'un fournisseur épuisé (reprise à l'heure indiquée) ;
- budget d'une tâche dépassé (`taskBudgetUsd`) : bouton **« Étendre le budget (+1,50 $) »** sur la carte, sans toucher à la config ;
- 4 corrections sur une même PR, ou 3 relectures en échec : elle passe à l'humain.

Protections supplémentaires : un agent reste occupé pendant qu'on vérifie son travail ; les conflits avec `dev` sont détectés dès qu'une autre PR est mergée et la PR repart à son agent ; le travail d'un run coupé (redémarrage, quota) est gardé en commit « WIP ».

## L'écran

- **Statut de l'orchestrateur** : ce qu'il fait maintenant (relecture, vérification du travail d'un agent, fusion, synchronisation), les agents au travail, le prochain contrôle, et la raison quand il est au repos.
- **Progression** : « X sur Y tâches », pourcentage, reste, par agent et par phase.
- **À toi** : ce qui attend une décision (PR prêtes, contrats, budget, publication, autopilote en pause).
- **Agents** : une carte par agent avec sa tâche, sa progression, et en direct le nombre d'étapes, de fichiers modifiés et de commits.
- **Avancement** : tableau des tâches par état.

## Créer et gérer des agents

Bouton **« + Créer un agent »** : on part d'un agent existant (copie CLI, modèle, brief et périmètre) ou de zéro, puis on choisit :

- la CLI et le **modèle dans une liste** (celle d'`agy` vient de `agy models` ; pour Claude et Codex, elle est déclarée dans `clis.<cli>.models`) ;
- le **brief** (`docs/agents/*.md`) et les **chemins autorisés** (la partie du projet où il peut écrire) ;
- l'effort, le budget, et les **tâches à lui confier** : proposées d'après le « Modifier uniquement » de chaque issue (dans son périmètre, en partie, hors périmètre).

« Confier des tâches » réassigne à tout moment. « Supprimer l'agent » concerne ceux créés ici (enregistrés dans l'état) ; ceux de `config.json` se modifient dans le fichier. Un nouvel agent a besoin d'un brief : écris-le d'abord dans `docs/agents/`.

## Protocole (JSON pour la machine)

- **Message vers l'agent** : règles fixes d'abord, puis une ligne `Message : {…}` avec `t` (`task`, `fix`, `check`), `id`, `dir`, `brief`, `branch`, `base`, `baseRef`, `resume`, `spec`, `errors[{src,msg}]`, `round`.
- **Fin de run de l'agent** : une ligne `{"v":1,"id":…,"s":"ok|fail|blocked","e":[codes],"val":{"tc":…,"li":…,"te":…}}`. L'orchestrateur revalide quand même tout.
- **Verdict du relecteur** : `{"approve": true|false, "comments": [...]}`, validé strictement.
- **Codes d'erreur** stables, avec limites de réparation par code (`decisions.ts`).
- **État** : `.state/state.json` (runs, relectures, événements, rallonges de budget, agents créés), `.state/local.json` (tâches et PR), `.state/logs/` (sorties brutes). Tous ignorés par git.

## Configuration (`config.json`)

| Clé                                           | Rôle                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `mode`                                        | `local` ou `github`                                                                                           |
| `baseBranch`, `productionBranch`              | branche où les agents livrent (`dev`) et branche que l'humain publie (`main`)                                 |
| `mergeWorktree`, `reviewWorktree`             | dossiers git de l'orchestrateur (fusions ; relectures)                                                        |
| `taskBudgetUsd`                               | dépense maximale par tâche avant l'humain (défaut 1,5 $)                                                      |
| `autopilot`                                   | `launchAgents`, `autoFix`, `failureLimit`, `dailyBudgetUsd`                                                   |
| `refreshSeconds`, `runTimeoutMinutes`, `port` | rythme des contrôles, durée maximale d'un run, port                                                           |
| `clis`                                        | CLI disponibles : adaptateur, commande, `models`, `extraArgs`                                                 |
| `agents`                                      | agents : CLI, modèle, dossier, étiquette, préfixe de branche, brief, chemins autorisés, `effort`, `budgetUsd` |
| `reviewers`, `defaultReviewer`                | relecteurs LLM                                                                                                |
| `contractPaths`                               | chemins réservés à l'humain (contrats entre agents)                                                           |

Les agents `A`, `A2`, `L`, `U` sont déclarés ici ; ceux créés dans l'écran sont dans `.state/state.json`.

## CLI et adaptateurs

Ajouter une CLI : écrire `src/adapters/<nom>.ts` qui implémente `CliAdapter` (lancement, résumé d'une ligne de sortie, texte final, consommation, options d'effort), l'enregistrer dans `src/adapters/index.ts`, puis la déclarer dans `clis`.

| Adaptateur    | État                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `claude`      | Vérifié. Outils limités : pas de `gh`, pas de `git push/fetch/pull`.                                     |
| `antigravity` | Vérifié (agy 1.0.12) : fichiers en `accept-edits`, commandes limitées par les règles de `settings.json`. |
| `manual`      | Agents d'IDE sans CLI : prompt à coller, fin détectée dans l'état local.                                 |
| `gemini`      | Non utilisable avec un compte gratuit individuel (clé `GEMINI_API_KEY` nécessaire).                      |
| `codex`       | Écrit d'après la documentation de `codex exec`, non testé ici.                                           |

### Permissions d'`agy` (agents L, U, U3…)

En mode non interactif, `agy` refuse toute commande qui ne correspond pas à une règle `permissions.allow` de `%USERPROFILE%\.gemini\antigravity-cli\settings.json` (et un refus peut arrêter le run). Syntaxe vérifiée : `command(npm run test)` compare mot par mot le début ; pour `git` et `npx` il faut `command(regex:…)` sur la ligne entière ; priorité `deny` > `ask` > `allow`. Règles en place : `git` local seulement (`status|diff|log|show|add|rm|mv|commit|switch|checkout|restore|rev-parse|branch|stash`), `npm run typecheck|lint|test|format`, `npm test|install|ci`, `npx prettier|eslint|tsc|expo` ; **refusés** : tout `gh`, `git push|fetch|pull|remote|reset`. N'utilise jamais `--dangerously-skip-permissions`.

## Sécurité

- Les agents n'ont **aucun secret** et aucun accès à GitHub ; ils n'utilisent que la base Supabase locale.
- **API locale** : les actions exigent l'en-tête `x-orchestrator: 1` et une origine locale.
- **Merge dans `dev` et publication vers `main` : toujours un clic humain.** Les PR qui touchent `contractPaths` ne sont jamais considérées comme prêtes sans toi.
- Aucune donnée de santé dans les logs ni dans les messages.

## Dépannage

| Symptôme                                          | Cause probable et action                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `EADDRINUSE 127.0.0.1:4000` au démarrage          | un orchestrateur tourne déjà : l'arrêter (processus `node src/main.ts`) avant de relancer              |
| Autopilote « en pause : dev échoue déjà… »        | corriger `dev` (souvent un fichier mal formaté : `npx prettier --write .`), puis « Reprendre »         |
| Carte « Budget tâche dépassé »                    | « Étendre le budget » sur la carte                                                                     |
| « quota épuisé » / relectures en attente          | attendre l'heure de reprise affichée ; le quota Claude est partagé entre agents et relecteurs          |
| PR « Conflit de fusion avec dev »                 | rien à faire : elle repart à son agent                                                                 |
| L'app mobile ne charge plus sur le téléphone      | l'IP du PC a changé : mettre à jour `EXPO_PUBLIC_SUPABASE_URL` dans `apps/mobile/.env`, relancer Metro |
| Un agent reste des minutes sur « il lit le code » | normal au début ; sinon changer son modèle (les modèles « Flash » explorent beaucoup)                  |

## Tests

```bash
npm test -w tools/orchestrator
```

Les règles de décision, la création d'agents, les prompts, la validation des messages et la forge locale (sur un dépôt git jetable) sont testées.
