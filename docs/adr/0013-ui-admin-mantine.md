# ADR 0013 – Bibliothèque UI de l'admin : Mantine

Statut : accepté · Décision D12 du PLAN §3

## Décision

Une **seule** bibliothèque de composants accessibles pour l'admin : **Mantine**. UI mobile : composants React Native maison (5–6).

## Pourquoi

Vitesse sur l'admin ; composants accessibles et clients par défaut (compatibles avec l'ADR 0010) ; le mobile a peu de composants.

## Alternatives écartées

Aucune bibliothèque (plus lent) ; plusieurs bibliothèques (incohérence).

## Compromis

Dépendance UI côté admin. Les composants Mantine ne sont pas des Server Components.
