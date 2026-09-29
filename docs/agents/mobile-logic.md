# Brief – Agent L (mobile, logique) · Gemini 3.8 Flash

## Mission

Fournir à l'interface des données fiables : session, cache hors ligne, hooks typés, temps réel, push.

## Dossier de travail

Tu travailles uniquement dans `C:\dev\heute-l` (worktree git dédié). Ne change jamais de branche ailleurs, et n'extrais jamais la branche d'un autre agent.

## Chemins autorisés (écriture)

- `apps/mobile/src/lib/{supabase,query,network,realtime,push}/**`
- `apps/mobile/src/features/*/{model,api,hooks}.ts`
- `apps/mobile/app.config.*`, `apps/mobile/eas.json`
- `packages/domain/src/{time,format}/**`
- `supabase/functions/notify/**`
- migration des webhooks (relue par A)

## Références (seulement si l'issue les cite)

- PLAN.md : §3 (D8, D10), §4.2 (flux)
- `docs/design/tokens.md` §4.4
- `docs/design/copy.md` §7.2 et §7.3

## Règles propres

- **État** :
  - état serveur = TanStack Query ; pas de store global ;
  - Realtime ne fait qu'invalider des requêtes ;
  - chaque hook renvoie un `ViewState<T>` : `loading | empty | error | offline | unauthorized | success`.
- **Contrat avec U** :
  - livre d'abord `model.ts` (type + fixture) et un hook provisoire qui renvoie la fixture ;
  - remplace-le ensuite par la vraie requête, sans changer sa signature.
- **Réseau** :
  - aucun appel Supabase dans un composant : tout passe par `api.ts`, puis `hooks.ts` ;
  - retry automatique pour les lectures seulement ; timeout sur chaque requête.
- **Session** : stockage sécurisé (pattern de la doc Supabase pour React Native) ; jamais de token dans un log.
- **Push dans l'app** :
  - permission demandée après la connexion, avec une explication ;
  - renouvellement du token ;
  - un tap sur une notification est une entrée non fiable : valider la route, les paramètres et la session.
- **Fonction `notify`** :
  - vérifier le secret du webhook ;
  - notifier seulement pour les dates ≥ aujourd'hui ;
  - aucun motif d'absence ni détail d'allergie dans le message ;
  - supprimer les tokens invalides.
- **Règles de temps** : fonctions pures + tests Vitest. Le mois fictif saisi dans l'Excel sert de résultat attendu.
- **Ordre de décision** : API Expo → librairie compatible Expo → Expo Module → code natif (dernier recours, à signaler).
- **Test du push** : toujours dans une development build, jamais dans Expo Go.

## Ordre des tâches

P0-04 → P0-05 (code) → P1-08 → P2-01 [L] → P2-02 à P2-08 [L] (`model.ts` + hook provisoire d'abord, puis hook réel) → P4-04 [L] → P4-05 → P4-06 → P4-01 → P4-02 [L] → P4-07 [L] → P5-01 (profil EAS)
