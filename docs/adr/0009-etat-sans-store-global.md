# ADR 0009 – État séparé par nature, sans store global

Statut : accepté · Décision D8 du PLAN §3

## Décision

Serveur = TanStack Query (+ persistance AsyncStorage) ; session = Supabase Auth (stockage sécurisé) ; réseau = NetInfo branché sur `onlineManager` ; préférences et « dernière vue » = AsyncStorage ; UI = état local.

## Pourquoi

Chaque catégorie a une seule source de vérité. TanStack Query gère loading/error/stale/refetch et la lecture hors ligne sans code maison.

## Alternatives écartées

Store global (Redux, Zustand).

## Compromis

Quatre dépendances, justifiées par l'exigence hors ligne.
