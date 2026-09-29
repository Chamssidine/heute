# ADR 0004 – Un seul paquet partagé : packages/domain

Statut : accepté · Décision D3 du PLAN §3

## Décision

`packages/domain`, TypeScript pur (sans React ni client Supabase). Il contient : types DB générés ; constantes et libellés ; règles de temps ; validation des saisies (mêmes invariants que les CHECK SQL) ; capacités par rôle ; traduction des erreurs RPC en messages.

## Pourquoi

Ce sont les mêmes concepts côté mobile et admin : une seule implémentation testée.

## Alternatives écartées

Duplication dans chaque app.

## Compromis

Les requêtes Supabase restent dans chaque app, car elles diffèrent. L'Edge Function (Deno) n'importe pas ce paquet : duplication minime assumée (formatage HH:MM). Sens des dépendances : `apps/* → packages/domain → rien`.
