import { hasPermission } from "@/lib/permissions";

/**
 * Vérifie qu'un utilisateur a le rôle requis ET, si spécifiée, la permission fine requise.
 * Le rôle SUPER_ADMIN court-circuite la vérification de permission (accès global, §4.1).
 */
export function isUserAuthorized(
  userRole: string,
  allowedRoles: string[],
  permissions?: string[] | null,
  requiredPermission?: string
): boolean {
  if (!allowedRoles.includes(userRole)) return false;
  if (!requiredPermission) return true;
  return hasPermission({ role: userRole, permissions }, requiredPermission);
}
