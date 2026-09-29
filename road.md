\# Cahier des charges – App « Heute » Jugendherberge Schierke



Sep 28, 2026 · @Chams



\## Contexte et objectifs



Le prototype remplace les plans papier de la réception par un écran « Heute » sur le téléphone de chaque employé, mis à jour en temps réel. Il sera présenté à la Herbergsleitung, puis publié sur GitHub avec des données fictives.



\*\*Situation actuelle\*\*



\- Le Dienstplan mensuel est imprimé. Les changements (séminaire, récupération, remplacement) sont ajoutés au stylo, avec ratures et flèches.

\- Les listes Gäste/Verpflegung changent presque chaque jour. Elles sont réimprimées puis surlignées à la main.

\- Le Speiseplan, les notes de quantités de la cuisine et les demandes spéciales des groupes sont affichés sur des feuilles séparées.

\- Le personnel du 4e étage doit descendre à la réception pour connaître sa prochaine tâche.



\*\*Objectifs mesurables\*\*



1\. Un employé voit son service, ses tâches, le nombre de Gäste et le menu du jour en moins de 10 secondes.

2\. Une modification faite par l'admin apparaît sur les téléphones concernés en moins de 5 secondes, avec notification.

3\. Plus aucun aller-retour à la réception pour demander la chambre suivante.

4\. Chaque modification du Dienstplan est tracée (qui, quand, pourquoi) au lieu d'être raturée.



\## Périmètre du prototype



La version 0.1 couvre quatre modules et fonctionne uniquement avec des données fictives.



\*\*Inclus\*\*



\- Dienstplan : consultation sur mobile, édition dans l'admin, historique des modifications.

\- Gäste \& Verpflegung : nombre de repas par jour et par groupe, régimes spéciaux.

\- Speiseplan : menu du jour et variante végétarienne.

\- Housekeeping : chambres du jour, attribution, statut en direct.

\- Notifications push sur les changements qui concernent l'employé.



\*\*Exclus de la v0.1\*\*



\- Connexion au logiciel de réservation du DJH (saisie manuelle, import plus tard).

\- Paie, décompte officiel des heures et Urlaubsplan.

\- Toute donnée réelle de clients ou de collègues.

\- Plusieurs auberges, mode hors ligne complet.



\## Utilisateurs et rôles



Quatre rôles suffisent ; chacun ne voit que ce dont il a besoin pour travailler.



| Rôle | Qui | Voit | Modifie |

| --- | --- | --- | --- |

| Admin | Herbergsleitung, Rezeption | Tout, y compris le motif des absences | Tout |

| Küchenleitung | Chef de cuisine | Dienstplan Küche, Gäste, menu | Menu, quantités, Dienstplan Küche |

| Küche | Cuisiniers | Son planning, l'équipe du jour, Gäste, menu | Rien (lecture seule) |

| Housekeeping / BFD | Personnel de ménage, volontaires | Son planning, ses tâches, Gäste du jour | Statut de ses tâches |



Règle de confidentialité : les collègues voient « abwesend », jamais « krank » ou « Urlaub ». Seul l'admin voit le motif.



\## Exigences fonctionnelles



Les exigences « Must » suffisent pour la démo devant la direction ; « Should » et « Could » viennent ensuite si le temps le permet.



\### Règles métier reprises du plan actuel



| Code | Signification | Règle |

| --- | --- | --- |

| TD | Teildienst (service coupé) | 8:00–13:00 + 18:00–20:30 (ou 21:00) |

| SEM | Séminaire BFD | Compte comme journée de travail de 8,00 h |

| u | Urlaub | 8,00 h créditées |

| k | krank | Affiché « abwesend » aux collègues |

| x | frei | 0,00 h |



\- Les horaires sont notés en décimal : 14,50 = 14:30. L'app affiche HH:MM et stocke des minutes.

\- IST o. Pause = présence moins 30 min de pause. Exemple : 6:00–14:30 donne 8,00 h.

\- Contrat VZ : Soll de 8,00 h par jour et 174 h par mois.

\- Un service du dimanche apparaît comme 12,00 h sur le plan (8,00 × 1,5). À confirmer avec la direction.



\### Dienstplan



| ID | Exigence | Priorité |

| --- | --- | --- |

| DP-01 | Voir mon service du jour et des 7 prochains jours (début, fin, type) | Must |

| DP-02 | Voir qui travaille aujourd'hui, par équipe (Küche, Housekeeping, BFD) | Must |

| DP-03 | Admin : éditer les services dans une grille mois × personnes, comme l'Excel actuel | Must |

