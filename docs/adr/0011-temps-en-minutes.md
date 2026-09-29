# ADR 0011 – Temps en minutes depuis minuit

Statut : accepté · Décision D10 du PLAN §3

## Décision

Heures en `smallint` (minutes depuis minuit) ; dates locales `date` (`YYYY-MM-DD`, Europe/Berlin) ; pas de service traversant minuit en v0.1. Affichage `HH:MM`, jamais de décimales.

## Pourquoi

Pas d'erreur de décimales ; pas de problème de changement d'heure en journée.

## Alternatives écartées

Types `time` / `timestamptz`, heures décimales.

## Compromis

Services de nuit hors périmètre.
