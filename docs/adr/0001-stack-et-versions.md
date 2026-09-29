# ADR 0001 – Stack et versions

Statut : accepté · Date : 2026-09-29 · Décision liée : D1

## Versions vérifiées (documentation officielle, 2026-09-29)

| Composant                             | Version                                                                | Source                                                          |
| ------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Node.js (LTS actif : v24 « Krypton ») | 24.21.0                                                                | https://nodejs.org/en/about/previous-releases                   |
| Expo SDK                              | 57.0.0 (React Native 0.86, React 19.2.3)                               | https://docs.expo.dev/versions/latest/                          |
| Next.js                               | 16.3.6 (Node ≥ 20.9)                                                   | https://nextjs.org/docs/app/getting-started/installation        |
| Supabase CLI                          | 2.118.0                                                                | https://github.com/supabase/cli/releases/latest                 |
| supabase-js                           | 2.117.2                                                                | https://github.com/supabase/supabase-js/releases/latest         |
| Mantine (`@mantine/core`)             | 9.6.3 (registre npm ; le guide Next.js ne cite pas de numéro de version) | https://mantine.dev/guides/next/                                |

Les versions exactes s'écrivent dans les `package.json` au moment de chaque installation ; ce tableau fixe la ligne majeure.

## Points vérifiés

- **Push dans Expo Go** : non supporté. La documentation Expo écrit : « You must use a development build to use push notifications since the capability is not built into Expo Go » (https://docs.expo.dev/push-notifications/what-you-need-to-know/). Cela vaut pour Android **et** iOS : la formulation « Android seulement » de PLAN A8 est à corriger. Development build EAS dès la phase 0.
- **Clé publique Supabase** : `publishable` (`sb_publishable_…`). La clé `anon` (JWT) est l'ancien format ; Supabase annonce la dépréciation de `anon` et `service_role` d'ici fin 2026 (https://supabase.com/docs/guides/api/api-keys). Les deux restent exposables côté client, la sécurité venant de la RLS.
- **Import `@AGENTS.md` dans Gemini CLI** : syntaxe `@fichier.md` (chemins relatifs ou absolus, n'importe où dans le fichier), par exemple `@./components/instructions.md` (https://geminicli.com/docs/cli/gemini-md/). `GEMINI.md` contient donc `@AGENTS.md`, comme `CLAUDE.md`.
- **Bibliothèque UI de l'admin** : **Mantine** (ADR 0013). Ses composants sont des composants client, ce qui convient au mode client de l'admin (ADR 0010).

## Écarts assumés dans le dépôt

- **TypeScript épinglé en 6.0.3** : typescript-eslint 8.71 n'accepte pas TypeScript 6.1 et suivants. À relever quand typescript-eslint le permettra.
- **Lanceur de tests de `packages/domain`** : `node --test` (natif, sans dépendance), à la place de Vitest. À réévaluer si un besoin précis apparaît (mocks, couverture).
