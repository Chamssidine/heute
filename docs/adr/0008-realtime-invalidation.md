# ADR 0008 – Realtime comme signal d'invalidation

Statut : accepté · Décision D7 du PLAN §3

## Décision

Realtime sert de signal d'invalidation (refetch), jamais de source de données.

## Pourquoi

Une seule voie de lecture, pas de fusion de cache à maintenir.

## Alternatives écartées

Appliquer les événements Realtime directement au cache.

## Compromis

Un aller-retour réseau de plus par événement (négligeable à 10 utilisateurs).