| DP-04 | Garder pour chaque modification l'ancienne valeur, l'auteur, la date et une raison (ex. « Ausgleich Seminar ») | Must |

| DP-05 | Calculer IST o. Pause par jour et le total du mois face au Soll | Should |

| DP-06 | Importer le plan Excel existant au format CSV | Could |

| DP-07 | Demander un échange de service à un collègue | Could |



\### Gäste \& Verpflegung



| ID | Exigence | Priorité |

| --- | --- | --- |

| VG-01 | Voir par jour le total de Gäste pour Früh, Mittag et Abend | Must |

| VG-02 | Voir le détail par groupe (Matchcode) : VEG, vegan, MOS (sans porc), AL (allergies), LP (Lunchpaket), GR (Grillen) | Must |

| VG-03 | Afficher clairement « kein Mittagessen » ou « kein Abendessen » | Must |

| VG-04 | Ajouter une note par groupe (ex. produits fournis par une famille) | Should |

| VG-05 | Surligner ce qui a changé depuis ma dernière consultation | Should |

| VG-06 | Importer l'export du logiciel de réservation (CSV) | Could |



\### Speiseplan



| ID | Exigence | Priorité |

| --- | --- | --- |

| SP-01 | Saisir et afficher le menu par jour et par repas : plat, variante veg, Nachspeise | Must |

| SP-02 | Afficher le rappel « Änderungen vorbehalten – bei Allergien Küchenpersonal fragen » | Must |

| SP-03 | Calculer les quantités à partir d'une recette de base et du nombre de portions | Could |



\### Housekeeping



| ID | Exigence | Priorité |

| --- | --- | --- |

| HK-01 | Lister les chambres du jour avec étage et type : Abreise (nettoyage complet) ou Bleiber (Zwischenreinigung) | Must |

| HK-02 | Attribuer chambres et zones (Bäder, Schlafzimmer) à une personne | Must |

| HK-03 | Passer une tâche de « offen » à « in Arbeit » puis « erledigt » ; la réception le voit en direct | Must |

| HK-04 | Bouton « Nächste Aufgabe » qui affiche la tâche suivante | Should |

| HK-05 | Signaler un problème avec photo et texte (ampoule, dégât) | Could |



\### Notifications



| ID | Exigence | Priorité |

| --- | --- | --- |

| NT-01 | Push quand mon service change | Must |

| NT-02 | Push quand une tâche m'est attribuée | Must |

| NT-03 | Push à la cuisine quand un nombre de repas du jour change | Should |

| NT-04 | Annonce de la direction à toute l'équipe | Could |



\## Écrans



Sept écrans mobiles et sept écrans admin ; l'écran « Heute » est le cœur de la démo.



\*\*App mobile (interface en allemand)\*\*



1\. Anmeldung : connexion par e-mail et lien magique, ou code PIN pour les téléphones partagés.

2\. Heute : mon service, mes tâches, Gäste du jour (Früh, Mittag, Abend), menu, annonces.

3\. Mein Dienstplan : vue semaine et mois, heures Soll et IST.

4\. Team : qui travaille aujourd'hui et à quelle heure.

5\. Aufgaben : mes chambres avec étage, type et bouton de statut.

6\. Küche : repas par groupe avec VEG, vegan, MOS, AL, LP.

7\. Profil : langue, réglages des notifications.



\*\*Admin web\*\*



1\. Tagesübersicht : tableau de bord du jour, tâches en retard en rouge.

2\. Dienstplan : grille mois × personnes, clic sur une case pour éditer, raison obligatoire.

3\. Gäste \& Verpflegung : saisie par groupe et par repas.

4\. Speiseplan : saisie de la semaine, copie d'une semaine précédente.

5\. Housekeeping : chambres × personnes, attribution par glisser-déposer.

6\. Mitarbeiter : comptes, rôles, contrats.

7\. Änderungsprotokoll : historique filtrable de toutes les modifications.



\## Modèle de données



Dix tables PostgreSQL couvrent le prototype ; chaque table a `id`, `created\_at` et `updated\_at`.



| Table | Champs principaux | Remarques |

| --- | --- | --- |

| `employees` | user\\\_id, display\\\_name, department, role, contract (VZ/TZ), soll\\\_min\\\_day, soll\\\_min\\\_month, active | department : kueche, housekeeping, bfd, rezeption |

| `shifts` | employee\\\_id, date, type, start1, end1, start2, end2, break\\\_min, note | type : normal, td, sem, urlaub, krank, frei ; start2/end2 pour le TD |

