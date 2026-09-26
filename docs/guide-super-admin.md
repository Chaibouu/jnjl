# Guide Super Admin — Plateforme JNJL

Ce guide explique **tous les modules** de la plateforme JNJL (Journée Nationale du Jeune Leader, Niger)
et leur fonctionnement, du point de vue du **Super Admin**. Il décrit ce que fait chaque écran, dans
quel ordre l'utiliser, les règles appliquées par le système et les pièges à connaître.

> Le module QCM a son propre guide détaillé : [`docs/module-qcm.md`](./module-qcm.md).

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Connexion, rôles et permissions](#2-connexion-rôles-et-permissions)
3. [Configuration initiale (à faire dans cet ordre)](#3-configuration-initiale-à-faire-dans-cet-ordre)
4. [Éditions](#4-éditions)
5. [Régions et quotas](#5-régions-et-quotas)
6. [Utilisateurs internes](#6-utilisateurs-internes)
7. [Contenus du site public](#7-contenus-du-site-public)
8. [Candidatures Participants](#8-candidatures-participants)
9. [Jeunes Leaders](#9-jeunes-leaders)
10. [Parcours Ambassadeur — les 14 étapes](#10-parcours-ambassadeur--les-14-étapes)
11. [Statistiques et exports](#11-statistiques-et-exports)
12. [Notifications et emails](#12-notifications-et-emails)
13. [Stockage des fichiers](#13-stockage-des-fichiers)
14. [Référencement (SEO)](#14-référencement-seo)
15. [Limites connues](#15-limites-connues)
16. [Dépannage](#16-dépannage)
17. [Annexe — permissions et comptes de démonstration](#17-annexe--permissions-et-comptes-de-démonstration)

---

## 1. Vue d'ensemble

La plateforme a deux faces :

| Face | Adresse | Accès |
|---|---|---|
| **Site public** | `/`, `/programme`, `/actualites`, `/intervenants`, `/partenaires`, `/editions`, `/participer`, `/ambassadeurs/candidature` | Libre, sans compte |
| **Espace privé** | `/dashboard`, `/admin/...`, `/ambassadeur/...` | Connexion obligatoire, menu selon le rôle |

Trois parcours pour les jeunes :

| Parcours | Comment il commence | Qui le gère |
|---|---|---|
| **Participant à l'événement** | Formulaire public `/participer` | Module Candidatures Participants |
| **Ambassadeur** | Formulaire public `/ambassadeurs/candidature` | Module Ambassadeurs (14 étapes) |
| **Jeune Leader** | Création d'un compte (`/auth/signup`) | Espace personnel `/dashboard` |

**Principe fondamental : tout est rattaché à une édition.** Il existe une seule **édition active** à la fois ;
c'est elle qui alimente l'accueil du site, les candidatures publiques et les espaces ambassadeurs.

---

## 2. Connexion, rôles et permissions

### 2.1 Se connecter

- Page : `/auth/login` (email + mot de passe).
- Si l'authentification à deux facteurs est activée sur le compte, un code est demandé ensuite.
- La session dure 1 h (renouvelée automatiquement tant que le compte est actif). Désactiver un compte
  coupe immédiatement ses sessions.
- Mot de passe oublié : `/auth/forgot-password` (lien envoyé par email).
- Selon la configuration, vous pouvez arriver sur une page de test après connexion : utilisez le **menu latéral**.

### 2.2 Les rôles

| Rôle | Portée |
|---|---|
| **SUPER_ADMIN** | Accès **global** à toute la plateforme. Il contourne toute vérification de permission : aucun droit à lui attribuer. |
| **ADMIN** | Ne reçoit **que** les permissions qui lui sont attribuées individuellement. Ne peut gérer que des comptes `USER` et `STAFF`. |
| **STAFF** | Idem : uniquement ses permissions (ex. accueil, point focal). |
| **USER** | Compte candidat / ambassadeur / jeune leader. Accède aux pages `/ambassadeur/...` et `/dashboard`. |

### 2.3 Comment fonctionnent les permissions

- Le menu latéral n'affiche que les modules autorisés (rôle **et** permission).
- Les actions sont **aussi** vérifiées côté serveur : masquer un lien ne suffit pas, l'action est refusée
  si la permission manque (message « Permission requise : … »).
- En tant que Super Admin vous voyez **tous** les modules, y compris les pages « Mon badge », « Mon QCM »…
  destinées aux ambassadeurs ; elles afficheront simplement « aucune candidature » pour votre compte.
- La liste complète des permissions est en [annexe](#17-annexe--permissions-et-comptes-de-démonstration).

---

## 3. Configuration initiale (à faire dans cet ordre)

Pour lancer une nouvelle édition de bout en bout :

1. **Créer l'édition** (Éditions) puis l'**activer**.
2. Vérifier les **régions** (8 régions du Niger déjà présentes).
3. Fixer les **quotas régionaux** de l'édition (Classement & Sélection). *Sans quota, aucun ambassadeur ne sera sélectionné.*
4. Créer les **comptes du personnel** (Utilisateurs) : admins, staff, points focaux, avec leurs permissions.
5. Renseigner le **programme**, les **intervenants**, les **partenaires**, les **chiffres clés**.
6. Créer les **formations** (avec leurs modules) et les **QCM** : au moins un **QCM de classement** publié ; éventuellement des QCM liés à une formation
   (avec attestation) et des QCM libres.
7. Rédiger la **fiche d'engagement** de l'édition.
8. Ouvrir les candidatures : les formulaires publics fonctionnent dès qu'une édition est **active**.

---

## 4. Éditions

**Menu : Éditions** — `/admin/editions` · permissions `editions.manage`, `editions.publish`, `editions.archive`.

### 4.1 Cycle de vie

```
BROUILLON  →  PUBLIÉE  →  ACTIVE  →  ARCHIVÉE
                 ↑______________________|   (restauration possible)
```

| Statut | Signification | Visibilité |
|---|---|---|
| **Brouillon** | En préparation | Interne |
| **Publiée** | Prête / passée en attente | Interne |
| **Active** | L'édition **en cours** (une seule) | Alimente l'accueil, les candidatures, les espaces ambassadeurs |
| **Archivée** | Édition terminée | Apparaît dans **Éditions précédentes** (`/editions`) |

### 4.2 Actions

| Bouton | Effet |
|---|---|
| **Voir** (œil) | Fiche de l'édition + gestion des chiffres clés et de la galerie (§4.3) |
| **Modifier** (crayon) | Année, nom, slug, thème, description, lieu, dates, couleur de fond du badge |
| **Activer** (coche) | Rend l'édition active. **L'ancienne édition active repasse automatiquement en « Publiée »** (transaction atomique : jamais deux éditions actives). |
| **Archiver** | Termine l'édition et la publie sur `/editions`. Confirmation demandée. |
| **Restaurer** | Ramène une édition archivée en « Publiée ». |

Règles : une seule édition par **année** ; le **slug** doit être unique ; **l'édition active ne peut pas être archivée**
(activez d'abord une autre édition).

### 4.3 Chiffres clés et galerie (page « Voir » d'une édition)

- **Chiffres clés** (permission `editions.manage`) : libellé + valeur (ex. « Participants — 1200 »). Un libellé est
  unique par édition. Ils s'affichent sur l'accueil (édition active) et sur la page publique de l'édition archivée.
- **Galerie** (permission `media.manage`) : photos et vidéos. Pour une **photo**, coller un lien **ou** cliquer
  « Téléverser » pour envoyer un fichier depuis l'ordinateur (JPEG/PNG/GIF/WebP, 4 Mo max — stocké sur R2/disque local,
  voir §16.3). Une **vidéo** reste obligatoirement un lien (YouTube/Vimeo intégrés automatiquement, sinon lien cliquable).

### 4.4 Page publique « Éditions précédentes »

`/editions` liste les éditions **archivées** (année, thème, lieu, première photo). `/editions/[slug]` montre le thème,
les dates, les chiffres, le récapitulatif (= description), les photos et les vidéos.

---

## 5. Régions et quotas

### 5.1 Régions — `/admin/regions` (`regions.manage`)

Liste des régions (Agadez, Diffa, Dosso, Maradi, Niamey, Tahoua, Tillabéri, Zinder). Vous pouvez ajouter, modifier
(nom + code, uniques) ou supprimer. **Une région déjà utilisée** (candidature, profil, quota, embarquement…) **ne peut pas
être supprimée.**

### 5.2 Quotas — dans « Classement & Sélection » ou « Paramètres » (`quotas.manage`)

Un quota = **nombre d'ambassadeurs à sélectionner dans une région pour une édition**. Il est saisi par région et
enregistré avec l'auteur de la modification. Valeur par défaut : **0**. Réglable depuis **Classement & Sélection**
(§10.6) ou depuis **Paramètres** (§5.3) — les deux écrans partagent les mêmes valeurs.

### 5.3 Paramètres — `/admin/parametres` (`editions.manage`)

Écran dédié aux réglages qui ne concernent pas l'identité de l'édition (contrairement à Éditions, §4) : **quotas
régionaux** (§5.2) et **réglages des documents administratifs** de l'édition sélectionnée —

- **Dates de l'ordre de mission** : DATE DE DEPART / DATE DE RETOUR affichées sur le document. Vides par défaut
  (reprennent alors les dates de l'édition).
- **Période de l'autorisation d'absence** : dates de début/fin utilisées dans la demande de permission. Vides par
  défaut (reprennent alors les dates de l'édition).
- **Clause de patronage** : texte repris tel quel dans la demande de permission (« sous le Haut Patronage… »). Vide
  par défaut (texte générique utilisé).
- **Attestation de participation** (§10.13) : thème, lieu, dates et nom de l'édition insérés dans le texte de
  l'attestation (« ... sur le thème : «&nbsp;{thème}&nbsp;» tenue à {lieu} le {date} ... à la {édition}. »). Chaque
  champ a son propre repli si vide (thème et lieu de l'édition, dates de l'édition, nom de l'édition) — utile pour
  reprendre une formulation historique comme « 3è édition de la JNJL » plutôt que le nom brut de l'édition.

Ces réglages étaient auparavant sur la fiche édition ; ils vivent désormais ici pour ne pas surcharger le
formulaire d'édition.

---

## 6. Utilisateurs internes

**Menu : Utilisateurs** — `/admin/users` · permission `users.manage`.

| Action | Détail |
|---|---|
| **Ajouter** | Nom, email, mot de passe, rôle (ADMIN / STAFF / USER…), actif ou non, **permissions cochées une à une**. |
| **Modifier** | Change infos, rôle et permissions (les permissions sont remplacées par la nouvelle sélection). |
| **Activer / désactiver** | Désactiver **ferme immédiatement les sessions** de la personne. |
| **Supprimer** | Suppression **logique** (le compte est masqué et désactivé, les données historiques restent). |

Règles de sécurité :

- Personne ne peut modifier ou supprimer **son propre compte** depuis cet écran.
- Un **ADMIN** ne peut gérer que des comptes `USER` et `STAFF`, et **ne peut pas déléguer** les permissions
  `users.manage` / `users.permissions.manage`. **Seul le Super Admin** peut créer un ADMIN ou déléguer la gestion des utilisateurs.
- Les permissions sont vérifiées à chaque action ; une permission inexistante est refusée.

### 6.1 Comptes ambassadeurs — `/admin/ambassadeurs/comptes` (`ambassadors.accounts.manage`)

Réservé aux ADMIN / SUPER_ADMIN. Pour chaque compte d'ambassadeur :

- **Activer / désactiver** (déconnecte la personne),
- **Définir un nouveau mot de passe** (déconnecte aussi les sessions ouvertes),
- **Envoyer un lien de réinitialisation** par email.

Les informations globales du compte (région, édition, statut, 2FA…) sont affichées.

---

## 7. Contenus du site public

Chaque contenu se gère depuis son propre écran et apparaît sur le site public.

| Module | Écran | Permission | Points clés |
|---|---|---|---|
| **Actualités** | `/admin/actualites` | `news.manage` | Titre, **slug unique**, extrait, image de couverture (lien), catégorie, contenu, case **Publiée**. Seules les actualités publiées apparaissent sur le site. |
| **Intervenants** | `/admin/intervenants` | `speakers.manage` | Nom, fonction, organisation, photo (lien), biographie, **rattachement à une édition**. Affichés dans `/intervenants` et l'accueil (édition active). |
| **Partenaires** | `/admin/partenaires` | `partners.manage` | Nom, logo (lien), site web, **catégorie** (Institutionnel, Technique, Financier, Média, Autre) et édition. Groupés par catégorie sur `/partenaires`. |
| **Programme** | `/admin/programme` | `program.manage` | **Jours** (une date = un jour par édition) puis **sessions** : titre, type (Conférence, Panel, Atelier, Cérémonie, Autre), heure de début/fin, lieu, intervenants. Affiché sur `/programme`. |

Notes :

- Les images sont saisies par **URL** (aucun envoi de fichier depuis ces formulaires).
- L'accueil et les pages publiques lisent l'**édition active** : sans édition active, ces sections restent vides.
- La section « À propos » (vision, mission, objectifs, valeurs) et le **formulaire de contact** sont dans l'accueil.
  Les messages de contact sont enregistrés et envoyés par email à l'adresse configurée (`MAIL_AUTH_USER`) ; **il n'existe pas
  encore d'écran d'administration pour les relire** (voir [limites](#15-limites-connues)).
- La rubrique « Blogs » du menu est un reste du modèle de départ, sans lien avec le fonctionnement JNJL.

---

## 8. Candidatures Participants

**Menu : Candidatures Participants** — `/admin/candidatures/participants` · `applications.event.manage`.

**Côté public** : `/participer` — nom, prénom, email, téléphone, **sexe (Masculin ou Féminin, obligatoire)**, région, motivation. Le candidat n'a pas besoin de compte.

**Côté admin** : liste et fiche détaillée (informations groupées par catégorie). Trois décisions :

| Décision | Effet |
|---|---|
| **Accepter** | Statut *Retenu* + création de la **participation à l'événement** (`EventParticipation`). Notification + email. |
| **Refuser** | Statut *Non retenu*. Une candidature déjà acceptée ne peut plus être refusée. Notification + email. |
| **Liste d'attente** | Statut *Liste d'attente* (impossible si déjà acceptée). Notification + email. |

---

## 9. Jeunes Leaders

Tout utilisateur qui crée un compte (`/auth/signup`) est un **Jeune Leader** : il accède à son **espace personnel**
(`/dashboard`) avec son profil (ville, établissement, niveau d'études, biographie, compétences, centres d'intérêt, région),
un **taux de complétion du profil**, l'édition en cours et ses éventuelles candidatures ambassadeur. Le profil se modifie dans
**Mon profil** (`/profile`).

Il n'y a **pas d'écran d'administration dédié** aux Jeunes Leaders : ils apparaissent comme utilisateurs.

---

## 10. Parcours Ambassadeur — les 13 étapes

### 10.1 Vue d'ensemble

Chaque candidature ambassadeur porte une **étape** (`stage`) qui avance automatiquement selon les actions ci-dessous.
Un candidat sélectionné (directement ou par repêchage) passe **directement à l'engagement** : la demande de permission
et l'ordre de mission ne sont plus une étape bloquante (voir §10.8) — l'ambassadeur les génère lui-même, en libre-service,
une fois son engagement signé.

```
 1 Compte/Candidature ─▶ (acceptation admin) ─▶ 3 PAIEMENT ─▶ (paiement saisi) ─▶ 4 FORMATION
 ─▶ (tous modules terminés) ─▶ 5 QCM ─▶ (QCM soumis) ─▶ 6 CLASSEMENT ─▶ (sélection) ─▶ 7-8 REPÊCHAGE
 ─▶ 9 ENGAGEMENT ─▶ 10 BADGE ─▶ 11 EMBARQUEMENT ─▶ 12 PRÉSENCE ─▶ 13 ATTESTATION
```

| # | Étape | Qui agit | Écran | Permission | Passage à l'étape suivante |
|---|---|---|---|---|---|
| 1-2 | Candidature + région | Le jeune | `/ambassadeurs/candidature` | public | Acceptation par l'admin |
| — | Acceptation | Admin | Ambassadeurs › Candidatures | `applications.ambassador.manage` | → PAIEMENT |
| 3 | Paiement | Point focal | Paiements | `payments.manage` | → FORMATION |
| 4 | Formation | Ambassadeur | Ma formation | — | Tous les modules terminés → QCM |
| 5 | QCM | Ambassadeur | Mon QCM | — | QCM soumis → CLASSEMENT |
| 6 | Classement | Admin | Classement & Sélection | `selection.manage` | Sélection |
| 7 | Sélection | Admin | Classement & Sélection | `selection.manage` | → ENGAGEMENT (sélectionnés) |
| 8 | Repêchage | Admin | Repêchage | `repechage.manage` | Validé → ENGAGEMENT |
| 9 | Engagement | Ambassadeur | Mon engagement | (texte : `engagement.manage`) | Signature → BADGE |
| 10 | Badge | Admin | Badges | `badges.manage` | Attribution → EMBARQUEMENT |
| 11 | Embarquement | Point focal | Embarquement | `boarding.manage` | « Embarquer » → PRÉSENCE |
| 12 | Présence | Staff accueil | Présence | `attendance.manage` | Pointage → ATTESTATION |
| 13 | Attestation | Admin | Attestations | `documents.manage` | Terminal |

### 10.2 Candidatures — `/admin/ambassadeurs/candidatures`

**Formulaire public** (édition active obligatoire) : prénom, nom, email, téléphone, sexe (Masculin ou Féminin), situation de handicap (+ détails),
région, consentement. Une personne ne peut déposer qu'**une candidature par édition** (sauf si la précédente est « Non retenue »).

**Fiche admin** : informations classées par catégories. Deux décisions :

- **Accepter** : le système **crée le compte utilisateur** (rôle `USER`, actif, email considéré comme vérifié, mot de passe
  aléatoire inutilisable), passe la candidature en *Retenu* à l'étape **PAIEMENT**, puis **envoie un email** avec un lien pour
  définir son mot de passe. Si l'email échoue, le compte reste créé : utilisez ensuite « Envoyer un lien de réinitialisation »
  dans Comptes.
- **Rejeter** : demande un **motif** (obligatoire, mémorisé). Une candidature déjà retenue ne peut pas être rejetée. Notification + email.

### 10.3 Paiement — `/admin/paiements` (`payments.manage`)

Frais d'inscription de **5 000 FCFA**, perçus **en espèces par le point focal**. Le point focal ouvre « Enregistrer le paiement »,
vérifie le montant (modifiable en cas de tarif dérogatoire) et saisit une **référence** (n° de reçu papier). L'enregistrement :

- valide le paiement **immédiatement** (pas de seconde validation),
- génère un **reçu imprimable** (`/admin/paiements/[id]/recu`),
- fait passer l'ambassadeur à **FORMATION** et le notifie.

Règles : possible seulement pour une candidature **retenue** ; **un seul paiement** par candidat.

### 10.4 Formations — `/admin/formation` (`training.manage`)

Une **formation** regroupe des **modules** (titre, contenu, lien vidéo, ordre — tous réordonnables). Une édition peut avoir
**plusieurs formations**. Chaque formation a deux réglages :

| Réglage | Effet |
|---|---|
| **Obligatoire pour le parcours** | Doit être terminée avant le **QCM de classement** (voir §10.5). Quand **toutes les formations obligatoires** sont terminées, l'ambassadeur passe de l'étape FORMATION à QCM. Une formation non obligatoire n'entre pas dans ce calcul. |
| **Délivre une attestation** | Permet à l'admin de générer une **attestation de formation** (voir §10.13). |

**Contenu d'un module — éditeur riche (WYSIWYG)** : le champ « Contenu » est un éditeur complet dans l'esprit de CKEditor 5 :
titres 1 à 4, gras / italique / souligné / barré / exposant / indice / code, couleur du texte et surlignage, listes à puces, numérotées
et de tâches, alignement (gauche, centré, droite, justifié), liens, **images** (téléversement depuis l'ordinateur — JPEG, PNG, GIF, WebP, 4 Mo max — ou lien),
**tableaux** (barre d'actions dès que le curseur est dans un tableau : lignes, colonnes, fusion, en-tête), **vidéo YouTube**, citation, bloc de code,
ligne horizontale, annuler / rétablir, effacement de la mise en forme et compteur de mots. Le contenu est **nettoyé côté serveur** à l'enregistrement
(scripts, événements et liens dangereux supprimés). Les anciens contenus en texte simple sont convertis automatiquement en paragraphes.

**Lecture par l'ambassadeur** : dans **Mes formations**, chaque module s'ouvre dans un **lecteur** (`/ambassadeur/formation/[module]`) qui affiche la vidéo
et le contenu complet. Le bouton **« Marquer comme terminé » n'est disponible qu'après avoir fait défiler jusqu'à la fin du module**, et le serveur refuse
de terminer un module qui n'a pas été **ouvert** dans le lecteur (impossible de tout valider d'un coup). Le lecteur propose les modules précédent / suivant ;
un module terminé peut être relu librement. Quand tous les modules sont terminés, l'ambassadeur accède au QCM qui clôture la formation
(si un QCM y est rattaché).

Règles : on **ne peut pas supprimer** une formation déjà suivie (progression ou attestations existantes) ; supprimer une formation vierge supprime
ses modules et transforme ses QCM en **QCM libres**. L'édition d'une formation ne peut pas être changée.

> Les formations créées avant cette évolution ont été regroupées automatiquement dans une formation « Formation ambassadeurs »
> (obligatoire, sans attestation) : le fonctionnement existant est conservé.

### 10.5 QCM — `/admin/qcm` (`quiz.manage`)

Banque de questions → QCM → tentatives (détail complet dans [`module-qcm.md`](./module-qcm.md)). **Un QCM peut être lié ou non à une formation** :

| Type de QCM | Réglage | Accès pour l'ambassadeur | Effet |
|---|---|---|---|
| **Suite d'une formation** | « Formation liée » = une formation | Débloqué **quand cette formation est terminée** | Sa réussite conditionne l'**attestation** de la formation |
| **QCM de classement** | « Compte pour le classement régional » activé | Débloqué quand **toutes les formations obligatoires** sont terminées (ou dès le début s'il n'y en a pas) — sauf s'il est lié à une formation précise | Son score alimente le **classement** et la sélection |
| **QCM libre** | Aucune formation liée, pas de classement | **Toujours accessible** | Aucun effet sur le parcours (auto-évaluation, quiz thématique…) |

Les deux réglages sont **indépendants** : un QCM peut être à la fois lié à une formation *et* compter pour le classement.

- Sur **Mes QCM**, l'ambassadeur voit **tous** les QCM publiés de l'édition ; ceux qui suivent une formation non terminée sont **verrouillés**
  (avec la progression et un lien vers la formation).
- La correction se fait **côté serveur** ; le score ne peut pas être manipulé depuis le navigateur.
- **Seul le QCM « Compte pour le classement »** enregistre le score de l'ambassadeur (`quizScore`) et le fait passer à **CLASSEMENT**
  (uniquement s'il était encore à FORMATION ou QCM : passer un QCM plus tard ne le fait jamais reculer). C'est le **dernier score soumis** qui compte.
- Recommandation : n'activez « Compte pour le classement » que sur **un seul** QCM par édition.

### 10.6 Classement & Sélection — `/admin/selection` (`selection.manage`)

1. **Régler les quotas** par région (§5.2).
2. **Calculer le classement** : pour chaque région, les candidats retenus ayant un score QCM sont classés par score décroissant
   (rang 1 = meilleur). En cas d'égalité, aucun départage n'est défini : à surveiller pour le dernier rang du quota.
3. **Lancer la sélection** : dans chaque région, les candidats dont **rang ≤ quota** sont *Sélectionnés*, les autres *Non sélectionnés*.
   - Sélectionnés → étape **REPÊCHAGE** (ils franchissent ce point de contrôle).
   - Non sélectionnés → restent à **SÉLECTION**, en attente d'un éventuel repêchage.
   - Chaque candidat est **notifié** (in-app + email) ; relancer la sélection ne renotifie que ceux dont le résultat change.

> ⚠️ Un quota à **0** ne sélectionne personne dans la région. Recalculez le classement si de nouveaux scores arrivent, puis relancez la sélection.

### 10.7 Repêchage — `/admin/repechage` (`repechage.manage`)

Liste les candidats **non sélectionnés**. Le Super Admin/Admin décide **Valider** ou **Refuser**, avec une **justification obligatoire
(10 caractères minimum)**. Valider transforme le candidat en *Sélectionné* et le fait passer directement à **ENGAGEMENT** ;
refuser n'avance pas l'étape (le candidat reste non sélectionné). La décision et son auteur sont conservés ; le candidat est notifié.

### 10.8 Documents administratifs — `/admin/documents` (`documents.manage`)

La **demande de permission** et l'**ordre de mission** ne bloquent plus le parcours : dès que son **engagement est signé**,
chaque ambassadeur les génère lui-même en libre-service (**Mes documents › Demande de permission / Ordre de mission**) — un
court formulaire (établissement, niveau, moyen de transport…) remplit le vrai modèle Word officiel (signature et cachet
inclus) et produit un **.docx** téléchargeable immédiatement. La numérotation (`0001/AAAA/LA/AMG/AAF` pour la demande,
`001/LA/AM/RH/AAAA` pour l'ordre de mission) est **séquentielle et stable** : régénérer un document garde le même numéro.

Cet écran admin ne sert plus qu'à **consulter** ce que chaque ambassadeur a généré, ou à **déposer un document de secours**
(PDF **ou** .docx, 4 Mo max, contenu vérifié) si un cas particulier l'exige — un dépôt manuel remplace le document existant
mais **n'avance aucune étape**.

### 10.9 Engagement — `/admin/engagement` (`engagement.manage`)

- **Admin** : rédige le **texte de la fiche d'engagement** de l'édition (20 caractères minimum) et suit qui a signé (lien vers le PDF signé).
- **Ambassadeur** (étape ENGAGEMENT) : lit le texte et coche l'acceptation — **la case ne peut plus être décochée** une fois cochée.
  Le nom de signature est **repris automatiquement du compte** (plus de saisie manuelle). La plateforme génère un **PDF**
  (édition, ambassadeur, texte, signature, date/heure), le stocke, l'enregistre et passe l'ambassadeur à **BADGE**. Le
  **téléchargement n'est possible qu'une fois la case cochée**.
  Avant de cocher, un bouton **« Prévisualiser ma fiche »** affiche la fiche telle qu'elle sera générée (marquée « Aperçu — non signé »).
  Après signature, **« Prévisualiser ma fiche signée »** affiche le PDF directement dans la page (téléchargement possible).

### 10.10 Badge — `/admin/badges` (`badges.manage`)

Éligibles : ambassadeurs **ayant signé leur engagement**. Deux actions : **Attribuer** (un par un) ou **Attribuer à tous** (tous ceux à l'étape BADGE).

- Numéro unique au format **`JNJL-ANNÉE-AMB-0001`** (numérotation par édition), avec **QR code** encodant ce numéro.
- La **couleur de fond du badge** se règle par édition (Éditions › modifier › « Couleur de fond du badge ») ; les logos partenaires
  (`public/partenaires/`) et le logo JNJL sont fixes.
- L'attribution passe l'ambassadeur à **EMBARQUEMENT** et le notifie ; elle est **idempotente** (jamais deux badges pour la même édition).
- L'ambassadeur voit sa carte dans **Mon badge** (logo de la JNJL, nom, région, édition, numéro, QR) et le statut de son embarquement.
  Le bouton **« Télécharger mon badge (PDF) »** génère le badge au **format A6**, prêt à imprimer ou à garder sur téléphone (généré à la demande, réservé au propriétaire du badge).

### 10.11 Embarquement — `/admin/embarquement` (`boarding.manage`)

Liste des ambassadeurs badgés, **regroupés par région**, avec compteur « embarqués / total ». Le point focal choisit :

| Action | Effet |
|---|---|
| **Embarquer** | Statut *Embarqué* (validateur + date enregistrés) → étape **PRÉSENCE**. Notifie l'ambassadeur. |
| **Annuler** | Statut *Annulé* (depuis « En attente »). Notifie l'ambassadeur. |
| **Remettre en attente** | Retour à l'état initial (l'étape redevient EMBARQUEMENT). |

Règle : impossible de modifier un embarquement **une fois la présence pointée**.

### 10.12 Présence — `/admin/presence` (`attendance.manage`)

À l'accueil de l'événement : choisir l'édition et, au choix, **« Événement complet »** ou une **session** du programme, puis
**saisir ou scanner le numéro de badge** (un lecteur de code-barres/QR en mode clavier fonctionne dans le champ). Deux colonnes : les **ambassadeurs à pointer**
(embarqués, pas encore présents — bouton « Pointer ») et les **derniers pointages**.

Contrôles automatiques : badge inconnu pour l'édition, badge inactif, **déjà pointé** (par session), et **embarquement non validé** → refusé.
Le premier pointage d'un ambassadeur passe son étape à **ATTESTATION** et crée sa **participation** à l'édition.

### 10.13 Attestation — `/admin/attestations` (`documents.manage`)

**Attestation de participation JNJL** (à ne pas confondre avec les attestations de formation ci-dessous) : liste des ambassadeurs
pointés présents. **Générer l'attestation** (ou **Générer pour tous**) produit le **document officiel JNJL** (même mise en page
que l'original — bordure, logos, signature et cachet — avec nom, thème de l'édition, date, lieu et édition insérés dynamiquement),
le stocke, l'enregistre comme document et **notifie** l'ambassadeur. Une attestation déjà générée n'est pas régénérée. L'ambassadeur
la consulte dans **Mon attestation**. Une présence enregistrée est indispensable.

**Attestations de formation** (même écran, section du dessous) : choisissez une **formation** qui délivre une attestation. La liste montre chaque ambassadeur
qui l'a commencée, avec sa progression (**modules terminés** et **QCM liés réussis**) :

- **Éligible** = tous les modules terminés **et** tous les QCM publiés liés à la formation réussis (seuil de réussite du QCM). Sans QCM lié, seuls les modules comptent.
- **Générer l'attestation** (ou **Générer pour tous les éligibles**) crée un PDF (formation, nom, région, édition, meilleur score, référence + QR), l'enregistre
  et **notifie** l'ambassadeur. L'éligibilité est **revérifiée côté serveur** à la génération ; une attestation déjà émise n'est pas régénérée.
- L'ambassadeur la trouve dans **Mes formations** (sous la formation) et dans **Mon attestation**.

---

## 11. Statistiques et exports

**Menu : Statistiques** — `/admin/statistiques` (permission `stats.view`). `/admin` redirige ici.

Choisir l'**édition** :

- **Indicateurs nationaux** : candidatures ambassadeurs, paiements validés (+ FCFA encaissés), sélectionnés, badges émis, embarqués,
  ambassadeurs présents, candidatures participants, candidatures Jeunes Leaders.
- **Entonnoir** : nombre de candidats retenus à chaque étape.
- **Répartition des statuts** (ambassadeurs et participants).
- **Tableau par région** : quota, candidatures, payés, sélectionnés, embarqués, présents.

**Exports CSV** (lisibles dans Excel, accents conservés, séparateur `;`) :

- **Ambassadeurs** (permission `applications.ambassador.manage`) : identité, région, statut, étape, score, rang, paiement, sélection, embarquement, date.
- **Participants** (permission `applications.event.manage`) : identité, région, statut, date.

Par sécurité, les cellules commençant par `=` ou `@` sont neutralisées (protection contre l'injection de formules).

---

## 12. Notifications et emails

Chaque utilisateur a une page **Notifications** (`/dashboard/notifications`) : liste, marquage « lue » individuel ou global.

| Événement | Notification in-app | Email |
|---|---|---|
| Participant : accepté / refusé / liste d'attente | si le candidat a un compte | oui |
| Ambassadeur retenu | oui | non (l'email de création de mot de passe part déjà) |
| Ambassadeur refusé (motif) | si compte | oui |
| Paiement validé | oui | non |
| Résultat de la sélection | oui | oui |
| Repêchage accepté / refusé | oui | oui |
| Badge attribué | oui | non |
| Embarquement validé / annulé | oui | non |
| Attestation disponible | oui | non |

Une notification qui échoue **n'interrompt jamais** l'action principale (ex. un email en panne n'empêche pas d'accepter une candidature).
Les emails nécessitent les variables `MAIL_HOST`, `MAIL_PORT`, `MAIL_AUTH_USER`, `MAIL_AUTH_PASS`.

---

## 13. Stockage des fichiers

Les PDF (engagements, attestations, documents administratifs) sont enregistrés via un module unique :

- **Développement** : dossier local `public/uploads/`.
- **Production (Vercel)** : **Cloudflare R2 obligatoire**. Variables : `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET`, `R2_PUBLIC_URL` (URL publique du bucket). Sans elles, en production, l'envoi/génération de fichiers échoue avec un message explicite.

Les fichiers sont nommés avec un identifiant aléatoire, les PDF/images sont contrôlés sur leur **contenu réel** (pas seulement l'extension).

**Organisation des dossiers** (identique dans R2 et dans `public/uploads/`, définie dans `lib/storage-paths.ts`) :

| Dossier | Contenu |
|---|---|
| `users/{userId}/avatar/` | photo de profil téléversée par l'utilisateur (carré WebP 512 px) |
| `editions/{année}/engagements/` | fiches d'engagement signées |
| `editions/{année}/documents/` | demande de permission, ordre de mission |
| `editions/{année}/certificates/` | attestations de participation |
| `editions/{année}/training-certificates/` | attestations de formation |
| `content/editor/{année}/` | images insérées dans les contenus riches (éditeur) |
| `misc/` | autres fichiers (route `/api/upload`) |

Regrouper par édition permet d'archiver ou de purger une édition entière. Les fichiers déjà enregistrés **avant** cette organisation gardent leur ancien emplacement (leurs URL en base restent valides) ; seuls les nouveaux fichiers suivent la nouvelle structure.

**Photo de profil** : depuis la page Profil (crayon sur la photo), l'utilisateur choisit un avatar prédéfini (`public/avatar/`, liste dans `lib/avatars.ts`) ou téléverse sa photo. Elle est recadrée en carré et ré-encodée côté serveur (métadonnées EXIF/GPS supprimées) ; l'ancienne photo téléversée est supprimée du stockage à chaque changement.

---

## 14. Référencement (SEO)

Le site public est prêt pour les moteurs de recherche :

- **Titre, description, URL canonique, Open Graph et Twitter** propres à chaque page (`lib/seo.ts`, `buildMetadata()`). Les actualités et les éditions passées utilisent leur propre titre, résumé et image.
- **Données structurées (schema.org)** : Organisation et Site sur l'accueil, Événement (édition), Article (actualités), fil d'Ariane.
- **`/sitemap.xml`** généré automatiquement (pages publiques + actualités publiées + éditions archivées) et **`/robots.txt`**.
- **Zones privées** (admin, ambassadeur, dashboard, profil, connexion, API) : exclues de `robots.txt` et marquées `noindex` par en-tête HTTP.
- Image de partage `public/og-image.jpg` (1200×630), manifeste web, langue du site déclarée en français.

**À faire une fois en production** (par le propriétaire du site) :
1. Vérifier que `NEXT_PUBLIC_APP_URL` vaut l'adresse publique exacte (`https://…`, sans `/` final) : elle sert à toutes les URL du sitemap, canonical et Open Graph.
2. Créer la propriété dans **Google Search Console** et **Bing Webmaster Tools**, puis renseigner dans Vercel `GOOGLE_VERIFICATION` (et `BING_VERIFICATION`) avec le code de vérification fourni.
3. Soumettre `https://<votre-domaine>/sitemap.xml` dans les deux outils.
4. Pour un bon classement : publier régulièrement des actualités (titre clair, résumé de 1 à 2 phrases, image de couverture), ajouter des photos avec le nom de l'édition, et remplacer le numéro de téléphone provisoire du pied de page/contact.

---

## 15. Limites connues

À savoir avant de compter dessus :

| Sujet | Situation |
|---|---|
| **Messages de contact** | Enregistrés et envoyés par email, mais **aucun écran** pour les consulter dans l'admin. |
| **Jeunes Leaders** | Pas d'écran de gestion dédié (visibles via Utilisateurs). |
| **Authentification à deux facteurs** | Le **code 2FA est demandé à la connexion** si le compte l'a activée, mais **aucun écran ne permet de l'activer** pour l'instant. |
| **Impersonation** | Réservée au rôle **ADMIN** (pas au Super Admin), limitée à 15 min ; aucun bouton n'est actuellement présent dans l'interface. |
| **Point focal** | La permission `boarding.manage` / `payments.manage` donne accès à **toutes les régions** (pas de limitation à « sa » région). |
| **Score QCM** | C'est le **dernier** score soumis au QCM de classement qui compte, pas le meilleur. Pas de départage en cas d'égalité au classement. |
| **QCM de classement** | Rien n'empêche d'en marquer plusieurs sur une édition : le dernier soumis écraserait le score. N'en activez qu'un. |
| **Formations / QCM** | Réservés aux **ambassadeurs** (progression et tentatives liées à leur candidature) ; pas encore ouverts aux autres comptes. |
| **Documents administratifs** | Déposés en PDF, non générés automatiquement. |
| **Images** | Photos, logos et couvertures sont des **liens** (pas d'envoi de fichier depuis ces formulaires). Seule exception : l'éditeur riche des modules de formation permet de téléverser des images. |
| **Lecture des modules** | Le serveur vérifie que le module a été **ouvert** ; « avoir réellement lu » ne peut pas être garanti (le défilement jusqu'en bas est contrôlé côté navigateur). |
| **Tests** | Les modules Badge, Embarquement, Présence, Attestation, Statistiques, Notifications et Archivage d'édition ont été vérifiés par analyse de code, mais **pas encore validés de bout en bout dans l'interface** : faites un essai complet (voir §15.3). |
| **Migrations base de données** | Le dossier `prisma/migrations` n'est pas versionné dans Git. |

---

## 16. Dépannage

### 15.1 Problèmes courants

| Symptôme | Cause probable | Solution |
|---|---|---|
| « Permission requise : … » | Le compte n'a pas la permission | Utilisateurs › Modifier › cocher la permission (ou utiliser un Super Admin) |
| Un module n'apparaît pas dans le menu | Rôle ou permission manquants | Idem ; se reconnecter après modification |
| Les candidatures publiques échouent (« édition… ») | Aucune édition **active** | Éditions › Activer |
| Personne n'est sélectionné | Quotas à 0, ou classement non calculé | Régler les quotas, calculer le classement, relancer la sélection |
| Aucun score / classement vide | Aucun QCM n'a « Compte pour le classement » | Ouvrir le QCM › Paramètres › activer « Compte pour le classement » |
| Un QCM reste verrouillé pour l'ambassadeur | Sa formation liée (ou les formations obligatoires) n'est pas terminée | Vérifier la progression dans Formations ; ou délier le QCM (Formation liée = Aucune) |
| Un ambassadeur n'est pas éligible à l'attestation de formation | Module non terminé ou QCM lié non réussi (ou non publié : un QCM en brouillon n'est pas exigé) | Consulter les compteurs « Modules x/y · QCM réussis x/y » |
| Impossible d'archiver une édition | C'est l'édition active | Activer une autre édition d'abord |
| Rien sur `/editions` | Aucune édition **archivée** | Archiver l'édition terminée |
| Ambassadeur n'a pas reçu l'accès | Email non parti | Ambassadeurs › Comptes › envoyer un lien de réinitialisation |
| Le badge ne s'attribue pas | Engagement non signé | Vérifier Engagement (l'ambassadeur doit signer) |
| Pointage refusé « embarquement non validé » | Étape Embarquement non faite | Embarquement › « Embarquer » |
| Attestation impossible | Aucune présence enregistrée | Pointer la présence d'abord |
| Erreur d'envoi de fichier en ligne | R2 non configuré | Renseigner les variables `R2_*` (§13) |
| Page blanche / erreur base de données en ligne | `DATABASE_URL` absente sur Vercel | Renseigner les variables d'environnement Vercel |

### 15.2 Après une mise à jour du code

- Nouvelles permissions : relancer le **seed** (`npm run seed`) pour les créer et les attribuer aux comptes de démonstration ;
  pour vos propres comptes, cochez-les dans Utilisateurs.
- Nouvelle table/colonne : appliquer les migrations (`prisma migrate deploy`).

### 15.3 Essai de bout en bout recommandé

1. Éditions : créer, activer, régler quotas.
2. Formulaire public : déposer une candidature ambassadeur de test.
3. Accepter → vérifier le compte créé et l'email.
4. Point focal : enregistrer le paiement.
5. Se connecter comme l'ambassadeur : formation → QCM.
6. Classement → Sélection.
7. Documents (2 PDF) → Engagement (signature).
8. Badge → Embarquement → Présence (numéro du badge) → Attestation.
9. Statistiques : vérifier les compteurs ; tester les exports.
10. Archiver l'édition et vérifier `/editions`.

---

## 17. Annexe — permissions et comptes de démonstration

### 16.1 Catalogue des permissions

| Catégorie | Code | Rôle |
|---|---|---|
| Éditions | `editions.manage` | Créer/modifier les éditions, chiffres clés |
| | `editions.publish` | Activer / publier |
| | `editions.archive` | Archiver |
| Utilisateurs | `users.manage` | Gérer les utilisateurs internes |
| | `users.permissions.manage` | Attribuer les permissions |
| Candidatures | `applications.event.manage` | Candidatures Participants |
| | `applications.leader.manage` | Candidatures Jeunes Leaders (réservé) |
| | `applications.ambassador.manage` | Candidatures Ambassadeurs |
| Ambassadeurs | `regions.manage` | Régions |
| | `quotas.manage` | Quotas régionaux |
| | `payments.manage` | Saisir un paiement (point focal) |
| | `payments.validate` | Valider un paiement (réservé) |
| | `training.manage` | Modules de formation |
| | `quiz.manage` | QCM |
| | `ambassadors.accounts.manage` | Comptes ambassadeurs |
| | `selection.manage` | Classement et sélection |
| | `repechage.manage` | Repêchages |
| | `engagement.manage` | Fiche d'engagement |
| | `boarding.manage` | Embarquements |
| Événements | `program.manage` | Programme |
| | `speakers.manage` | Intervenants |
| | `partners.manage` | Partenaires |
| Contenus | `news.manage` | Actualités |
| | `media.manage` | Galerie médias |
| | `contact.manage` | Messages de contact (sans écran à ce jour) |
| Présence | `attendance.manage` | Pointage |
| Documents | `documents.manage` | Documents administratifs + attestations |
| | `badges.manage` | Badges |
| Statistiques | `stats.view` | Statistiques et exports |
| Paramètres | `settings.manage` | Paramètres généraux |

Le **Super Admin** dispose de **toutes** ces permissions sans attribution.

### 16.2 Comptes de démonstration (créés par `npm run seed`)

| Compte | Rôle | Usage |
|---|---|---|
| `superadmin@jnjl.ne` | SUPER_ADMIN | Accès global |
| `admin@jnjl.ne` | ADMIN | Éditions, contenus, candidatures, parcours ambassadeur, badges, embarquement, présence, statistiques |
| `staff@jnjl.ne` | STAFF | Pointage de présence, candidatures participants |
| `pointfocal@jnjl.ne` | STAFF | Paiements et embarquements |
| (compte administrateur historique) | ADMIN | Toutes les permissions, pour les tests |

**Lot de comptes pour testeurs externes** — mot de passe unique `JnjlTest#2026` (constante `TEST_ACCOUNTS_PASSWORD` dans `prisma/seed.ts`) :

| Compte | Rôle | Région (STAFF) | Permissions |
|---|---|---|---|
| `test.superadmin@jnjl.ne` | SUPER_ADMIN | — | Accès global |
| `test.admin1@jnjl.ne`, `test.admin2@jnjl.ne` | ADMIN | — | Toutes les permissions |
| `test.staff.<code>@jnjl.ne` (agd, dif, dos, mar, nia, tah, til, zin) | STAFF | Une par région | `payments.manage`, `boarding.manage`, `attendance.manage` |

Chaque compte `test.staff.*` est rattaché (`focalRegionId`) à sa région : il ne voit que les candidats de cette région dans Paiements, Embarquement et Présence. Le guide de démarrage intégré à l'application (**Guide du parcours**, `/admin/guide`) explique le rôle de chacun.

Les **mots de passe de démonstration** sont définis dans `prisma/seed.ts`. **Changez-les (ou supprimez ces comptes) avant toute mise en production.**
