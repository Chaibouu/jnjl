# Sahel Coders - Website Starter (Next.js 15)

Un starter de production moderne pour applications web avec Next.js 15, React 19, et une stack de sécurité complète.

## Technologies

- **Framework**: Next.js 15 (App Router)
- **Runtime**: React 19.2
- **Base de données**: Prisma + MongoDB
- **Authentification**: JWT RS256 + AES-256-GCM + Refresh tokens
- **Styling**: Tailwind CSS + Radix UI (shadcn/ui)
- **Validation**: Zod
- **Logging**: Pino (JSON structuré)
- **Cache / Rate limiting**: Redis (ioredis)
- **2FA**: TOTP (otplib + Google Authenticator)
- **Formulaires**: React Hook Form
- **Notifications**: Sonner
- **Icons**: Lucide React + Tabler Icons

## Authentification

### Flux de connexion
1. `POST /api/auth/login` — vérification email/mot de passe
   - Si 2FA activé → retourne `{ requires2FA: true, tempToken }` (challenge 5 min)
2. `POST /api/auth/2fa/login` — vérification TOTP → session complète
3. Tokens retournés : `accessToken` (JWT 1h) + `refreshToken` (7j / 30j avec rememberMe)

### Fonctionnalités
- Inscription avec vérification email obligatoire
- Double authentification TOTP (Google Authenticator, Authy, Bitwarden…)
- Refresh tokens (SHA-256 hashé en base, jamais stocké en clair)
- Sessions multiples configurables (`allowMultipleSessions` dans `settings/`)
- Réinitialisation et changement de mot de passe
- Changement d'email avec confirmation
- Backoff progressif sur les tentatives de connexion échouées
- Notification email sur nouvelle IP/appareil

## Sécurité

### Tokens
- JWT signés **RS256** (clé privée RSA) puis chiffrés **AES-256-GCM**
- Refresh tokens haute entropie (64 octets aléatoires), stockés hashés (SHA-256)
- `tempToken` 2FA limité à 5 minutes avec `purpose: "2fa_challenge"` dans le payload

### Rate limiting (deux couches)
| Couche | Scope | Limite |
|--------|-------|--------|
| In-memory (middleware/Edge) | Global par IP | 20 req / 60s |
| Redis sliding window (API routes) | Auth par IP | 10 tentatives / 15 min |
| Redis sliding window (API routes) | Signup/Email par IP | 5 req / 1h |

### Content Security Policy
- Nonce par requête généré dans le middleware (Edge Runtime)
- `'strict-dynamic'` + `'nonce-{nonce}'` — aucun inline script autorisé sans nonce
- En-têtes supplémentaires : `X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `Permissions-Policy`

### Détection de mots de passe compromis (HIBP)
- K-anonymity : seuls les 5 premiers caractères du hash SHA-1 sont envoyés
- L'API HIBP ne reçoit jamais le mot de passe complet
- Header `Add-Padding: true` pour masquer la taille de la réponse
- Fail-open : une erreur réseau ne bloque pas l'inscription

### Uploads
- Validation du magic number binaire (JPEG, PNG, GIF, WebP, PDF)
- Extension sanitisée, nom de fichier remplacé par un UUID aléatoire
- Vérification du type MIME déclaré vs signature réelle

### Audit log
Chaque action sensible est tracée dans `AuditLog` (Prisma) :
`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `SIGNUP`, `2FA_ENABLED`, `2FA_DISABLED`, `2FA_FAILURE`, `2FA_SUCCESS`, `PASSWORD_RESET`, `PASSWORD_CHANGED`, `IMPERSONATION_START`, `IMPERSONATION_END`, `EMAIL_CHANGED`, `ACCOUNT_DISABLED`, `ACCOUNT_DELETED`

## Impersonation admin

Permet à un ADMIN d'auditer un compte utilisateur sans connaître son mot de passe.

```
POST /api/admin/impersonate   { targetUserId }   Authorization: Bearer <adminToken>
DELETE /api/admin/impersonate/end                Authorization: Bearer <impersonationToken>
```

- La session admin n'est jamais touchée — un cookie `impersonationToken` séparé (httpOnly) est créé
- Session d'impersonation limitée à **15 minutes**, non renouvelable
- Impossible d'impersonner un autre ADMIN
- Bannière orange affichée dans l'UI tant que la session d'impersonation est active
- Server Actions : `startImpersonation(targetUserId)` / `endImpersonation()` (cookies gérés côté serveur uniquement)

## Logging structuré (Pino)

```ts
import { logger } from "@/lib/logger";

logger.logAuth("LOGIN_SUCCESS", userId, email);
logger.logRequest("GET", "/api/health", 200, 12);
logger.logDatabase("query", "user.findUnique", 8);
logger.logSecurity("RATE_LIMIT", ip, "Trop de tentatives");
```

