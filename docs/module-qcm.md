# Module QCM — Documentation

Ce document explique le module QCM (Questionnaire à Choix Multiples) de la plateforme
JNJL : à quoi il sert, comment il fonctionne techniquement, et comment l'utiliser
(côté administrateur et côté ambassadeur).

## 1. Objectif

Permettre à un administrateur de créer et gérer des QCM d'évaluation pour les
ambassadeurs **sans jamais coder une question en dur**. Toutes les questions sont
stockées en base de données, organisées dans une banque réutilisable, puis assemblées
dans un ou plusieurs QCM.

Le QCM s'inscrit dans le parcours ambassadeur défini par le cahier des charges :

```
CANDIDATURE → PAIEMENT → FORMATION → QCM → CLASSEMENT → SÉLECTION → REPÊCHAGE → ...
```

Le score obtenu au QCM (`AmbassadorApplication.quizScore`) est destiné à alimenter le
classement régional et la sélection automatique par quota (modules à construire
séparément — voir §7 « Ce qui n'est pas encore fait »).

## 2. Modèle de données

```
QuestionCategory (banque, ex. "Leadership", "Culture générale")
        │
        ▼
    Question (texte, type, points, actif/inactif)
        │
        ▼
  QuestionOption (texte de la réponse, bonne/mauvaise)


Edition
   │
   ▼
  Quiz (titre, statut, durée, seuil de réussite, tentatives autorisées,
        mélange questions/réponses, affichage du score/corrections)
   │
   ▼
QuizQuestion (pivot : ordre + points spécifiques à ce QCM)
   │
   ▼
 Question (référence vers la banque)


AmbassadorApplication
        │
        ▼
   QuizAttempt (une tentative : statut, score, %, admis/non admis)
        │
        ▼
    QuizAnswer (réponse donnée à chaque question, correction figée à la soumission)
```

Points clés de conception :

- **La banque de questions est indépendante des QCM.** Une même question peut être
  réutilisée dans plusieurs QCM (`QuizQuestion` est une table pivot).
- **Le pivot `QuizQuestion` porte son propre nombre de points**, qui peut différer du
  barème par défaut de la question (`Question.points`).
- **Une question utilisée dans un QCM ne peut pas être supprimée** (protection dans
  `deleteQuestionAction`) — il faut d'abord la retirer de tous les QCM.
- **Une catégorie contenant des questions ne peut pas être supprimée** (même logique
  dans `deleteQuestionCategoryAction`).
- **`QuizAttempt.questionOrder`** fige l'ordre des questions au moment où la tentative
  démarre (utile si « mélanger les questions » est activé : chaque candidat peut avoir
  un ordre différent, mais son propre ordre reste stable s'il recharge la page).

## 3. Sécurité de la correction

Le point le plus important du module : **la correction ne se fait jamais côté
client**.

- Le joueur ne reçoit jamais `isCorrect` avant d'avoir soumis sa tentative
  (`getAttemptForPlayer` ne renvoie que `id` et `text` pour chaque option).
- `saveQuizAnswerAction` enregistre la réponse choisie sans la corriger.
- `submitQuizAttemptAction` recharge les bonnes réponses depuis la base, calcule le
  score, le pourcentage et le résultat (admis/non admis), et **fige** ces valeurs sur
  `QuizAttempt`. Impossible de modifier son score en manipulant le navigateur.
- Le minuteur est indicatif côté client (`QuizPlayer`), mais **le serveur ignore toute
  notion de temps envoyée par le client** — il n'y a d'ailleurs aucune vérification de
  délai côté serveur à la soumission (voir limitation §7).

## 4. Guide d'utilisation — Administrateur

Accès : menu **QCM** dans la barre latérale admin (nécessite la permission
`quiz.manage`, déjà attribuée à `ADMIN`/`SUPER_ADMIN` par défaut).

### Étape 1 — Créer des catégories

`/admin/qcm/categories` → **Ajouter une catégorie**. Donnez un nom (ex. « Leadership »,
« Culture générale ») et une description optionnelle. Les catégories permettent de
filtrer et d'organiser la banque de questions.

### Étape 2 — Alimenter la banque de questions

`/admin/qcm/questions` → **Ajouter une question**. Pour chaque question :

- **Catégorie** — obligatoire, doit exister au préalable.
- **Type** : Choix unique, Choix multiple, ou Vrai/Faux.
- **Points** — barème par défaut (peut être ajusté par QCM ensuite).
- **Réponses** — au moins 2, cochez la ou les bonnes réponses (une seule pour
  Choix unique / Vrai-Faux, plusieurs possibles pour Choix multiple).
- **Explication** (optionnel) — affichée au candidat après correction, si le QCM
  l'autorise.
- **Active** — une question inactive reste consultable mais ne peut plus être ajoutée
  à un nouveau QCM.

Une question déjà utilisée dans un QCM publié n'est modifiable qu'avec prudence : la
modifier change la question pour toutes les tentatives passées et futures qui la
référencent (aucun verrouillage automatique n'est en place — voir §7).

### Étape 3 — Créer un QCM

`/admin/qcm` → **Créer un QCM**. Renseignez :

| Champ | Rôle |
|---|---|
| Titre / Description | Affichés à l'ambassadeur |
| Édition | Le QCM est toujours rattaché à une édition |
| Durée (minutes) | Optionnelle — si vide, pas de minuteur |
| Score minimum (%) | Seuil de réussite (par défaut 70%) |
| Tentatives autorisées | Nombre d'essais possibles par candidat |
| Mélanger les questions / réponses | Anti-copiage entre candidats |
| Afficher le score au candidat | Sinon, message générique « QCM soumis » |
| Afficher les corrections | Détail question par question après soumission |

Le QCM démarre en statut **Brouillon**.

### Étape 4 — Composer le QCM

Sur la page du QCM (`/admin/qcm/[id]`) : **Ajouter depuis la banque** ouvre une liste
des questions actives non encore présentes dans ce QCM. Cliquez sur le `+` pour
ajouter une question. Vous pouvez ensuite :

- **Monter / Descendre** pour réordonner (l'ordre s'applique quand « mélanger les
  questions » est désactivé).
- **Retirer** une question du QCM (elle reste dans la banque).

### Étape 5 — Publier

Un QCM sans question ne peut pas être publié. Le bouton **Publier** passe le statut à
**Publié** — c'est à partir de ce moment que le QCM devient visible et jouable pour les
ambassadeurs éligibles de l'édition concernée. **Repasser en brouillon** ou
**Archiver** sont possibles à tout moment.

### Étape 6 — Consulter les résultats

Icône graphique sur la liste des QCM, ou `/admin/qcm/[id]/resultats` : liste des
tentatives terminées, triées par score décroissant, avec taux de réussite et moyenne.

## 5. Guide d'utilisation — Ambassadeur

Accès : menu **Mon QCM** (`/ambassadeur/qcm`), visible pour tout compte de rôle
`USER`.

1. La page affiche le QCM publié de l'édition active **si** le compte de l'ambassadeur
   est lié à une candidature (`AmbassadorApplication.userId`) sur cette édition.
2. **Commencer le QCM** crée une tentative et redirige vers `/ambassadeur/qcm/passer`.
3. Le joueur répond question par question (navigation Précédente/Suivante, ou clic
   direct sur un numéro). Chaque réponse est sauvegardée automatiquement dès qu'elle
   est cochée.
4. Si une durée est configurée, un minuteur s'affiche et **soumet automatiquement** le
   QCM à expiration.
5. **Terminer le QCM** (avec confirmation) soumet la tentative et affiche le résultat
   (`/ambassadeur/qcm/resultat/[attemptId]`) : score, admis/non admis, et corrections
   détaillées si le QCM les autorise.
6. Si l'ambassadeur ferme l'onglet en cours de route, revenir sur **Mon QCM** propose
   **Reprendre le QCM** (la tentative `IN_PROGRESS` est conservée).
7. Une fois toutes les tentatives autorisées épuisées, le bouton disparaît et un
   message l'indique.

## 6. Fichiers du module

```
prisma/schema.prisma          Modèles QuestionCategory, Question, QuestionOption,
                               Quiz, QuizQuestion, QuizAttempt, QuizAnswer

schemas/question-category.ts  Validation Zod — catégories
schemas/question.ts           Validation Zod — questions (règles par type)
schemas/quiz.ts               Validation Zod — paramètres du QCM

actions/question-category-actions.ts   CRUD catégories (admin)
actions/question-actions.ts            CRUD banque de questions (admin)
actions/quiz-actions.ts                CRUD QCM + composition + publication (admin)
actions/quiz-attempt-actions.ts        Démarrage / réponses / correction / résultats
                                        (ambassadeur) + résultats agrégés (admin)

components/admin/QuestionCategoryManager.tsx  Liste + dialog catégories
components/admin/QuestionCategoryDialog.tsx
components/admin/QuestionManager.tsx          Liste + filtres banque de questions
components/admin/QuestionForm.tsx             Formulaire question (réponses dynamiques)
components/admin/QuestionCreateDialog.tsx
components/admin/QuizManager.tsx              Liste des QCM
components/admin/QuizForm.tsx                 Paramètres d'un QCM
components/admin/QuizCreateDialog.tsx
components/admin/QuizBuilder.tsx              Page de composition d'un QCM
components/admin/QuizAddQuestionDialog.tsx    Sélecteur "ajouter depuis la banque"
components/admin/QuizResults.tsx              Tableau de résultats + stats

components/ambassador/QuizPlayer.tsx          Interface de passage du QCM (minuteur,
                                               navigation, sauvegarde, soumission)

app/(dashboard)/admin/qcm/**                  Pages admin
app/(dashboard)/ambassadeur/qcm/**            Pages ambassadeur
```

## 7. Ce qui n'est pas encore fait

Ces points sont hors du périmètre initial du module QCM et restent à construire :

- **Classement régional et sélection automatique par quota** (`Selection`,
  `RegionalQuota`, `Repechage` dans le schéma) — le score du QCM est déjà écrit sur
  `AmbassadorApplication.quizScore` pour qu'un futur module puisse s'y brancher.
- **Verrouillage d'une question déjà utilisée dans un QCM publié** — modifier une
  question après coup change la question pour toutes les tentatives (passées et
  futures). Une stratégie de versioning serait nécessaire pour un usage en production
  à grande échelle.
- **Vérification serveur du dépassement de délai** — le minuteur déclenche une
  soumission automatique côté client, mais rien n'empêche aujourd'hui une soumission
  tardive si le client ne déclenche pas cet appel (pas de contrôle `deadlineAt` dans
  `submitQuizAttemptAction`).
- **Types « Réponse courte » / association** — seuls Choix unique, Choix multiple et
  Vrai/Faux sont implémentés.

## 8. Permissions

Toutes les actions admin (`question-category-actions.ts`, `question-actions.ts`,
`quiz-actions.ts`, et la partie admin de `quiz-attempt-actions.ts`) exigent la
permission `quiz.manage`, déjà présente dans le catalogue de permissions
(`prisma/seed.ts`) et attribuable à un compte `ADMIN`/`STAFF` via
`/admin/users`. Les comptes `SUPER_ADMIN` y ont accès sans attribution explicite
(bypass global).
