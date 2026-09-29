# ADR 0007 – Masquage et agrégats par fonctions SECURITY DEFINER

Statut : accepté · Décision D6 du PLAN §3

## Décision

`team_shifts` et `meal_totals` sont des fonctions `SECURITY DEFINER` avec `set search_path = ''`, `EXECUTE` réservé à `authenticated`.

## Pourquoi

Seul moyen propre de montrer « Abwesend » et des totaux sans exposer le détail (la RLS filtre des lignes, pas des valeurs).

## Alternatives écartées

Masquage côté client (fuite du motif d'absence).

## Compromis

Pas de Realtime sur ces fonctions : rafraîchissement au retour sur l'écran.
