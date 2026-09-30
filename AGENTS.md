# AGENTS.md – Heute

Règles communes à tous les agents (Claude, Gemini). Court par conception : ≤ 6 000 caractères, taille vérifiée par la CI.

Ce fichier ne contient ni avancement ni historique : ils vivent dans les issues. Le « pourquoi » des règles est dans `docs/adr/`.

## Projet

- App « Heute » : planning, repas, ménage et notifications pour le personnel d'une auberge de jeunesse. Prototype avec **données fictives uniquement**.
- Monorepo npm workspaces :
  - `apps/mobile` : Expo, TypeScript ;
  - `apps/admin` : Next.js ;
  - `packages/domain` : TypeScript pur, partagé ;
  - `supabase/` : Postgres, RLS, Edge Functions.

## Démarrer une tâche

1. Une session = une issue. Lis ton brief (`docs/agents/<rôle>.md`), puis l'issue.
2. Ne lis que les fichiers cités par l'issue et leurs dépendances directes. Pas de parcours global du dépôt.
3. N'écris que dans les chemins autorisés par ton brief et par l'issue.
4. Si tu dois changer un contrat, sortir de tes chemins ou ajouter une dépendance : arrête-toi et explique pourquoi dans l'issue.

## Code

- TypeScript strict : pas de `any`, pas de `@ts-ignore`, pas de `!` sans justification.
- Diff minimal : aucun refactoring, reformatage ou renommage hors de la tâche.
- Pas d'abstraction « au cas où ». Une petite duplication vaut mieux qu'une mauvaise abstraction.
- Identifiants en anglais ; textes d'interface en allemand ; documentation en français.
- Heures stockées en minutes depuis minuit, dates `YYYY-MM-DD` (Europe/Berlin). Affichage `HH:MM`, jamais de décimales.
- Erreurs explicites, jamais de `catch` silencieux. Les messages utilisateur viennent de `packages/domain`.
- Commentaires : seulement le « pourquoi » non évident.
- N'utilise que des API présentes dans les versions du `package.json`. En cas de doute, lis la documentation officielle de cette version ; n'invente rien.

## Sécurité et données

- Jamais de donnée réelle : ni nom, ni photo, ni document de l'auberge.
- Aucun secret dans le code, les logs, les issues ou les PR. Tu travailles uniquement avec le Supabase local.
- Les droits sont garantis par la base (RLS, fonctions SQL), jamais par l'interface seule.
- Aucune donnée de santé dans un push ou un log : jamais « krank », jamais de détail d'allergie.
- Les collègues voient « Abwesend », jamais le motif d'une absence.

## Contrats

Toute modification passe par une PR relue par l'agent qui consomme le contrat.

- `supabase/migrations/**` et `packages/domain/src/database.types.ts` (généré, jamais modifié à la main).
- Signatures et codes d'erreur des fonctions SQL (`packages/domain/src/errors`).
- Payload push `{ type, route, params }` (`packages/domain`).
- `apps/mobile/src/features/*/model.ts` (de L vers U).

## Avant de livrer

- Tu n'as accès ni à GitHub ni au réseau : ni `gh`, ni `git push`, ni PR. Tu commites en local sur ta branche ; l'orchestrateur revalide, pousse et ouvre la PR.
- Dans le workspace touché : `npm run typecheck`, `npm run lint`, `npm test`, jusqu'à ce que tout passe. Si `supabase/` change : `supabase test db`.
- Branche `<a|a2|l|u>/i<numéro d'issue>`, une tâche par branche.
- Ta réponse finale : ce qui change, fichiers, validations, questions ouvertes.
- Tu ne merges jamais.

## Réponses

Français, compact : Fait / Fichiers / Vérification / Important (seulement si nécessaire).

## Ce fichier

- N'écris jamais dans `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` ni dans les briefs. Propose un changement dans une issue « contexte ».
- Aucune règle du projet dans la mémoire automatique de ton outil : la mémoire du projet, c'est le dépôt.
