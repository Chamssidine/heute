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

## Principes d'un design moderne (à appliquer, pas à citer)

- **Hiérarchie visuelle** : un seul titre de page, des sous-titres de taille et de graisse décroissantes, un seul bouton principal par zone. Échelle typographique fixe (ex. 12 / 14 / 16 / 20 / 24 px), 2 graisses au plus.
- **Espace** : grille de 4/8 px, marges généreuses autour des blocs, densité serrée seulement dans les tableaux. Alignement strict : tout se cale sur la même grille.
- **Couleur sobre** : neutres pour 90 % de l'écran, une seule couleur d'accent (`primary`) pour l'action, les couleurs de statut réservées au sens (succès, alerte, erreur). Fond `bg`, cartes `surface`.
- **Surfaces** : rayons homogènes (thème), bordures fines plutôt que grosses ombres, une ombre douce seulement pour ce qui flotte (menus, dialogues).
- **Mise en page** : navigation latérale fixe (icône + libellé, page active nette), en-tête de page (titre, description, actions à droite), contenu dans une largeur maximale lisible ; jamais de mur de texte.
- **Composants cohérents** : boutons, champs, tableaux, badges, dialogues viennent d'une seule bibliothèque (Mantine) réglée par le thème ; un composant réutilisé deux fois va dans `components/ui/`.
- **Formulaires** : libellé au-dessus du champ, aide sous le champ, erreur en ligne près du champ (pas seulement une alerte globale), champs alignés, action principale à droite.
- **Retour d'information** : chaque action a un retour visible (état de chargement du bouton, notification de réussite ou d'erreur) ; jamais de clic sans effet visible.
- **Micro-interactions** : survol et focus visibles, transitions courtes (≤ 200 ms), désactivées avec `prefers-reduced-motion`.
- **Thème clair et sombre** : les deux passent par les tokens (schéma de couleurs de Mantine) ; aucun composant ne dépend d'une couleur codée pour un seul thème.
- **Accessibilité WCAG 2.2 AA** : contraste, focus jamais supprimé, ordre de tabulation logique, cibles ≥ 32 px, libellés pour tous les champs et boutons-icônes.
- **Pas de nouvelle dépendance** (icônes, animations…) sans issue « contexte » : utilise Mantine et du SVG intégré.

## Avant de finir chaque tâche

Relis ton travail avec cette liste, et écris dans ta réponse celles qui restent non tenues : hiérarchie claire ? grille 4/8 respectée ? aucun hex hors `theme/` ? états chargement, vide et erreur stylés ? focus visible ? thèmes clair et sombre ? textes inchangés ?

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
