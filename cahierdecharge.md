# CAHIER DES CHARGES & FEUILLE DE ROUTE STRICTE

# PLATEFORME OFFICIELLE DE LA GNJL

## ⚠️ INSTRUCTION PRINCIPALE À RESPECTER

Cette plateforme **n'est pas uniquement une plateforme de gestion des ambassadeurs**.

Il s'agit de la **plateforme officielle et du portail numérique de la GNJL**, permettant à la fois de :

* présenter l'événement ;
* présenter la vision et les objectifs de la GNJL ;
* communiquer autour de l'événement ;
* présenter les différentes éditions ;
* conserver l'historique et les récapitulatifs des éditions passées ;
* publier les actualités ;
* gérer les inscriptions ;
* gérer les candidatures ;
* gérer les jeunes leaders ;
* gérer les ambassadeurs ;
* gérer les participants ;
* gérer les utilisateurs internes et le personnel d'organisation ;
* suivre l'ensemble du parcours des utilisateurs jusqu'à l'événement.

La plateforme doit donc être conçue comme un **écosystème numérique complet autour de la GNJL**.

⚠️ Ne pas concevoir le projet uniquement autour du module « Ambassadeurs ».

Le module Ambassadeurs est une composante importante de la plateforme, mais il doit être intégré dans une architecture globale.

---

# 1. VISION GLOBALE DE LA PLATEFORME

La plateforme doit comporter deux grands espaces :

## A. L'ESPACE PUBLIC — SITE VITRINE

Accessible à tous sans connexion.

Cet espace présente :

* la GNJL ;
* l'événement ;
* la vision ;
* les objectifs ;
* les thématiques ;
* le programme ;
* les actualités ;
* les partenaires ;
* les intervenants ;
* les différentes éditions ;
* les récapitulatifs des éditions passées ;
* les photos et médias ;
* les statistiques ;
* les opportunités de participation.

---

## B. L'ESPACE PRIVÉ — PLATEFORME DE GESTION

Accessible après authentification.

Cet espace permet aux différents utilisateurs de gérer leurs activités selon leur rôle.

Les accès doivent être contrôlés par un système de :

# RBAC — Role Based Access Control

Chaque utilisateur doit avoir uniquement accès aux fonctionnalités autorisées pour son rôle.

---

# 2. PAGE D'ACCUEIL — SITE VITRINE

La page d'accueil doit être moderne, institutionnelle, dynamique et orientée événement.

Elle doit permettre de comprendre immédiatement :

> Qu'est-ce que la GNJL ?
>
> Pourquoi cet événement existe ?
>
> Qui peut participer ?
>
> Comment participer ?
>
> Où et quand se déroule l'événement ?

---

## Sections principales de la page d'accueil

### Hero Section

Présenter :

* le nom officiel de l'événement ;
* le thème de l'édition ;
* la date ;
* le lieu ;
* un message fort ;
* un compte à rebours avant l'événement.

Ajouter des boutons d'action comme :

* Participer à l'événement ;
* Devenir Ambassadeur ;
* Devenir Jeune Leader ;
* Découvrir la GNJL.

---

### À propos de la GNJL

Présenter :

* la vision ;
* la mission ;
* les objectifs ;
* les valeurs ;
* l'importance de la jeunesse.

---

### L'ÉDITION ACTUELLE

Présenter :

* le thème ;
* la date ;
* le lieu ;
* les grandes thématiques ;
* les objectifs spécifiques.

---

### Chiffres clés

Afficher par exemple :

* nombre de participants ;
* nombre de régions représentées ;
* nombre de pays ;
* nombre de jeunes leaders ;
* nombre d'ambassadeurs ;
* nombre d'éditions réalisées.

Les statistiques doivent être administrables depuis le back-office.

---

### Comment participer ?

Présenter clairement les différents parcours.

#### 1. Participer à l'événement

Le jeune peut déposer une candidature pour participer à l'événement.

#### 2. Devenir Ambassadeur

Le jeune peut postuler pour devenir ambassadeur de la GNJL.

#### 3. Devenir Jeune Leader

Le jeune peut créer un compte et rejoindre l'écosystème des jeunes leaders.

---

### Programme

Afficher :

* les jours ;
* les activités ;
* les conférences ;
* les panels ;
* les ateliers ;
* les cérémonies.

---

### Actualités

Afficher les dernières actualités publiées.

---

### Partenaires

Afficher les logos et informations des partenaires.

---

