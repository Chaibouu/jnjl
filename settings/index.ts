const appConfig = {
  appName: "JNJL",
  websiteTitle: "JNJL",
  websiteDescription:
    "La Journée Nationale du Jeune Leader (JNJL) est un événement majeur au Niger qui promeut l'esprit d'initiative et le patriotisme chez les jeunes.",
  logoUrl: "/jnjl.jpg",
  sidebarClearlogoUrl: "/jnjl.jpg",
  adminSidebarColor: "#1C2434",
  mailOptions: {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: true,
    auth: {
      user: process.env.MAIL_AUTH_USER,
      pass: process.env.MAIL_AUTH_PASSWORD,
    },
  },
  publicRoutes: [
    "/",
    "/ambassadeurs/candidature",
    "/api/applications/ambassador",
    "/participer",
    "/api/applications/event",
    "/actualites",
    "/partenaires",
    "/intervenants",
    "/programme",
    "/editions",
  ],
  defaultLoginRedirect: "/dashboard",
  primaryColor: "#F07321",
  secondaryColor: "#FFBC01",
  tertiaryColor: "#000000",

  // Ajout d'une option pour autoriser ou non les connexions multiples
  allowMultipleSessions: false, // ou false pour invalider les anciennes sessions

  // Rate limiting global — par IP
  rateLimit: {
    windowMs: 60 * 1000, // Fenêtre de 60 secondes (au lieu de 10s trop facilement contournable)
    max: 20, // 20 requêtes max par IP par fenêtre (routes publiques)
  },

  // Rate limiting strict pour les endpoints d'authentification sensibles
  rateLimitAuth: {
    windowMs: 15 * 60 * 1000, // Fenêtre de 15 minutes
    max: 10, // 10 tentatives max par IP (login, signup, reset)
  },

  // Rate limiting pour l'envoi d'emails (forgot-password, resend verification)
  rateLimitEmail: {
    windowMs: 60 * 60 * 1000, // Fenêtre de 1 heure
    max: 5, // 5 emails max par IP par heure (anti email-bombing)
  },

  // Configuration du Backoff progressif
  backoff: {
    maxAttempts: 5, // Nombre maximal de tentatives de connexion avant blocage
    backoffDelayFactor: 2, // Facteur de progression du backoff (multiplicateur)
  },
};

export default appConfig;
