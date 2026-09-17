export interface ChildrenItem {
  title: string;
  path: string;
  allowedRoles: string[];
  /** Permission fine requise en plus du rôle (ignorée pour SUPER_ADMIN — accès global). */
  requiredPermission?: string;
}
export interface NavigationItem {
  title: string;
  icon: string;
  path: string;
  children?: ChildrenItem[];
  allowedRoles: string[];
  /** Permission fine requise en plus du rôle (ignorée pour SUPER_ADMIN — accès global). */
  requiredPermission?: string;
}

export const adminNavigation: NavigationItem[] = [
  {
    title: "Dashboard",
    icon: "material-symbols:dashboard",
    path: "/dashboard",
    allowedRoles: ["USER", "ADMIN"],
  },
  {
    title: "Mon profil",
    icon: "material-symbols:person",
    path: "/profile",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF", "USER"],
  },
  {
    title: "Mon QCM",
    icon: "material-symbols:quiz",
    path: "/ambassadeur/qcm",
    allowedRoles: ["USER"],
  },
  {
    title: "Test",
    icon: "material-symbols:dashboard",
    path: "/test",
    allowedRoles: ["ADMIN", "USER"],
  },
  {
    title: "Paramètres",
    icon: "material-symbols:settings",
    path: "/dashboard/settings",
    allowedRoles: ["ADMIN"],
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
  {
    title: "Pages",
    icon: "eos-icons:admin",
    path: "#",
    children: [
      {
        title: "Client",
        path: "/dashboard/client",
        allowedRoles: ["USER"],
      },
      {
        title: "Server",
        path: "/dashboard/server",
        allowedRoles: ["USER"],
      },
    ],
    allowedRoles: ["USER"],
  },
];