### Éditions précédentes

Présenter les anciennes éditions.

Pour chaque édition :

* année ;
* thème ;
* lieu ;
* statistiques ;
* photos ;
* vidéos ;
* moments forts ;
* résultats ;
* récapitulatif.

---

# 3. GESTION DES ÉDITIONS

⚠️ LA PLATEFORME DOIT ÊTRE MULTI-ÉDITIONS.

Elle ne doit pas être développée uniquement pour une seule édition.

Chaque édition doit pouvoir avoir :

* son année ;
* son nom ;
* son thème ;
* sa description ;
* sa date de début ;
* sa date de fin ;
* son lieu ;
* son programme ;
* ses statistiques ;
* ses partenaires ;
* ses actualités ;
* ses médias ;
* ses participants.

Exemple :

GNJL 2024

GNJL 2025

GNJL 2026

GNJL 2027

etc.

L'administrateur doit pouvoir créer une nouvelle édition sans avoir besoin de modifier le code.

---

# 4. LES DIFFÉRENTS TYPES D'UTILISATEURS

La plateforme doit gérer plusieurs rôles.

---

# 4.1 SUPER ADMIN

Le Super Admin possède le niveau d'accès le plus élevé.

Il peut :

* gérer tous les administrateurs ;
* créer et supprimer des administrateurs ;
* gérer les rôles ;
* gérer toutes les éditions ;
* gérer les paramètres généraux ;
* accéder à toutes les données ;
* gérer les régions ;
* gérer les quotas ;
* gérer les événements ;
* superviser les candidatures ;
* superviser les ambassadeurs ;
* superviser les jeunes leaders ;
* gérer les permissions.

⚠️ Le Super Admin possède un accès global à toute la plateforme.

---

# 4.2 ADMIN

L'Admin possède des droits importants mais limités selon les permissions attribuées.

Il peut notamment gérer :

* une édition ;
* les contenus du site ;
* les actualités ;
* les programmes ;
* les candidatures ;
* les participants ;
* les ambassadeurs ;
* les jeunes leaders ;
* certaines statistiques.

Le Super Admin doit pouvoir définir les permissions des administrateurs.

---

# 4.3 STAFF

Le Staff représente les membres de l'équipe d'organisation.

Selon ses permissions, il peut gérer :

* les candidatures ;
* les participants ;
* les inscriptions ;
* la présence ;
* les documents ;
* l'accueil ;
* les badges ;
* certaines activités de l'événement.

⚠️ Le Staff ne doit pas automatiquement avoir accès à toutes les données.

Les permissions doivent être limitées selon sa fonction.

---

# 4.4 CANDIDAT AMBASSADEUR

Il s'agit d'un jeune qui souhaite devenir ambassadeur de la GNJL.

Son parcours spécifique est :

**Inscription → Paiement → Formation → QCM → Sélection → Documents → Engagement → Badge → Embarquement → Présence → Attestation**

Ce module doit être développé séparément comme :

# MODULE AMBASSADEURS

---

# 4.5 CANDIDAT PARTICIPANT À L'ÉVÉNEMENT

Il s'agit d'une personne qui souhaite participer directement à l'événement.

Il doit pouvoir :

* créer un compte ;
* consulter l'événement ;
* déposer une candidature ;
* compléter son profil ;
* envoyer les informations demandées ;
* suivre le statut de sa candidature.

Statuts possibles :

* BROUILLON
* SOUMIS
* EN_COURS_ANALYSE
* RETENU
* NON_RETENU
* LISTE_ATTENTE

⚠️ Ce parcours est différent du parcours Ambassadeur.

---

# 4.6 JEUNE LEADER

La plateforme doit permettre à un jeune de créer un compte en tant que :

# JEUNE LEADER

Le Jeune Leader devient membre de l'écosystème numérique de la GNJL.

Son compte peut lui permettre :

* gérer son profil ;
* participer aux opportunités ;
* postuler aux événements ;
* suivre les activités ;
* recevoir des informations ;
* accéder aux opportunités réservées ;
* conserver son historique de participation.

⚠️ Le système doit être pensé pour permettre à un Jeune Leader de participer à plusieurs éditions et opportunités dans le futur.

Le profil du Jeune Leader doit donc être durable et indépendant d'une seule édition.

---

# 5. IMPORTANT : DISTINCTION ENTRE LES PARCOURS

Le système ne doit pas confondre :

### Un Ambassadeur

avec

### Un Participant à l'événement

