# JNJL — Plateforme de la Journée Nationale du Jeune Leader

Plateforme officielle de la **Journée Nationale du Jeune Leader (JNJL)**, au Niger. Elle réunit :

- le **site public** de l'événement (présentation, actualités, programme, intervenants, partenaires, éditions passées) ;
- le **parcours des ambassadeurs** : candidature, paiement des frais, formation, QCM, classement régional, engagement, badge, attestation ;
- l'**inscription des participants** à l'événement, avec badge téléchargeable ;
- l'**espace d'administration** : gestion des éditions, des candidatures, des contenus, des paiements et des statistiques.

Site en production : <https://jnjl.ne>

Guides détaillés : [`docs/guide-super-admin.md`](docs/guide-super-admin.md) (tous les modules, du point de vue d'un administrateur) et [`docs/module-qcm.md`](docs/module-qcm.md).

---

## Technologies

| Domaine | Choix |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) · React 19 · TypeScript |
| Base de données | PostgreSQL via Prisma (hébergée sur Neon) |
| Authentification | JWT RS256 chiffrés en AES-256-GCM, refresh tokens hashés, 2FA TOTP |
| Interface | Tailwind CSS 3 · shadcn/ui (Radix, Base UI) · Lucide · GSAP / Framer Motion |
| Éditeur de contenu | Tiptap (actualités, supports de formation) |
| Fichiers | Cloudflare R2 (production) ou disque local (développement) |
| E-mails | Resend |
| Paiement en ligne | i-pay (liens de paiement hébergés, webhook, rattrapage) |
| Documents | Modèles Word (docxtemplater + PizZip), PDF (pdf-lib), QR codes |
| Cache et limitation de débit | Redis (ioredis) en plus d'une limite en mémoire dans le middleware |
| Journalisation | Pino |
| Tests | Jest |
| Hébergement | Vercel |

---

## Fonctionnalités

### Site public
- Accueil, À propos, Actualités, Programme, Intervenants, Partenaires, Éditions précédentes, Contact.
- **Ouverture des candidatures pilotée depuis l'administration** : les candidatures ambassadeurs et les inscriptions des participants s'ouvrent ou se ferment depuis *Paramètres*. Une page fermée l'indique clairement, le menu et les boutons s'adaptent, et les envois sont refusés côté serveur.
- Bouton WhatsApp flottant dont le lien se règle dans *Paramètres*.
- Référencement : métadonnées par page, `sitemap.xml`, `robots.txt`, données structurées.

### Parcours ambassadeur
Étapes : candidature → paiement → formation → QCM → classement → sélection → repêchage → documents → engagement → badge → embarquement → présence → attestation.

