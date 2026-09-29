# Rédaction – Heute mobile

---

## 7. Rédaction

**Où vivent les textes :**
- Libellés **métier** (codes → libellés : types de service, repas, régimes, statuts) : dans `packages/domain`, partagés avec l'admin.
- Textes d'**interface** : dans `strings/de.ts`.

### 7.1 Glossaire

| Concept | Libellé UI | Remarque |
|---|---|---|
| Service normal / TD / SEM | Dienst / Teildienst / Seminar | – |
| u / k / x | Urlaub / Krank / Frei | Pour les collègues : Abwesend / Abwesend / Frei |
| Statuts | Offen / In Arbeit / Erledigt | Actions : Starten, Fertig, Wieder öffnen, Rückgängig |
| Types de ménage | Abreise · Endreinigung / Bleiber · Zwischenreinigung | Comme sur le papier |
| Repas | Früh / Mittag / Abend | Titres complets : Frühstück, Mittagessen, Abendessen |
| Variantes | LP (Lunchpaket), GR (Grillen) | – |
| Régimes | VEG, vegan, MOS (ohne Schweinefleisch), AL (Allergien) | – |
| Absence de repas | Kein Mittagessen / Kein Abendessen | Toujours écrit en toutes lettres (VG-03) |
| Fraîcheur | Stand 14:32 / Offline – Stand 14:32 / Geändert 14:05 | – |

### 7.2 Formats

`Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin' })`, avec des helpers dans `packages/domain` :

| Donnée | Format |
|---|---|
| Date courte | `Di, 30.09.` |
| Date longue | `Dienstag, 30. September` |
| Heure | `08:00` |
| Plage horaire | `08:00–16:30` (tiret demi-cadratin, sans espaces) |
| Durée | `8:00 Std.` |
| Total | `120:00 / 174:00 Std.` |

### 7.3 Messages

Structure : ce qui s'est passé + ce que je peux faire. Jamais de code technique.

| Situation | Texte |
|---|---|
| Hors ligne | « Keine Verbindung. Du siehst den Stand von 14:32. » |
| Échec d'enregistrement | « Speichern fehlgeschlagen. Bitte erneut versuchen. » |
| Session expirée | « Bitte melde dich erneut an. » |
| Liste vide (Aufgaben) | « Heute hast du keine Aufgaben. » |
| Liste vide (Küche) | « Für diesen Tag sind keine Gäste eingetragen. » |
| Permission de notification refusée | « Ohne Benachrichtigungen erfährst du Änderungen erst beim Öffnen der App. » |

**Push** (textes produits par `notify`, voir road.md) :
- « Dein Dienst am 30.09. wurde geändert: 08:00–16:30 »
- « Neue Aufgabe: Zimmer 412 – Abreise »
- « Abendessen heute: 13 → 25 Gäste »

Règle : jamais « krank », « Urlaub » ni un détail d'allergie dans un push.