avec

### Un Jeune Leader.

Une même personne peut potentiellement :

* être Jeune Leader ;
* postuler pour participer à un événement ;
* postuler pour devenir Ambassadeur.

Il faut donc éviter de créer trois comptes différents.

# UN UTILISATEUR = UN COMPTE

Mais un même utilisateur peut avoir plusieurs :

* profils ;
* candidatures ;
* participations ;
* rôles fonctionnels.

---

# 6. ARCHITECTURE UTILISATEUR RECOMMANDÉE

Créer une structure permettant :

## User

Compte principal.

Informations :

* id ;
* nom ;
* prénom ;
* email ;
* téléphone ;
* mot de passe ;
* photo ;
* statut ;
* createdAt ;
* updatedAt.

---

## UserRole

Gestion des rôles internes.

Exemples :

* SUPER_ADMIN
* ADMIN
* STAFF

---

## LeaderProfile

Profil spécifique du Jeune Leader.

---

## AmbassadorApplication

Candidature pour devenir ambassadeur.

---

## EventApplication

Candidature pour participer à une édition.

---

## EventParticipation

Participation effective à une édition.

---

⚠️ Ne jamais créer une architecture où une personne doit obligatoirement créer plusieurs comptes pour participer à différents programmes.

---

# 7. MODULE AMBASSADEURS

Le module Ambassadeurs doit fonctionner indépendamment tout en restant connecté à l'écosystème global.

## Parcours

### Étape 1

Création du compte.

### Étape 2

Sélection de la région.

### Étape 3

Paiement de :

# 5 000 FCFA

### Étape 4

Formation.

### Étape 5

QCM.

### Étape 6

Classement régional.

### Étape 7

Sélection automatique selon le quota.

### Étape 8

Repêchage manuel exceptionnel.

### Étape 9

Documents administratifs.

### Étape 10

Engagement numérique.

### Étape 11

Badge.

### Étape 12

Validation de l'embarquement.

### Étape 13

Présence à Niamey.

### Étape 14

Attestation.

---

# 8. MODULE CANDIDATURE PARTICIPANT

Créer un module spécifique permettant de postuler pour participer à une édition.

Le candidat doit :

* choisir l'édition ;
* remplir son profil ;
* compléter le formulaire ;
* soumettre sa candidature.

Le Staff ou l'Admin doit pouvoir :

* consulter les candidatures ;
* filtrer ;
* analyser ;
* retenir ;
* refuser ;
* placer en liste d'attente.

Le candidat doit recevoir une notification sur son espace personnel.

---

# 9. MODULE JEUNE LEADER

Créer un espace spécifique pour les Jeunes Leaders.

Le Jeune Leader possède :

* un profil personnel ;
* un historique ;
* ses candidatures ;
* ses participations ;
* ses opportunités.

Le système doit être conçu comme une communauté durable.

⚠️ Le profil Jeune Leader ne doit pas disparaître après une édition.

---

# 10. BACK-OFFICE D'ADMINISTRATION

Créer un espace administratif complet.

Le menu peut être organisé ainsi :

## Dashboard

* statistiques globales ;
* statistiques de l'édition active.

## Éditions

* créer ;
* modifier ;
* archiver.

## Utilisateurs

* Super Admin ;
* Admin ;
* Staff ;
* Jeunes Leaders.

## Candidatures

* Ambassadeurs ;
* Participants.

## Ambassadeurs

* régions ;
* quotas ;
* paiements ;
* formation ;
* QCM ;
* sélection ;
* repêchage ;
* embarquement.

## Événement

* programme ;
* sessions ;
* intervenants ;
* partenaires.

## Contenus

* pages ;
* actualités ;
* médias ;
* éditions précédentes.

## Présence

* pointage ;
* statistiques.

## Documents

* badges ;
* permissions ;
* ordres de mission ;
* attestations.

---

# 11. ARCHITECTURE DU SITE

Le site doit être organisé en deux parties.

## SITE PUBLIC

Exemple de routes :

/

/a-propos

/edition/[slug]

/editions

/programme

/actualites

/partenaires

/galerie

/devenir-ambassadeur

/participer

/devenir-jeune-leader

/connexion

/inscription

---

## ESPACE UTILISATEUR

/dashboard

/dashboard/profile

/dashboard/candidatures

/dashboard/participations

/dashboard/ambassadeur

/dashboard/documents

/dashboard/badge

---

## ESPACE ADMINISTRATION