| `shift\_changes` | shift\\\_id, changed\\\_by, changed\\\_at, old\\\_value (jsonb), new\\\_value (jsonb), reason | Rempli par un trigger, jamais modifiable |

| `bookings` | matchcode, label, arrival, departure, note | Groupe ou catégorie (Einzelgäste, Familien) |

| `meal\_counts` | booking\\\_id, date, meal, total, veg, vegan, mos, allergy\\\_count, allergy\\\_note | meal : frueh, mittag, abend, lunchpaket, grill |

| `menu\_items` | date, meal, main\\\_dish, veg\\\_variant, dessert | Une ligne par jour et par repas |

| `rooms` | number, floor, beds, has\\\_bath | Chargé une fois |

| `room\_tasks` | date, room\\\_id, task\\\_type, zone, assigned\\\_to, status, done\\\_at, note | task\\\_type : abreise, bleiber ; status : offen, in\\\_arbeit, erledigt |

| `announcements` | text, audience, created\\\_by, valid\\\_until | audience : all ou un department |

| `push\_tokens` | employee\\\_id, token, platform | Un employé peut avoir plusieurs appareils |



Les durées sont stockées en minutes pour éviter les erreurs de décimales (14,50 contre 14:30).



\## Temps réel et notifications



L'app ouverte se met à jour via Supabase Realtime ; l'app fermée reçoit un push envoyé par une Edge Function.



| Événement | Destinataire | Canal | Exemple de message |

| --- | --- | --- | --- |

| Service modifié, ajouté ou supprimé | Employé concerné | Push + in-app | « Dein Dienst am 30.09. wurde geändert: 08:00–16:30 » |

| Tâche attribuée | Employé concerné | Push + in-app | « Neue Aufgabe: Zimmer 412 – Abreise » |

| Tâche erledigt | Réception | In-app seulement | Chambre passe au vert dans l'admin |

| Nombre de repas modifié (jour même) | Équipe Küche | Push + in-app | « Abendessen heute: 13 → 25 Gäste » |

| Menu modifié | Équipe Küche | In-app | Badge « geändert » sur le jour |

| Annonce | Tous ou un department | Push + in-app | Texte libre |



\*\*Chaîne technique d'un push\*\*



1\. L'admin enregistre une modification dans une table.

2\. Un Database Webhook Supabase appelle l'Edge Function `notify`.

3\. La fonction retrouve les destinataires et leurs `push\_tokens`.

4\. Elle envoie le message via l'API Expo Push (FCM pour Android, APNs pour iOS).



L'écran affiche l'heure de dernière synchronisation pour que personne ne travaille sur une information périmée.



\## Exigences non fonctionnelles



Le RGPD est la contrainte principale : l'app touche des données de santé et de religion, même indirectement.



\*\*RGPD (DSGVO)\*\*



\- Minimisation : les groupes sont identifiés par Matchcode, jamais par nom de client, adresse ou téléphone.

\- Allergies et intolérances : nombre + type par groupe, jamais le nom d'un enfant. Ce sont des données de santé (art. 9).

\- MOS peut révéler une religion : affiché comme régime alimentaire, sans autre information.

\- Motif d'absence (krank, Urlaub) visible par l'admin seulement.

\- Hébergement dans l'UE (région Supabase Frankfurt).

\- Avant tout usage réel : accord écrit de la Herbergsleitung et avis du délégué à la protection des données du DJH.



\*\*Sécurité\*\*



\- Row Level Security activée sur toutes les tables, règles par rôle.

\- Aucune clé secrète dans l'app mobile ; seule la clé publique `anon` y figure.

\- Journal des modifications non modifiable par les utilisateurs.



\*\*Performance et fiabilité\*\*



\- Écran « Heute » chargé en moins de 2 s en 4G.

\- Modification visible sur les autres appareils en moins de 5 s.

\- Hors ligne : le dernier état reste lisible, avec l'heure de synchronisation.

\- Pendant la phase de test, le papier reste la référence pour les allergies en cuisine.



\*\*Utilisabilité\*\*



\- Interface en allemand, textes prévus pour une traduction (i18n).

\- Utilisable d'une main, gros boutons de statut, contraste élevé.



\## Stack technique et architecture



Tout le prototype tient en TypeScript sur un backend Supabase, sans serveur à maintenir.



\&#91;embedded content: architecture · admin web, backend Supabase, app mobile\\]