- Paiement en ligne obligatoire pour accéder à la suite du parcours (le paiement manuel reste possible, sur autorisation d'un administrateur).
- Formation en ligne ou présentielle (suivie par les points focaux régionaux).
- QCM de classement, quotas et sélection par région.
- Fiche d'engagement, ordre de mission et demande de permission générés à partir des **modèles Word officiels** (`lib/document-templates/`).
- Badge et attestation générés en PDF, avec QR code.

### Administration
- Rôles et permissions fines, avec limitation par région pour le personnel régional.
- Statistiques par édition, région et sexe.
- Éditeur de modèles de documents, galerie, partenaires, intervenants, programme, actualités.
- Suivi des paiements en ligne (en attente, échoués, doublons, écarts de montant).
- Notifications dans l'application et par e-mail.

---

## Démarrage

### Prérequis
- Node.js 18 ou plus récent
- Une base PostgreSQL (Neon recommandé)
- Redis (facultatif en développement : la limitation de débit s'en passe si Redis est absent)

### Installation

```bash
npm install
cp .env.example .env     # puis renseigner les variables (voir ci-dessous)
npm run db:push          # synchronise le schéma Prisma avec la base
npm run seed             # données de départ (rôles, permissions, comptes de test)
npm run dev
```

L'application est servie sur <http://localhost:3000>.

### Variables d'environnement

Toutes les valeurs se renseignent dans `.env` (jamais versionné) et, en production, dans les variables du projet Vercel. Le fichier [`.env.example`](.env.example) liste les noms.

| Variable | Rôle |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Connexion à PostgreSQL (la seconde sert aux migrations) |
| `NEXT_PUBLIC_APP_URL` | URL publique du site (sans redirection : utiliser le domaine principal) |
| `RSA_PRIVATE_KEY`, `RSA_PUBLIC_KEY` | Paire de clés RS256 pour signer les JWT |
| `AES_SECRET_KEY` | Clé de 32 octets en base64 pour chiffrer les jetons |
| `REDIS_URL` | Connexion Redis |
| `RESEND_API_KEY`, `MAIL_FROM`, `CONTACT_EMAIL` | E-mails : clé, expéditeur (domaine vérifié) et destinataire du formulaire de contact |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Stockage des fichiers (sans elles : disque local) |
| `IPAY_SECRET_KEY`, `IPAY_ENV`, `IPAY_WEBHOOK_SECRET` | Paiement i-pay (`IPAY_ENV` vaut `sandbox` ou `live`) |
| `CRON_SECRET` | Protège la route de rattrapage des paiements |
| `LOG_LEVEL` | Niveau de journalisation (`debug`, `info`…) |

Générer les clés de sécurité :

```bash
openssl genrsa -out private.pem 2048          # puis en extraire la clé publique
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # AES_SECRET_KEY
```

> Ne jamais copier de vraies valeurs dans `.env.example`, dans le code ou dans un message : ce fichier est publié avec le dépôt.

### Scripts

| Commande | Usage |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run type-check` | Vérification TypeScript |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Tests Jest |
| `npm run db:push` | Synchronise le schéma avec la base |
| `npm run db:migrate` | Crée et applique une migration |
| `npm run db:studio` | Interface Prisma Studio |
| `npm run seed` / `npm run seed:qcm` | Données de départ / banque de questions |

---

## Structure du projet

```
app/
  (public)/        Site public (accueil, actualités, programme, participer, candidature ambassadeur…)
  (dashboard)/
    admin/         Espace d'administration (un dossier par module)
    ambassadeur/   Espace de l'ambassadeur (paiement, formation, QCM, engagement, badge…)
  auth/            Connexion, inscription, réinitialisation du mot de passe
  api/             Routes API (authentification, candidatures, paiement i-pay, cron, santé)
actions/           Server Actions (logique métier côté serveur)
components/        Composants (site, admin, ambassadeur, interface commune)
lib/               Briques techniques : jetons, e-mails, paiement, PDF, stockage, permissions…
  document-templates/   Modèles Word officiels
prisma/            Schéma de la base et données de départ
schemas/           Schémas de validation Zod
settings/          Configuration centrale, navigation, charte graphique
docs/              Guides d'administration
middleware.ts      Authentification, CSP à nonce, limitation de débit
```

---

## Rôles et permissions

Rôles : `SUPER_ADMIN`, `ADMIN`, `STAFF`, `WEBMASTER` (contenus du site public) et `USER`.

- Le `SUPER_ADMIN` a un accès global.
- Un `ADMIN`, un `STAFF` ou un `WEBMASTER` ne reçoit que les **permissions attribuées individuellement**.
- Le personnel régional est limité à sa région.
- La navigation et la protection des routes reposent sur la même liste (`settings/navigation.ts`).

Les modules et leurs règles sont détaillés dans le [guide administrateur](docs/guide-super-admin.md).

---

## Sécurité

- **Jetons** : JWT signés RS256 puis chiffrés AES-256-GCM, stockés dans des cookies `httpOnly` ; refresh tokens hashés en base.
- **2FA** TOTP, backoff progressif sur les échecs de connexion, notification en cas de nouvelle connexion.
- **Limitation de débit en deux couches** : en mémoire dans le middleware (Edge), puis Redis sur les routes sensibles. Le formulaire de contact ajoute un champ piège, un délai minimum, des limites par adresse IP et par e-mail, et un plafond de liens.
- **CSP** avec nonce généré à chaque requête, et en-têtes de sécurité (`HSTS`, `X-Frame-Options`, `Permissions-Policy`…).
- **Mots de passe** : détection des mots de passe compromis par k-anonymat (HIBP).
- **Fichiers** : vérification de la signature binaire, nom de fichier remplacé par un identifiant aléatoire.
- **Contenu riche** : le HTML des éditeurs est nettoyé côté serveur avant enregistrement et avant affichage.
- **Journal d'audit** des actions sensibles et **impersonation** administrateur limitée à 15 minutes, non renouvelable.
- Les e-mails d'accès contiennent un mot de passe provisoire à changer à la première connexion.

---

## Paiement en ligne (i-pay)

1. L'ambassadeur accepté clique sur « Payer » : le serveur crée un lien de paiement hébergé (montant fixé côté serveur).
2. Au retour, ou à la réception du webhook, le serveur **revérifie le statut et le montant auprès d'i-pay** avant de valider : le navigateur n'est jamais cru sur parole.
3. La validation est idempotente (un seul paiement par candidature) ; un doublon est signalé « à rembourser ».
4. Une route de rattrapage (`/api/cron/ipay-reconcile`, protégée par `CRON_SECRET`) et un bouton de vérification couvrent les cas où le webhook est perdu.

Le mode `sandbox` sert aux essais ; il utilise un compte distinct du mode `live`. Les moyens de paiement proposés dépendent de ce qui est activé sur le compte i-pay.

---

## Déploiement

Le site est déployé sur **Vercel** : chaque envoi sur la branche `main` déclenche un déploiement.

- Renseigner les variables d'environnement dans les réglages du projet Vercel (voir le tableau ci-dessus), puis redéployer.
- Le dossier `prisma/migrations/` n'est **pas versionné** : après une modification de `schema.prisma`, appliquer le schéma à la base partagée (`npm run db:push` ou `npm run db:migrate`) avant de déployer le code qui en dépend.
- Vérifier le domaine d'envoi dans Resend (enregistrements SPF et DKIM, et DMARC recommandé) pour que les e-mails n'arrivent pas dans les indésirables.
- Surveillance : `GET /api/health` répond `200` si la base et Redis répondent, `503` sinon.

---

## Contribuer

1. Vérifier avant d'envoyer : `npm run type-check` puis `npm run build`.
2. Ne jamais versionner de secrets : `.env` est ignoré ; `.env.example` ne contient que des noms de variables et des valeurs vides.
3. Les données supprimées sont archivées (`isDeleted`) : filtrer sur `isDeleted: false` dans les requêtes.
