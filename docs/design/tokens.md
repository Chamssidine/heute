# Tokens et codes visuels – Heute mobile

---

## 3. Tokens

### 3.1 Couleurs – thème clair (v0.1)

Tous les rapports de contraste ont été calculés (WCAG 2.x) le 29.09.2026. Cibles : texte ≥ 4,5:1 ; bordures de champs et composants ≥ 3:1.

| Token | Valeur | Usage | Contraste |
|---|---|---|---|
| `bg` | `#F5F6F8` | Fond d'écran | – |
| `surface` | `#FFFFFF` | Cartes, listes, champs | – |
| `surfaceMuted` | `#EEF0F3` | Zones secondaires, jour « frei » | – |
| `border` | `#CDD2DA` | Séparateurs et bordures de cartes (décoratif) | – |
| `borderStrong` | `#8A94A3` | Bordures de champs de saisie | 3,1 sur `surface` |
| `text` | `#111827` | Texte principal | 17,7 sur `surface` · 16,4 sur `bg` |
| `textMuted` | `#4B5563` | Texte secondaire, « Stand » | 7,6 sur `surface` · 7,0 sur `bg` |
| `primary` | `#1D4ED8` | Boutons principaux, onglet actif, liens | 6,7 sur `surface` |
| `onPrimary` | `#FFFFFF` | Texte sur `primary` | 6,7 |
| `primarySoft` / `onPrimarySoft` | `#DBEAFE` / `#1E3A8A` | Fond sélectionné, chip « Dienst » | 8,5 |
| `success` | `#15803D` | Icône et texte « Erledigt » | 5,0 sur `surface` |
| `successSoft` / `onSuccessSoft` | `#DCFCE7` / `#14532D` | Carte ou chip « Erledigt » | 8,3 |
| `warning` | `#B45309` | Icône et texte « In Arbeit », hors ligne | 5,0 sur `surface` |
| `warningSoft` / `onWarningSoft` | `#FEF3C7` / `#78350F` | Chip « In Arbeit », bandeaux d'avertissement | 8,1 |
| `danger` | `#B91C1C` | Erreurs, allergies | 6,5 sur `surface` |
| `dangerSoft` / `onDangerSoft` | `#FEE2E2` / `#7F1D1D` | Chip AL, bandeau d'erreur | 8,2 |
| `neutralSoft` / `onNeutralSoft` | `#E5E7EB` / `#374151` | Chip « Offen », « Abwesend » | 8,3 |
| `marker` / `onMarker` | `#FDE047` / `#111827` | Valeur modifiée (Textmarker) | 13,5 |

**Couleurs des chips métier** (fond / texte) :

| Chip | Fond | Texte | Contraste | Icône |
|---|---|---|---|---|
| Dienst | `#DBEAFE` | `#1E3A8A` | 8,5 | `briefcase-outline` |
| Teildienst (TD) | `#EDE9FE` | `#4C1D95` | 9,2 | `call-split` |
| Seminar (SEM) | `#CCFBF1` | `#115E59` | 6,7 | `school-outline` |
| Abwesend / Urlaub / Krank | `#E5E7EB` | `#374151` | 8,3 | `calendar-remove-outline` (identique pour les trois) |
| Frei | `surfaceMuted` + bordure pointillée `border` | `textMuted` | 7,0 | `calendar-blank-outline` |
| VEG | `#DCFCE7` | `#14532D` | 8,3 | `leaf` |
| vegan | `#ECFCCB` | `#365314` | 8,0 | `sprout` |
| MOS | `#E5E7EB` | `#1F2937` | 11,9 | aucune (volontairement neutre) |
| AL | `#FEE2E2` | `#7F1D1D` | 8,2 | `alert-circle-outline` |
| LP | `#FFEDD5` | `#7C2D12` | 8,2 | `food-takeout-box-outline` |
| GR | `#FEF3C7` | `#78350F` | 8,1 | `grill-outline` |

Les noms d'icônes sont à vérifier dans le catalogue `@expo/vector-icons` (MaterialCommunityIcons) au moment de l'implémentation.

### 3.2 Couleurs – thème sombre (*Should*, hors v0.1)

v0.1 force le thème clair (`userInterfaceStyle: "light"` dans la config Expo). Les tokens étant sémantiques, le thème sombre consistera à ajouter un second jeu de valeurs. Valeurs de base déjà vérifiées :

| Token | Valeur | Contraste sur `surface` sombre (`#171D25`) |
|---|---|---|
| `bg` / `surface` / `surfaceMuted` | `#0F141A` / `#171D25` / `#202833` | – |
| `border` / `borderStrong` | `#2E3846` / `#6B7686` | – / 3,7 |
| `text` / `textMuted` | `#F2F4F7` / `#A9B2C0` | 15,4 / 7,9 |
| `primary` / `onPrimary` | `#8AB4FF` / `#0B1220` | 8,1 / 9,0 |
| `success` / `warning` / `danger` | `#4ADE80` / `#FBBF24` / `#F87171` | 9,7 / 10,2 / 6,1 |
| `marker` / `onMarker` | inchangés | 13,5 |