- Pino-pretty en développement, JSON brut en production
- Niveau contrôlé par `LOG_LEVEL` (env)

## Health check

```
GET /api/health
```

Retourne `200 { status: "ok" }` si DB + Redis répondent, `503 { status: "degraded" }` sinon. Utile pour les probes Kubernetes / load balancers.

## Structure du projet

```
website-starter/
├── app/
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   └── users/          # Interface d'impersonation
│   │   └── …
│   ├── api/
│   │   ├── admin/impersonate/  # POST + DELETE /end
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── 2fa/
│   │   │   │   ├── setup/      # GET — génère QR code TOTP
│   │   │   │   ├── verify-setup/ # POST — confirme enrollment
│   │   │   │   └── login/      # POST — étape 2 connexion
│   │   │   ├── refresh/
│   │   │   ├── logout/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   ├── change-password/
│   │   │   ├── change-email/
│   │   │   └── verify/
│   │   ├── health/             # GET — healthcheck DB + Redis
│   │   ├── profile/
│   │   └── upload/
│   └── layout.tsx              # Lit x-nonce pour CSP
├── actions/
│   ├── impersonate.ts          # Server Actions (cookies httpOnly)
│   └── getUser.ts              # Vérifie impersonationToken en priorité
├── components/
│   ├── ImpersonationBanner.tsx # Bannière admin session
│   ├── admin/ImpersonateButton.tsx
│   └── …
├── lib/
│   ├── tokens.ts               # JWT RS256 + AES-256-GCM
│   ├── rateLimit.ts            # In-memory + Redis sliding window
│   ├── redis.ts                # Singleton ioredis
│   ├── audit.ts                # AuditLog helper
│   ├── hibp.ts                 # HIBP k-anonymity
│   ├── logger.ts               # Pino wrapper
│   ├── mail.ts                 # Nodemailer (login notif, vérif, reset)
│   ├── upload.ts               # Magic number + UUID filename
│   └── geo.ts                  # IP → géolocalisation
├── context/SessionContext.tsx
├── middleware.ts               # CSP nonce + rate limiting Edge
├── settings/index.ts           # Config centralisée
└── prisma/schema.prisma
```

## Installation

### Prérequis
- Node.js 18+
- MongoDB (local ou Atlas)
- Redis (local ou Redis Cloud)

### Démarrage

```bash
git clone <repository-url>
cd website-starter

npm install

cp .env.example .env.local
# Remplir les variables (voir section ci-dessous)

npm run postinstall        # Génère le client Prisma
npm run db:push            # Synchronise le schéma
npm run dev
```

### Variables d'environnement

```env
# Base de données
DATABASE_URL="mongodb://localhost:27017/sahel-coders"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# JWT (RS256) — générer avec openssl
RSA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n…"
RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n…"

# AES-256-GCM — 32 octets aléatoires en base64
AES_SECRET_KEY="base64-encoded-32-bytes"

# Redis
REDIS_URL="redis://localhost:6379"

# Email (Nodemailer)
MAIL_AUTH_USER="your-email@gmail.com"
MAIL_AUTH_PASS="your-app-password"
MAIL_HOST="smtp.gmail.com"
MAIL_PORT="587"

# Optionnel
LOG_LEVEL="debug"          # trace | debug | info | warn | error
```

#### Génération des clés RSA

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

#### Génération de la clé AES

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Scripts

```bash
npm run dev              # Développement
npm run build            # Build production
npm run start            # Serveur production
npm run lint             # ESLint
npm run type-check       # TypeScript
npm run db:push          # Sync schéma Prisma
npm run db:migrate       # Migration Prisma
npm run db:studio        # Prisma Studio
npm run seed             # Seed base de données
npm test                 # Tests Jest
npm run test:coverage    # Couverture
```

## Déploiement

### VPS (Nginx + PM2 + Redis)

Voir la configuration VPS dans la documentation interne (Nginx, Redis, PM2, BullBoard).

### Vercel

```bash
npm i -g vercel
vercel
```

Ajouter toutes les variables d'environnement dans le dashboard Vercel. Redis : utiliser Redis Cloud ou Upstash.

### Docker

```bash
docker build -t website-starter .
docker run -p 3000:3000 \
  -e DATABASE_URL="…" \
  -e RSA_PRIVATE_KEY="…" \
  -e AES_SECRET_KEY="…" \
  -e REDIS_URL="…" \
  website-starter
```

## Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/ma-feature`)
3. Commit (`git commit -m 'feat: description'`)
4. Push (`git push origin feature/ma-feature`)
5. Ouvrir une Pull Request

## Licence

MIT — voir `LICENSE`.

---

Développé par l'équipe Sahel Coders
