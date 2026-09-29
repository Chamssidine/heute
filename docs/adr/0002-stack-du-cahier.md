# ADR 0002 – Stack du cahier conservée

Statut : accepté · Décision D1 du PLAN §3

## Décision

Supabase (Frankfurt), Expo + TypeScript, Next.js.

## Pourquoi

Android **et** iOS avec un seul code ; iOS compilé dans le cloud (EAS Build) sans Mac ; règles métier partagées en TypeScript avec l'admin.

## Alternatives écartées

Kotlin/Compose natif (Android seulement, iOS = 2ᵉ app en Swift) ; Kotlin Multiplatform + Compose Multiplatform (Mac + Xcode obligatoires pour iOS, règles métier dupliquées côté admin) ; Flutter (même contrainte Mac, 3ᵉ langage).

## Compromis

Dépendance forte à Supabase et à Expo (acceptable pour un prototype). Le développeur maîtrise React et Next.js : seuls les écarts React Native restent à apprendre (primitives, styles, EAS).
