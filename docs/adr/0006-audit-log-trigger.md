# ADR 0006 – audit_log générique par trigger

Statut : accepté · Décision D5 du PLAN §3

## Décision

Table `audit_log` remplie par trigger ; raison passée par `set_config('app.reason', …, true)` dans la RPC ; aucun droit d'écriture utilisateur.

## Pourquoi

Traçabilité inviolable, un seul mécanisme pour quatre tables (`shifts`, `meal_counts`, `menu_items`, `room_tasks`).

## Alternatives écartées

Une table d'historique par entité (`shift_changes`).

## Compromis

La raison n'est exigée que pour `shifts`. `audit_log` garde un instantané sans clé étrangère en cascade.
