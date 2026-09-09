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
};

/** Métadonnées d'une session d'impersonation admin */
export type ImpersonationMeta = {
  isImpersonation: true;
  impersonatedBy: string; // adminId
};