Les chips du thème sombre seront définies et vérifiées quand le thème sera implémenté.

### 3.3 Typographie

Police système (Roboto sur Android, SF Pro sur iOS) : pas de police à télécharger, meilleure lisibilité et respect natif de la taille de texte. `allowFontScaling` reste activé partout.

| Token | Taille / interligne | Graisse | Usage |
|---|---|---|---|
| `display` | 40 / 48 | 700 | Chiffres des Gäste |
| `title` | 24 / 32 | 700 | Titre d'écran |
| `heading` | 20 / 28 | 600 | Titre de carte ou de section |
| `body` | 17 / 24 | 400 | Texte courant |
| `bodyStrong` | 17 / 24 | 600 | Horaires, numéros de chambre |
| `label` | 15 / 20 | 600 | Boutons, chips |
| `caption` | 13 / 18 | 400 | « Stand », métadonnées (taille minimale autorisée) |

- Chiffres : `fontVariant: ['tabular-nums']` pour les horaires, compteurs et totaux (ils ne « sautent » pas quand ils changent).
- Pas de texte en capitales forcées ni en italique.
- Mots allemands longs (« Zwischenreinigung ») : retour à la ligne autorisé, `android_hyphenationFrequency="normal"`. Jamais de troncature (`numberOfLines`) sur un horaire, un chiffre ou un numéro de chambre.

### 3.4 Espacements, formes, élévation

| Token | Valeur | Usage |
|---|---|---|
| `space.1` … `space.6` | 4 · 8 · 12 · 16 · 24 · 32 | Grille de 4 dp |
| Marge d'écran | 16 | Gauche et droite, toujours |
| Espace entre cartes | 12 | – |
| Padding de carte | 16 | – |
| `radius.sm` | 8 | Boutons, champs |
| `radius.md` | 12 | Cartes |
| `radius.full` | 999 | Chips |
| Bordure | 1 dp `border` | Cartes, listes |

**Élévation** : aucune ombre sur les cartes, seulement des bordures. Le rendu est identique sur Android et iOS sans code spécifique. Seules les feuilles modales gardent l'ombre native de la plateforme.

### 3.5 Zones tactiles et mouvement

- Toute cible tactile ≥ **48 × 48 dp**, espacement ≥ 8 dp. Utiliser `hitSlop` si le visuel est plus petit.
- Actions principales (statut de tâche, « Anmelden ») : hauteur **56 dp**, pleine largeur, dans la moitié basse de l'écran.
- Animations : 150–200 ms, uniquement pour le retour d'état (pression, changement de statut). Pas de compteur animé sur les chiffres.
- Si « réduire les animations » est activé (`AccessibilityInfo.isReduceMotionEnabled`) : aucune animation.
- Retour haptique au changement de statut (`expo-haptics`) : *Could*.

---

## 4. Codes visuels métier

### 4.1 Statut des tâches (HK-03)

| Statut | Chip | Bouton d'action | Après l'action |
|---|---|---|---|
| Offen | `neutralSoft`, icône `circle-outline` | **Starten** (primaire) | → In Arbeit |
| In Arbeit | `warningSoft`, icône `progress-clock` | **Fertig** (primaire) | → Erledigt + snackbar « Rückgängig » pendant 5 s |
| Erledigt | `successSoft`, icône `check-circle` | « Wieder öffnen » (discret) | → Offen |

Pas de boîte de confirmation : la snackbar « Rückgängig » est plus rapide et évite les erreurs de doigt. Les tâches erledigt descendent en bas de la liste.

### 4.2 Types de service (DP-01, DP-02)

- **Mon planning** : chip selon le type (Dienst, Teildienst, Seminar, Urlaub, Krank, Frei). Urlaub et Krank gardent le style neutre « Abwesend », seul le libellé diffère.
- **Collègues (Team)** : uniquement « Abwesend » ou « Frei ». La fonction `team_shifts()` ne renvoie de toute façon pas le motif.

### 4.3 Régimes et variantes (VG-02)

L'ordre d'affichage est toujours le même : **VEG · vegan · MOS · AL · LP · GR**. Le code est suivi du nombre (« VEG 8 »). Un appui long ou la légende de l'écran Küche affiche le libellé complet.

- **MOS** s'affiche « ohne Schweinefleisch » dans la légende : présenté comme un régime, sans symbole ni couleur qui l'associerait à une religion.
- **AL** : seul chip de style `danger`. Le détail indique les types d'allergènes et leur nombre, jamais de nom.

### 4.4 Changements (VG-05) et fraîcheur des données

- **Valeur modifiée** depuis ma dernière consultation : fond `marker` sur la valeur + ligne « Geändert 14:05 · vorher 13 ». Le marquage disparaît quand l'écran a été consulté puis quitté, pas au bout d'un délai.
- **« Stand HH:MM »** : `caption` `textMuted` dans l'en-tête de chaque écran de données.
- **Hors ligne** : bandeau `warningSoft` en haut, icône `cloud-off-outline`, texte « Offline – Stand 14:32 ». Le contenu reste affiché en dessous.
