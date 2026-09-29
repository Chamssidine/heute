# ADR 0003 – Monorepo npm workspaces

Statut : accepté · Décision D2 du PLAN §3

## Décision

Monorepo **npm workspaces**, sans Turborepo ni Nx.

## Pourquoi

Trois paquets : un orchestrateur n'apporte rien ; npm est livré avec Node ; le layout hoisté évite les soucis de Metro.

## Alternatives écartées

Turborepo, Nx, pnpm.

## Compromis

Installations plus lentes que pnpm.
