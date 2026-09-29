# Composants – Heute mobile

---

## 5. Composants

Composants partagés dans `components/ui/` : seulement ceux utilisés par au moins 2 features. Les autres restent dans leur feature.

| Composant | Rôle | Points clés | États à gérer |
|---|---|---|---|
| `Screen` | Conteneur de tout écran de données | Safe areas, tirer pour rafraîchir, titre + `SyncStamp` | loading (squelette, pas de spinner plein écran), empty, error (« Erneut versuchen »), offline (bandeau), unauthorized (→ Anmeldung) |
| `SyncStamp` | « Stand HH:MM » | Heure de la dernière requête réussie | normal, hors ligne |
| `Card` | Regroupe une information | `surface`, `radius.md`, bordure, padding 16 ; titre en `heading` | – |
| `Button` | Action | Variantes primary / secondary / ghost ; hauteurs 48 et 56 ; libellé = verbe | normal, pressé, désactivé, chargement (spinner intégré, largeur conservée) |
| `StatusButton` | Fait avancer une tâche (§4.1) | 56 dp, pleine largeur, libellé selon le statut | + erreur (rollback + message) |
| `Chip` | Type, statut ou régime | Hauteur 28, `radius.full`, icône optionnelle + texte ; non interactif | – |
| `CountTile` | Nombre de Gäste pour un repas | Libellé `label` + chiffre `display` + chips régimes | normal, modifié (`marker`), « Kein Mittagessen » (tuile `surfaceMuted` avec le texte à la place du chiffre) |
| `Banner` | Message persistant | Variantes info / warning / danger ; icône + texte | – |
| `EmptyState` | Liste vide | Icône + une phrase + action optionnelle | – |
| `Snackbar` | Confirmation annulable | En bas, 5 s, action « Rückgängig » | – |
| `ListRow` | Ligne de liste | Hauteur ≥ 56, contenu principal à gauche, chip ou heure à droite | – |
