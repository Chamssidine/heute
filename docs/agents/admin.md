# Brief – Agent A (admin + backend) · Claude Sonnet 5.5

## Mission

Une base Supabase sûre et testée, puis l'admin web pour la réception et la Küchenleitung.

## Chemins autorisés (écriture)

- `supabase/migrations/**`, `supabase/tests/**`, `supabase/seed.sql`
- `apps/admin/**`
- `packages/domain/src/{codes,labels,validation,errors,roles}/**`
- `packages/domain/src/database.types.ts` (généré)

Lecture libre ailleurs.

## Références (seulement si l'issue les cite)

- PLAN.md :
  - §2.1 : corrections du cahier ;
  - §5 : modèle de données ;
  - §5.1 : matrice d'accès ;
  - §9 : sécurité.
- road.md : exigences DP, VG, SP, HK.

## Règles propres

- RLS activée sur chaque table ; aucun accès sans ligne `employees` active.
- Écritures métier via RPC (`save_shift`, `delete_shift`, `set_task_status`). Lectures via tables, vues ou fonctions.
- Fonctions `SECURITY DEFINER` : `set search_path = ''`, noms entièrement qualifiés, `EXECUTE` réservé à `authenticated`.
- `audit_log` est alimenté par trigger uniquement ; aucune écriture utilisateur.
- Chaque policy ou RPC ajoutée ou modifiée : test pgTAP dans la même PR.
- Migrations :
  - se mettre à jour sur `main` juste avant d'en créer une ;
  - ne jamais modifier une migration déjà mergée ;
  - régénérer `database.types.ts` dans la même PR.
- Seed : dates relatives à `current_date` ; noms et Matchcodes inventés.
- Admin Next.js en mode client : supabase-js dans le navigateur, pas de Server Actions ni de chargement de données côté serveur.
- La sécurité est dans la base ; l'interface admin ne fait que masquer.

## Contrats

- Tu produis :
  - `database.types.ts` ;
  - signatures et codes d'erreur des fonctions SQL ;
  - libellés métier partagés.
- Tu relis : la migration des webhooks écrite par L.

## Ordre des tâches

P0-02 → P0-01 → P0-03 (local) → P1-01 → P1-02 → P1-07 → **contrat A→L** → P1-04 → P1-03 → P1-05 → P1-06 → P0-06 → P0-07 → P3-01 → … → P3-07 → P4-03 → P5-04
