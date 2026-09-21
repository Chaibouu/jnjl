export interface ChildrenItem {
  title: string;
  path: string;
  allowedRoles: string[];
  /** Permission fine requise en plus du rôle (ignorée pour SUPER_ADMIN — accès global). */
  requiredPermission?: string;
  /** Affiché seulement si le compte est rattaché à une candidature ambassadeur. */
  requiresAmbassadorAccount?: boolean;
}
export interface NavigationItem {
  title: string;
  icon: string;
  path: string;
  children?: ChildrenItem[];
  allowedRoles: string[];
  /** Permission fine requise en plus du rôle (ignorée pour SUPER_ADMIN — accès global). */
  requiredPermission?: string;
  /** Affiché seulement si le compte est rattaché à une candidature ambassadeur. */
  requiresAmbassadorAccount?: boolean;
}

export const adminNavigation: NavigationItem[] = [
  {
    title: "Dashboard",
    icon: "material-symbols:dashboard",
    path: "/dashboard",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF", "USER"],
  },
  {
    title: "Mon profil",
    icon: "material-symbols:person",
    path: "/profile",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF", "USER"],
  },
  {
    title: "Notifications",
    icon: "material-symbols:notifications",
    path: "/dashboard/notifications",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF", "USER"],
  },
  {
    title: "Mes formations",
    icon: "material-symbols:school",
    path: "/ambassadeur/formation",
    allowedRoles: ["USER"],
    requiresAmbassadorAccount: true,
  },
  {
    title: "Mes QCM",
    icon: "material-symbols:quiz",
    path: "/ambassadeur/qcm",
    allowedRoles: ["USER"],
    requiresAmbassadorAccount: true,
  },
  {
    title: "Mon engagement",
    icon: "material-symbols:signature",
    path: "/ambassadeur/engagement",
    allowedRoles: ["USER"],
    requiresAmbassadorAccount: true,
  },
  {
    title: "Mon badge",
    icon: "material-symbols:badge",
    path: "/ambassadeur/badge",
    allowedRoles: ["USER"],
    requiresAmbassadorAccount: true,
  },
  {
    title: "Mon attestation",
    icon: "material-symbols:workspace-premium",
    path: "/ambassadeur/attestation",
    allowedRoles: ["USER"],
    requiresAmbassadorAccount: true,
  },
  {
    title: "Statistiques",
    icon: "material-symbols:bar-chart",
    path: "/admin/statistiques",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "stats.view",
  },
  {
    title: "Éditions",
    icon: "material-symbols:event",
    path: "/admin/editions",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "editions.manage",
  },
  {
    title: "Régions",
    icon: "material-symbols:map",
    path: "/admin/regions",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "regions.manage",
  },
  {
    title: "Candidatures Participants",
    icon: "material-symbols:groups",
    path: "/admin/candidatures/participants",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "applications.event.manage",
  },
  {
    title: "Ambassadeurs",
    icon: "material-symbols:how-to-reg",
    path: "/admin/ambassadeurs/candidatures",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "applications.ambassador.manage",
    children: [
      {
        title: "Candidatures",
        path: "/admin/ambassadeurs/candidatures",
        allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
        requiredPermission: "applications.ambassador.manage",
      },
      {
        title: "Comptes",
        path: "/admin/ambassadeurs/comptes",
        allowedRoles: ["SUPER_ADMIN", "ADMIN"],
        requiredPermission: "ambassadors.accounts.manage",
      },
    ],
  },
  {
    title: "Paiements",
    icon: "material-symbols:payments",
    path: "/admin/paiements",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "payments.manage",
  },
  {
    title: "Utilisateurs",
    icon: "material-symbols:group",
    path: "/admin/users",
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
    requiredPermission: "users.manage",
  },
  {
    title: "Actualités",
    icon: "material-symbols:newsmode",
    path: "/admin/actualites",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "news.manage",
  },
  {
    title: "Partenaires",
    icon: "material-symbols:handshake",
    path: "/admin/partenaires",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "partners.manage",
  },
  {
    title: "Intervenants",
    icon: "material-symbols:record-voice-over",
    path: "/admin/intervenants",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "speakers.manage",
  },
  {
    title: "Programme",
    icon: "material-symbols:calendar-month",
    path: "/admin/programme",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "program.manage",
  },
  {
    title: "Formations",
    icon: "material-symbols:school",
    path: "/admin/formation",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "training.manage",
  },
  {
    title: "Classement & Sélection",
    icon: "material-symbols:leaderboard",
    path: "/admin/selection",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "selection.manage",
  },
  {
    title: "Repêchage",
    icon: "material-symbols:support",
    path: "/admin/repechage",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "repechage.manage",
  },
  {
    title: "Documents",
    icon: "material-symbols:description",
    path: "/admin/documents",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "documents.manage",
  },
  {
    title: "Engagement",
    icon: "material-symbols:signature",
    path: "/admin/engagement",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "engagement.manage",
  },
  {
    title: "Badges",
    icon: "material-symbols:badge",
    path: "/admin/badges",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "badges.manage",
  },
  {
    title: "Embarquement",
    icon: "material-symbols:directions-bus",
    path: "/admin/embarquement",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "boarding.manage",
  },
  {
    title: "Présence",
    icon: "material-symbols:how-to-reg",
    path: "/admin/presence",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "attendance.manage",
  },
  {
    title: "Attestations",
    icon: "material-symbols:workspace-premium",
    path: "/admin/attestations",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "documents.manage",
  },
  {
    title: "QCM",
    icon: "material-symbols:quiz",
    path: "/admin/qcm",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "quiz.manage",
    children: [
      {
        title: "Questionnaires",
        path: "/admin/qcm",
        allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
        requiredPermission: "quiz.manage",
      },
      {
        title: "Banque de questions",
        path: "/admin/qcm/questions",
        allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
        requiredPermission: "quiz.manage",
      },
      {
        title: "Catégories",
        path: "/admin/qcm/categories",
        allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
        requiredPermission: "quiz.manage",
      },
    ],
  },
];
