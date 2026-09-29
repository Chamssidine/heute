# Heute

Planning, repas, ménage et notifications pour le personnel d'une auberge de jeunesse : un écran « Heute » mobile mis à jour en temps réel, plus une admin web.

> **Données fictives uniquement.** Ce dépôt est un prototype : aucune donnée réelle (nom, photo, document) ne doit y figurer.

## Documentation

- [road.md](road.md) : cahier des charges et exigences.
- [PLAN.md](PLAN.md) : plan, décisions d'architecture et répartition des tâches.
- [AGENTS.md](AGENTS.md) : règles communes aux agents.

## Structure

- `apps/mobile` : Expo, TypeScript (à venir, P0-04).
- `apps/admin` : Next.js (à venir, P0-06).
- `packages/domain` : TypeScript pur, partagé.
- `supabase/` : Postgres, RLS, Edge Functions (à venir).

## Commandes

```
npm install
npm run typecheck
npm run lint
npm test
```
