import { isUserAuthorized } from "@/utils/is-user-authorized";
import type { ChildrenItem, NavigationItem } from "@/settings/navigation";
import type { User } from "@/types/user";

type NavUser = Pick<User, "role" | "permissions" | "hasAmbassadorApplication">;

/**
 * Ne garde que les entrées de menu auxquelles l'utilisateur a accès :
 * rôle autorisé, permission fine (sauf Super Admin) et, pour les modules ambassadeur,
 * une candidature ambassadeur rattachée au compte.
 *
 * Un module inaccessible n'est jamais affiché. Un menu déroulant n'apparaît que
 * s'il reste au moins un sous-menu accessible.
 */
export function filterNavigation(
  items: NavigationItem[],
  user: NavUser | null | undefined
): NavigationItem[] {
  if (!user) return [];

  const canSee = (entry: NavigationItem | ChildrenItem) =>
    isUserAuthorized(
      user.role,
      entry.allowedRoles,
      user.permissions,
      entry.requiredPermission
    ) &&
    (!entry.requiresAmbassadorAccount || !!user.hasAmbassadorApplication);

  const result: NavigationItem[] = [];

  for (const item of items) {
    const visibleChildren = item.children?.filter(canSee) ?? [];

    if (visibleChildren.length > 0) {
      // Le lien du groupe pointe vers son premier sous-menu accessible si le groupe lui-même
      // n'est pas autorisé (ex. accès aux « Comptes » sans accès aux « Candidatures »).
      result.push({
        ...item,
        path: canSee(item) ? item.path : visibleChildren[0].path,
        children: visibleChildren,
      });
    } else if (canSee(item) && item.path !== "#") {
      const { children: _unused, ...link } = item;
      result.push(link);
    }
  }

  return result;
}
