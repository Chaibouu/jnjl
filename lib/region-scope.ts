import { ForbiddenError } from "@/lib/forbidden-error";
import type { User } from "@/types/user";

/**
 * Région à laquelle un acteur est cantonné, ou null s'il a un accès national
 * (SUPER_ADMIN, ADMIN, ou STAFF sans région assignée — comportement historique conservé).
 */
export function getActorRegionScope(actor: Pick<User, "focalRegionId">): string | null {
  return actor.focalRegionId ?? null;
}

/**
 * Vérifie qu'une ressource déjà chargée (via son `regionId`) appartient bien à la région
 * de l'acteur. À utiliser après un `findUnique`/`findFirst` sur un enregistrement dont on ne
 * peut pas filtrer la région directement dans la requête (ex. `findUnique` sur une clé unique).
 */
export function assertRegionAccess(
  actor: Pick<User, "focalRegionId">,
  resourceRegionId: string | null | undefined
) {
  const scope = getActorRegionScope(actor);
  if (scope && resourceRegionId !== scope) {
    throw new ForbiddenError("Cette candidature relève d'une autre région");
  }
}
