---
name: Tâche
about: Une tâche du PLAN pour un agent (≤ 2 500 caractères)
labels: ''
---

**Agent** : A | L | U
**Lire** : docs/agents/<rôle>.md, puis :
- Fichier 1 : <chemin complet ou section si mentionné>
- Fichier 2 : <chemin>
- (optionnel) Références : <liens vers PR, issues, ADR>

**Modifier uniquement** : <chemins glob ou liste>
**Ne modifier pas** : <contrats, fichiers générés, etc.>

**Contrat utilisé ou produit** : 
- Entrée : <types, signatures, structures>
- Sortie : <ce qui change>

**Critères d'acceptation** :
- [ ] Critère 1 (vérifiable)
- [ ] Critère 2
- [ ] Tests (npm test OK)
- [ ] Pas de données réelles ni secrets

**Valider avant la PR** : `npm run typecheck && npm lint && npm test`

**Livrer** : 
- Branche : `<a|l|u>/<ID>-<slug>`
- PR vers main avec titre `<ID>: …`
- Description : Closes #<ID>, fichiers, sortie validations
- Jamais de merge (orchestrateur s'en charge)
