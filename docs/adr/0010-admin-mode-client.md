# ADR 0010 – Admin Next.js en mode client

Statut : accepté · Décision D9 du PLAN §3

## Décision

supabase-js dans le navigateur ; pas de SSR de données ni de Server Actions.

## Pourquoi

Même modèle d'accès aux données que le mobile ; évite la gestion des cookies d'auth SSR.

## Alternatives écartées

Rendu serveur avec cookies d'authentification.

## Compromis

On n'exploite pas le rendu serveur (inutile derrière un login).
