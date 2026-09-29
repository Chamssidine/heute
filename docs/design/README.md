# Charte mobile – Heute

Pour l'agent **U** (interface mobile). L'agent **L** ne lit que `tokens.md` §4.4 et `copy.md` §7.2–§7.3.

Ce dossier complète [PLAN.md](../../PLAN.md) (D11, D12, P2-01). Tout écart passe par une PR qui modifie d'abord ce dossier. Chaque fichier fait au plus 12 000 caractères.

Les numéros de section (§0 à §9) sont conservés d'un fichier à l'autre.

| Fichier | Contenu | Quand le lire |
|---|---|---|
| README.md | §0 règles, §1 contexte, §2 identité, §9 implémentation | Toujours (U) |
| [tokens.md](tokens.md) | §3 tokens, §4 codes visuels métier | Thème, composants, tout écran |
| [components.md](components.md) | §5 composants partagés | Tâches sur `components/ui` |
| [screens.md](screens.md) | §6 maquettes des écrans | L'écran de l'issue |
| [copy.md](copy.md) | §7 glossaire, formats, messages | Textes, formats, push |
| [a11y.md](a11y.md) | §8 checklist d'accessibilité | Avant chaque PR d'écran |

---

## 0. Les 6 règles à retenir

1. **Lisible en 10 secondes, d'une main.** L'info principale de chaque écran se voit sans défiler ; les actions sont dans la moitié basse de l'écran.
2. **Jamais la couleur seule.** Chaque statut, type ou régime = couleur **+** texte (et icône quand elle aide).
3. **Une absence reste une absence.** Pour les collègues, Urlaub et krank ont le même libellé (« Abwesend ») et le même style : ni la couleur ni l'icône ne doivent trahir le motif.
4. **Ce qui a changé se voit.** Style « Textmarker » jaune, comme le surligneur sur le papier, avec l'ancienne et la nouvelle valeur.
5. **On sait toujours de quand date l'info.** « Stand HH:MM » sur chaque écran de données, et un bandeau visible hors ligne.
6. **Aucune couleur ni taille en dur.** Tout passe par les tokens (§3), aucun code hexadécimal hors de `lib/theme/`.

---

## 1. Contexte d'usage

| Situation | Conséquence pour le design |
|---|---|
| Housekeeping au 4ᵉ étage, chariot, parfois des gants | Boutons de statut de 56 dp en pleine largeur, zones tactiles ≥ 48 dp, pas de geste fin (pas de swipe obligatoire) |
| Cuisine : mains occupées, coup d'œil rapide à distance de bras | Chiffres des Gäste en très grand (40 sp), chiffres à chasse fixe, contraste élevé |
| Lumière variable (cave, couloir, extérieur) | Contraste ≥ 4,5:1 partout, 7:1 visé pour le texte courant |
| Volontaires BFD dont l'allemand n'est pas forcément la langue maternelle | Allemand simple, phrases courtes, mêmes mots que sur les documents papier (Früh, Mittag, Abend, Abreise, Bleiber) |
| Réseau faible dans les étages | États offline explicites, pas d'écran bloqué sur un spinner |
| Téléphone personnel, paramètres variés | Taille de texte système respectée jusqu'à 200 %, safe areas, portrait et paysage sans casse |

---

## 2. Identité

- **Nom affiché** : « Heute ». Sous-titre sur l'écran de connexion : « Jugendherberge Musterberg » (fictif).
- **Aucun élément DJH** (logo, bandeau, slogan, couleurs de la charte DJH) : le dépôt est public.
- **Ton** : tutoiement (« Dein Dienst », « Du siehst den Stand von 14:32 »), comme dans les messages de road.md. Neutre, factuel, sans humour ni emoji.
- **Icône de l'app** : pictogramme blanc (soleil levant sur une ligne d'horizon, « heute ») sur fond `primary`.
  - Android : icône adaptative (pictogramme dans la zone sûre de 66 %) et variante monochrome pour les icônes à thème d'Android 13+.
  - iOS : 1024 px sans transparence.
- **Splash** : fond `bg`, icône centrée, sans texte. Configuré via `expo-splash-screen`.

---

## 9. Implémentation

```
apps/mobile/src/
├─ lib/theme/          colors.ts · typography.ts · spacing.ts · index.ts (exporte `theme`)
├─ components/ui/      Screen · SyncStamp · Card · Button · StatusButton · Chip
│                      CountTile · Banner · EmptyState · Snackbar · ListRow
└─ features/<feature>/components/
                       composants propres à la feature (ShiftRow, TaskCard, MealGroupRow…)
```

- Styles avec `StyleSheet.create` et les tokens ; aucun code hexadécimal ni taille « magique » hors de `lib/theme/`.
- Pas de bibliothèque d'UI (PLAN D12). Dépendances autorisées :
  - `@expo/vector-icons` (inclus avec Expo) ;
  - `react-native-safe-area-context` (fourni avec expo-router) ;
  - `expo-haptics` (*Could*).
- Différences de plateforme (ombres de feuille modale, retours haptiques) : uniquement dans `lib/theme/` ou `components/ui/`, via `Platform.select`. Jamais dans les features.
- Coût : tokens + composants `ui/` sont inclus dans **P2-01** (+1 h, voir PLAN).
