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
    title: "Candidatures ambassadeurs",
    icon: "material-symbols:how-to-reg",
    path: "/admin/ambassadeurs/candidatures",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    requiredPermission: "applications.ambassador.manage",
  },
  {
    title: "Utilisateurs",
    icon: "material-symbols:group",
    path: "/admin/users",
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
    requiredPermission: "users.manage",
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
