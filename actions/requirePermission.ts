"use server";

import { getUser } from "@/actions/getUser";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";
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

/** Comme requirePermission, mais accepte n'importe laquelle des permissions listées. */
export async function requireAnyPermission(codes: string[]): Promise<User> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;

  if (!user) {
    throw new ForbiddenError("Authentification requise");
  }
  if (!hasAnyPermission(user, codes)) {
    throw new ForbiddenError(`Permission requise : ${codes.join(" ou ")}`);
  }
  return user;
}

/** Réservé au Super Admin (réglages sensibles du site) : aucune permission individuelle ne donne cet accès. */
export async function requireSuperAdmin(): Promise<User> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;

  if (!user) {
    throw new ForbiddenError("Authentification requise");
  }
  if (user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Accès réservé au Super Admin");
  }
  return user;
}
