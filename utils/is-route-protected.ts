import { isUserAuthorized } from "@/utils/is-user-authorized";
import { adminNavigation } from "@/settings/navigation";

/**
 * Vérifie si une route est protégée et si l'utilisateur courant n'est PAS autorisé à y accéder.
 * @param userRole - Le rôle de l'utilisateur actuel
 * @param pathname - Le chemin de la route actuelle
 * @param permissions - Les codes de permissions attribuées à l'utilisateur (vide pour SUPER_ADMIN)
 * @returns true si l'utilisateur n'est pas autorisé à accéder à la route, false sinon
 */
export const isRouteProtected = (
  userRole: string,
  pathname: string,
  permissions?: string[] | null
): boolean => {
  return adminNavigation.some((navItem) => {
    // Vérification pour les routes sans sous-routes
    if (navItem.path === pathname && navItem.allowedRoles) {
      return !isUserAuthorized(
        userRole,
        navItem.allowedRoles,
        permissions,
        navItem.requiredPermission
      );
    }

    // Vérification pour les routes avec sous-routes
    if (navItem.children) {
      return navItem.children.some(
        (child) =>
          child.path === pathname &&
          !isUserAuthorized(
            userRole,
            child.allowedRoles,
            permissions,
            child.requiredPermission
          )
      );
    }

    return false;
  });
};