L'admin et l'app parlent au même backend : une modification enregistrée d'un côté apparaît de l'autre en direct, et l'Edge Function envoie le push quand l'app est fermée.



| Couche | Choix | Raison |

| --- | --- | --- |

| Base, auth, temps réel | Supabase (PostgreSQL) | Tout intégré, offre gratuite suffisante pour un prototype, région UE |

| App mobile | Expo (React Native) + TypeScript | Un seul code pour Android et iOS, push intégré, test immédiat avec Expo Go |

| Admin web | Next.js + TypeScript | Même langage que l'app, hébergement gratuit sur Vercel |

| Notifications | Edge Function + Expo Push | Pas de serveur de push à gérer |

| Code | Monorepo GitHub : `apps/mobile`, `apps/admin`, `supabase/` | Un seul dépôt public pour le portfolio, CI avec GitHub Actions |



Alternative possible : Flutter à la place d'Expo ; le backend ne change pas.



\## Données de démonstration



Un script `seed.sql` charge une auberge fictive réaliste ; aucune donnée des photos de la réception n'entre dans le dépôt.



\- Auberge : « Jugendherberge Musterberg », 40 chambres sur 4 étages.

\- 8 employés aux noms inventés : 2 Küche, 1 Küchenleitung, 3 Housekeeping/BFD, 2 Rezeption/Admin.

\- Un mois de Dienstplan avec tous les cas : TD, SEM, Urlaub, krank, frei, un dimanche.

\- 5 groupes fictifs sur une semaine, par exemple « Grundschule Beispielstadt 4a », « TSV Muster », « Einzelgäste », « Familien ».

\- Des régimes variés (VEG, vegan, MOS, 2 allergies), un jour sans Mittagessen et un jour avec Lunchpakete.

\- Un Speiseplan d'une semaine et environ 15 tâches de ménage par jour.



À ne jamais publier sur GitHub : noms réels des collègues, noms de groupes réels, lettres de familles, photos des tableaux.



\## Planning et livrables



Le prototype est présentable en 6 semaines, en comptant environ 10 h de travail par semaine en dehors du BFD.



\&#91;embedded content: roadmap · 5 phases sur 6 semaines, 2 jalons\\]



Chaque phase se termine par une version qui tourne sur un vrai téléphone ; si une semaine glisse, la phase Finition sert de tampon.



\*\*Livrables\*\*



\- Dépôt GitHub public : `apps/mobile`, `apps/admin`, `supabase/` (migrations, seed, fonctions).

\- App Android installable (APK) et test iOS via Expo Go pour la démo.

\- Admin web en ligne sur une URL de démo.

\- README avec captures d'écran, schéma d'architecture et ce cahier des charges.

\- Vidéo de démo de 2 minutes pour le portfolio.



\## Scénario de démo et critères d'acceptation



La démo dure 5 minutes, avec un ordinateur (admin) et deux téléphones (Küche et Housekeeping).



\*\*Scénario\*\*



1\. Ouvrir « Heute » sur le téléphone Housekeeping : service, tâches, Gäste et menu visibles d'un coup d'œil.

2\. Dans l'admin, remplacer un jour libre par « SEM » avec la raison « Ausgleich Seminar ». Le téléphone reçoit le push.

3\. À la réception, passer l'Abendessen du jour de 13 à 25 Gäste. Le téléphone Küche affiche le chiffre surligné.

4\. Attribuer six chambres du 4e étage. L'employée en marque une « erledigt » ; l'admin la voit passer au vert.

5\. Ouvrir l'Änderungsprotokoll : les trois modifications y figurent avec auteur, heure et raison.



\*\*Critères d'acceptation\*\*



\- \[ ] Toutes les exigences « Must » fonctionnent sur Android et iOS.

\- \[ ] Un push arrive en moins de 5 s, app fermée.

\- \[ ] Un employé Küche ne peut ni lire le motif d'une absence ni modifier un service (test RLS).

\- \[ ] Le total IST o. Pause d'un mois fictif correspond au calcul fait à la main.

\- \[ ] Le dépôt GitHub contient un README, des captures d'écran et uniquement des données fictives.



\## Évolutions après le prototype



Si la direction adopte l'outil, ces extensions viennent dans cet ordre :



1\. Import automatique des listes Gäste depuis le logiciel de réservation.

2\. Urlaubsplan et demandes de congé dans l'app.

3\. Calculateur de quantités relié aux recettes et aux commandes.

4\. Rapport mensuel des heures exportable pour la paie.

5\. Version multi-auberges pour d'autres Jugendherbergen du Landesverband.



