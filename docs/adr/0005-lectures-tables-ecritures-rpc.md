# ADR 0005 – Lectures par tables, écritures par RPC

Statut : accepté · Décision D4 du PLAN §3

## Décision

**Lectures** : tables et vues protégées par RLS. **Écritures métier** : RPC Postgres (`save_shift`, `delete_shift`, `set_task_status`).

## Pourquoi

Raison obligatoire, périmètre par rôle et restriction de colonnes garantis côté serveur, en un seul endroit.

## Alternatives écartées

Écritures directes sur les tables (la RLS ne restreint pas les colonnes).

## Compromis

Un peu de SQL à tester (pgTAP).
