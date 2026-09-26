import { UserRole } from "@prisma/client";

export type User = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  isActive: boolean;
  image?: string;
  /** Codes des permissions attribuées individuellement (vide pour SUPER_ADMIN — accès global). */
  permissions: string[];
  /** Vrai si le compte est rattaché à une candidature ambassadeur (modules « Mes formations », « Mon badge »…). */
  hasAmbassadorApplication?: boolean;
  /** Région à laquelle ce STAFF est cantonné (point focal régional) ; absent/null pour un accès national. */
  focalRegionId?: string | null;
};

/** Métadonnées d'une session d'impersonation admin */
export type ImpersonationMeta = {
  isImpersonation: true;
  impersonatedBy: string; // adminId
};
