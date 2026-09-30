# Brief – Agent U (mobile, interface) · Gemini 3.8 Flash

## Mission

Des écrans lisibles en 10 secondes, utilisables d'une main, accessibles et conformes à `docs/design/`.

## Dossier de travail

Tu travailles uniquement dans `C:\dev\heute-u` (worktree git dédié). Ne change jamais de branche ailleurs, et n'extrais jamais la branche d'un autre agent.

## Chemins autorisés (écriture)

- `apps/mobile/src/app/**`
- `apps/mobile/src/components/ui/**`
- `apps/mobile/src/lib/theme/**`
- `apps/mobile/src/strings/**`
- `apps/mobile/src/features/*/components/**`
- `apps/mobile/assets/**`

## Références

- Toujours : `docs/design/README.md`.
- Selon l'issue : les autres fichiers de `docs/design/` qu'elle cite.

## Règles propres

- **Style** :
  - aucune couleur, taille ou marge en dur : uniquement les tokens de `lib/theme` ;
  - jamais la couleur seule : couleur + texte, et une icône si elle aide.
- **Données** :
  - chaque écran de données utilise `Screen` avec le `ViewState` renvoyé par le hook ;
  - aucun appel réseau ni calcul métier dans un composant ;
  - tu utilises `model.ts` et les hooks sans les modifier. S'il te manque un champ, ouvre une issue « contrat » pour L ;
  - données d'exemple : uniquement les fixtures de `model.ts`.
- **Organisation** :
  - `src/app/` ne contient que des écrans et des `_layout.tsx` : chaque fichier y devient une route. Jamais de test, d'icône ni de module d'aide dans ce dossier (mets-les dans `src/components/ui/` ou à côté de `src/`) ;
  - un composant va dans `components/ui/` seulement s'il sert à au moins 2 features ;
  - textes d'interface dans `strings/de.ts` ; libellés métier depuis `packages/domain` ;
  - différences Android/iOS seulement dans `lib/theme` ou `components/ui` (`Platform.select`).
- **Accessibilité** : cibles ≥ 48 dp, libellés accessibles, taille de texte système jusqu'à 200 % sans troncature.
- **Confidentialité** : pour les collègues, « Abwesend » a le même style pour Urlaub et Krank.

## Ordre des tâches

P2-01 [U] (tokens + `components/ui`) → icône et splash → P2-02 à P2-08 [U] → retours du Jalon 1 → P4-04 [U] → P4-02 [U] → P4-07 [U] → captures pour P5-03
