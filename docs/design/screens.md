# Écrans – Heute mobile

---

## 6. Écrans

Barre d'onglets en bas, icône **et** libellé toujours visibles. Onglets selon le rôle (PLAN §4.3) :

| Onglet | Icône |
|---|---|
| Heute | `calendar-today` |
| Dienstplan | `calendar-month` |
| Team | `account-group` |
| Aufgaben | `broom` |
| Küche | `silverware-fork-knife` |
| Profil | `account-circle` |

Les maquettes ci-dessous utilisent des données fictives.

### 6.1 Heute

L'ordre des cartes dépend du rôle :
- **Housekeeping / BFD** : Mein Dienst → Meine Aufgaben → Gäste heute → Menü.
- **Küche / Küchenleitung** : Mein Dienst → Gäste heute (avec régimes et changements) → Menü.

```
Heute · Di, 30.09.                     Stand 14:32
──────────────────────────────────────────────────
Mein Dienst
08:00–16:30                              [Dienst]
──────────────────────────────────────────────────
Meine Aufgaben                        2 von 6 erledigt
Nächste: Zimmer 412 · 4. OG · Abreise
[                Alle Aufgaben                  ]
──────────────────────────────────────────────────
Gäste heute
  Früh 121     Mittag 38 · LP 80     Abend ▓25▓
──────────────────────────────────────────────────
Menü
Mittag  Chili con Carne · Veg: Chili sin Carne
Abend   Zitronenhähnchen · Veg: Gemüsebratling
Änderungen vorbehalten – bei Allergien Küchenpersonal fragen
```

« Nächste » = HK-04 (*Should*). En v0.1, la carte affiche la progression et le bouton « Alle Aufgaben ».

### 6.2 Aufgaben

Les tâches sont groupées par étage, puis triées par numéro de chambre ; les erledigt passent en bas.

```
Meine Aufgaben · Di, 30.09.            2 von 6 erledigt
4. OG
┌ Zimmer 412          Abreise · Endreinigung    [In Arbeit]
│ [                    Fertig                    ]
┌ Zimmer 414          Bleiber · Zwischenreinigung    [Offen]
│ [                    Starten                   ]
┌ Bäder 4. OG         Zone                           [Offen]
│ [                    Starten                   ]
Erledigt (2)
  Zimmer 410 · Zimmer 411                         ✓ Erledigt
```

### 6.3 Küche

Un sélecteur de jour (◀ Heute ▶) permet de voir les jours suivants.

```
Küche · Di, 30.09.                 ◀  Heute  ▶   Stand 14:32
[!] Änderungen vorbehalten – bei Allergien Küchenpersonal fragen
Früh      121
Mittag     38     LP 80
Abend    ▓ 25 ▓   Geändert 14:05 · vorher 13
          VEG 10 · vegan 2 · MOS 9 · AL 1
── Gruppen ─────────────────────────────────
MUSTERSCHULE/40001        Mittag LP 80 · Abend 68
  VEG 8 · MOS 4 · „1× Nudeln/Müsli"
TSV MUSTER/40002          Abend 12 · GR 12 (18:00)
  AL 1 (Laktose)
Einzelgäste_27+           Früh 3 · Abend 1
── Menü ─────────────────────────────────────
Mittag   Chili con Carne mit Nudeln
         Veg: Chili sin Carne · Nachspeise: Obstsalat
Abend    Zitronenhähnchen mit Kartoffeln
         Veg: Gemüsebratling · Nachspeise: Grießbrei
```

La ligne du total, en haut, reprend les lignes « Summe » que l'équipe surligne sur le papier. Le rappel sur les allergies (SP-02) est permanent, en `Banner` warning.

### 6.4 Team

```
Team · Di, 30.09.                          Stand 14:32
Küche
  Anna Beispiel        06:00–14:30
  Ben Muster           10:30–19:00
Housekeeping / BFD
  Clara Test           08:00–13:00 · 18:00–21:00   [TD]
Nicht da
  David Probe          Frei
  Eva Muster           Abwesend
```

### 6.5 Mein Dienstplan

Deux vues : Woche et Monat. Les durées sont en `H:MM Std.`, jamais en décimal (road.md : « 14,50 ≠ 14:30 »).

```
Mein Dienstplan                    [ Woche | Monat ]
Oktober     IST 120:00 / Soll 174:00 Std.   ▕██████░░░░▏
Mo 29.09.   06:00–14:30            [Dienst]      8:00
Di 30.09.   08:00–13:00            [TD]          8:00
            18:00–21:00
Mi 01.10.   —                      [Frei]        0:00
Do 02.10.   —                      [Seminar]     8:00
So 05.10.   06:00–14:30            [Dienst]     12:00  (Sonntag)
```

### 6.6 Anmeldung et Profil

```
                     Heute
           Jugendherberge Musterberg
E-Mail     [______________________________]
Passwort   [__________________________] (Anzeigen)
[                 Anmelden                  ]
Probleme? Frag an der Rezeption.
```

**Profil** : nom et rôle ; état des notifications (« Erlaubt » ou « Blockiert » + « In Einstellungen öffnen ») ; version de l'app ; « Abmelden ».
