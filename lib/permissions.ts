/**
 * RBAC fin (§4 du cahier des charges JNJL).
 * Le Super Admin a un accès global à toute la plateforme (§4.1) : il court-circuite
 * systématiquement la vérification de permission. Admin et Staff ne reçoivent que
 * les permissions qui leur sont attribuées individuellement (UserPermission).
 */

export type PermissionCheckable = {
  role: string;
  permissions?: string[] | null;
};

export function hasPermission(
  user: PermissionCheckable | null | undefined,
  code: string
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return (user.permissions ?? []).includes(code);
}

export function hasAnyPermission(
  user: PermissionCheckable | null | undefined,
  codes: string[]
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const granted = user.permissions ?? [];
  return codes.some((code) => granted.includes(code));
}

export function hasAllPermissions(
  user: PermissionCheckable | null | undefined,
  codes: string[]
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const granted = user.permissions ?? [];
  return codes.every((code) => granted.includes(code));
}

/** Le staff voit le même tableau de bord de pilotage que les admins, sans permission dédiée. */
export function canViewStats(user: PermissionCheckable | null | undefined): boolean {
  if (!user) return false;
  return user.role === "STAFF" || hasPermission(user, "stats.view");
}

/** Pages de détail vers lesquelles les cartes du tableau de bord peuvent pointer. */
export function getStatsLinkPermissions(user: PermissionCheckable | null | undefined) {
  return {
    applications: hasPermission(user, "applications.ambassador.manage"),
    payments: hasPermission(user, "payments.manage"),
    selection: hasPermission(user, "selection.manage"),
    badges: hasPermission(user, "badges.manage"),
    boarding: hasPermission(user, "boarding.manage"),
    attendance: hasPermission(user, "attendance.manage"),
    participants: hasPermission(user, "applications.event.manage"),
  };
}