/admin

/admin/dashboard

/admin/editions

/admin/users

/admin/staff

/admin/applications

/admin/ambassadors

/admin/events

/admin/program

/admin/news

/admin/partners

/admin/attendance

/admin/documents

/admin/settings

---

# 12. BASE DE DONNÉES — ENTITÉS PRINCIPALES

Avant de commencer le développement, concevoir correctement les relations entre :

* User
* Role
* Permission
* Edition
* Region
* LeaderProfile
* AmbassadorApplication
* EventApplication
* EventParticipation
* Payment
* Training
* Quiz
* Question
* QuizAttempt
* Selection
* Repechage
* Engagement
* Badge
* Boarding
* Attendance
* Document
* Program
* Session
* Speaker
* Partner
* News
* Media

⚠️ La modélisation de la base de données doit être validée avant le développement des interfaces.

---

# 13. ORDRE STRICT DE DÉVELOPPEMENT

## PHASE 1 — ARCHITECTURE

* Initialisation du projet.
* Configuration technique.
* Base de données.
* Authentification.
* Gestion des rôles.
* Permissions.

---

## PHASE 2 — SITE VITRINE

* Page d'accueil.
* À propos.
* Éditions.
* Éditions passées.
* Actualités.
* Programme.
* Partenaires.
* Galerie.

---

## PHASE 3 — GESTION DES ÉDITIONS

* Création des éditions.
* Gestion de l'édition active.
* Archivage.
* Historique.

---

## PHASE 4 — UTILISATEURS

* Super Admin.
* Admin.
* Staff.
* Jeunes Leaders.

---

## PHASE 5 — CANDIDATURES PARTICIPANTS

* Formulaire.
* Soumission.
* Analyse.
* Validation.
* Notifications.

---

## PHASE 6 — JEUNES LEADERS

* Création du profil.
* Espace personnel.
* Historique.
* Opportunités.

---

## PHASE 7 — MODULE AMBASSADEURS

* Inscription.
* Paiement.
* Formation.
* QCM.
* Classement.
* Sélection.
* Repêchage.

---

## PHASE 8 — DOCUMENTS

* Demande de permission.
* Ordre de mission.
* Engagement.
* Badge.
* Attestation.

---

## PHASE 9 — GESTION TERRAIN

* Embarquement.
* Accueil.
* Pointage.
* Présence.

---

## PHASE 10 — STATISTIQUES & RAPPORTS

* Dashboard.
* Statistiques régionales.
* Statistiques nationales.
* Export des données.

---

# 14. RÈGLES TECHNIQUES IMPORTANTES

Le projet doit être conçu pour être :

* sécurisé ;
* responsive ;
* moderne ;
* évolutif ;
* multi-éditions ;
* maintenable ;
* performant.

⚠️ Toutes les fonctionnalités doivent être liées à une édition lorsque cela est nécessaire.

⚠️ Les éditions passées doivent rester consultables publiquement.

⚠️ Une nouvelle édition doit pouvoir être créée depuis le back-office.

⚠️ Le système ne doit pas nécessiter de modification du code pour créer une nouvelle édition.

---

# 15. MÉTHODE DE TRAVAIL OBLIGATOIRE

Pour chaque fonctionnalité :

### 1. Analyser

Comprendre la fonctionnalité et son impact.

### 2. Modéliser

Identifier les données nécessaires.

### 3. Vérifier

Vérifier les relations avec les autres modules.

### 4. Développer

Créer le backend et le frontend.

### 5. Sécuriser

Vérifier les rôles et permissions.

### 6. Tester

Tester le parcours complet.

### 7. Vérifier

Vérifier TypeScript et le build.

### 8. Continuer

Passer à la prochaine fonctionnalité uniquement après validation.

---

# CONSIGNE FINALE

Ne jamais considérer cette plateforme comme uniquement un système de gestion des ambassadeurs.

La plateforme est le :

# PORTAIL OFFICIEL DE LA GNJL

Elle doit permettre de gérer :

**LA COMMUNICATION + LES ÉDITIONS + LES UTILISATEURS + LES JEUNES LEADERS + LES CANDIDATURES + LES AMBASSADEURS + LES PARTICIPANTS + L'ÉVÉNEMENT.**

L'architecture doit être suffisamment flexible pour accompagner la GNJL pendant plusieurs années et plusieurs éditions futures.

Avant toute implémentation importante, vérifier que la solution proposée est compatible avec cette vision globale.
