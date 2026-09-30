# Brief – Agent AD (admin, design) · Claude Sonnet 5.5

## Mission

Une admin web lisible sur écran de bureau pour la réception et la Küchenleitung : dense, claire, et cohérente avec l'app mobile. Tu changes **l'apparence**, jamais la logique.

## Dossier de travail

Ton dossier est le champ `dir` du message de l'orchestrateur (worktree git dédié). Ne change jamais de branche ailleurs, et n'extrais jamais la branche d'un autre agent.

## Chemins autorisés (écriture)

- `apps/admin/src/theme/**` (à créer : le thème Mantine)
- `apps/admin/src/components/**` (présentation : JSX, styles, props d'affichage)
- `apps/admin/src/app/layout.tsx`, `apps/admin/src/app/globals.css`
- `apps/admin/public/**`

## Interdit

- `apps/admin/src/lib/**` (données, calculs, appels Supabase), `apps/admin/src/strings/**` (textes, gérés par A et A2), tout ce qui est hors `apps/admin/`.
- Changer un comportement : un calcul, un appel de fonction, un droit, une validation. Si une tâche l'exige, arrête-toi et dis-le dans ta réponse.

## Références

- `docs/design/README.md` §2 (identité) et §0 règles 2, 3, 4, 6.
- `docs/design/tokens.md` §3 (couleurs, typographie, espacements) et §4 (codes visuels : statut des tâches, types de service, régimes). Ce sont les mêmes sur l'admin.
- Le brief des agents de données : `docs/agents/admin.md` (pour savoir ce qu'ils gèrent).

## Règles propres

- **Un seul thème** : `createTheme` de Mantine dans `theme/`, alimenté par les tokens. Aucune couleur, taille ou marge en dur dans un composant, et aucun code hexadécimal hors de `theme/`.
- **Jamais la couleur seule** : statut, service, régime = couleur **et** texte (icône si elle aide). Contraste ≥ 4,5:1.
- **Tableaux denses, façon Excel** (Dienstplan, Speiseplan) : en-tête collant, dimanches marqués, chiffres tabulaires (`font-variant-numeric: tabular-nums`), colonnes alignées, lignes de 32 px au plus.
- **États stylés** : chargement (Skeleton), vide, erreur : chacun a une apparence définie et un message lisible.
- **Clavier et lecteurs d'écran** : focus visible, libellés, rôles `aria-*` sur les grilles ; cibles ≥ 32 px.
- **Bureau d'abord** (≥ 1024 px) ; la tablette doit rester utilisable ; le mobile n'est pas requis.
- **Santé** : les vues destinées à la Küchenleitung n'affichent jamais un motif d'absence.
- **Diff minimal** : ne déplace ni ne renomme de fichiers ; une tâche = un aspect visuel.
- **Tu ne peux pas lancer l'app.** Dans ta réponse finale, décris pour chaque écran modifié ce qui change (avant, après) et les tokens utilisés : c'est ce que l'humain relira.

## Validations

`npm run typecheck`, `npm run lint`, `npm test`, jusqu'à ce que tout passe.
