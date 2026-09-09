"use server";

import { getUser } from "@/actions/getUser";
import { hasPermission } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/forbidden-error";
import type { User } from "@/types/user";

/**
 * Garde à appeler en tête de toute Server Action mutante liée à un module protégé
 * (candidatures, paiements, quotas, contenus…). Lève ForbiddenError si l'utilisateur
 * n'est pas authentifié ou ne possède pas la permission requise.
 *
 * @example
 *   export async function updateApplicationStatus(id: string, status: ApplicationStatus) {
 *     await requirePermission("applications.event.manage");
 *     // ...
 *   }
 */
export async function requirePermission(code: string): Promise<User> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;

  if (!user) {
    throw new ForbiddenError("Authentification requise");
  }
  if (!hasPermission(user, code)) {
    throw new ForbiddenError(`Permission requise : ${code}`);
  }
  return user;
}
