/**
 * Helper AuditLog — traçabilité des actions sensibles
 *
 * Usage :
 *   await audit({ userId, action: 'LOGIN_SUCCESS', ipAddress, status: 'SUCCESS' });
 *
 * Actions définies :
 *   AUTH     → LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, SIGNUP
 *   SECURITY → 2FA_ENABLED, 2FA_DISABLED, 2FA_FAILURE, PASSWORD_RESET, PASSWORD_CHANGED
 *   ADMIN    → IMPERSONATION_START, IMPERSONATION_END, ACCESS_GENERATED (mot de passe provisoire généré par le Super Admin)
 *   ACCOUNT  → EMAIL_CHANGED, ACCOUNT_DISABLED, ACCOUNT_DELETED
 *   GESTION  → USER_*, APPLICATION_*, BADGE_*, PAYMENT_*, RANKING_COMPUTED, SELECTION_RUN, ACCOUNTS_UNBLOCKED :
 *              actions des administrateurs, enregistrées avec `auditAdminAction` (qui, quoi, sur qui, quand).
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";

export type AuditAction =
  // Auth
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "SIGNUP"
  // Sécurité
  | "2FA_ENABLED"
  | "2FA_DISABLED"
  | "2FA_FAILURE"
  | "2FA_SUCCESS"
  | "PASSWORD_RESET"
  | "PASSWORD_CHANGED"
  // Admin
  | "IMPERSONATION_START"
  | "IMPERSONATION_END"
  | "ACCESS_GENERATED"
  | "EMAIL_CAMPAIGN_CREATED"
  // Compte
  | "EMAIL_CHANGED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_DELETED"
  // Gestion par les administrateurs : l'auteur est toujours `userId`, la cible est dans `metadata`
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "USER_RESTORED"
  | "USER_DEACTIVATED"
  | "USER_ACTIVATED"
  | "PASSWORD_SET_BY_ADMIN"
  | "ACCOUNTS_UNBLOCKED"
  | "APPLICATION_ACCEPTED"
  | "APPLICATION_REJECTED"
  | "BADGE_AWARDED"
  | "BADGE_CANCELLED"
  | "PAYMENT_CANCELLED"
  | "APPLICATION_WITHDRAWN"
  | "PAYMENT_MANUAL_RECORDED"
  | "MANUAL_PAYMENT_ALLOWED"
  | "RANKING_COMPUTED"
  | "SELECTION_RUN"
  | "NOTIFICATION_BROADCAST"
  | "SELECTION_REMOVED"
  | "SELECTION_RESTORED";

interface AuditParams {
  userId?: string;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  status: "SUCCESS" | "FAILURE";
  metadata?: Record<string, unknown>;
}

/**
 * Enregistre un événement dans l'AuditLog.
 * Non-bloquant : les erreurs d'écriture ne propagent pas (sécurité > disponibilité).
 */
export async function audit(params: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        status: params.status,
        metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    // Log structuré en parallèle pour la recherche rapide dans les logs applicatifs
    logger.logAuth(params.action, params.userId, params.metadata?.email as string | undefined);
  } catch (err) {
    // Ne jamais bloquer le flux principal sur une erreur d'audit
    logger.error({ err, action: params.action }, "Erreur écriture AuditLog");
  }
}

/** Libellés français des actions de gestion, pour la page « Journal d'audit ». */
export const ADMIN_ACTION_LABELS: Record<string, string> = {
  EMAIL_CHANGED: "E-mail du compte modifié",
  USER_CREATED: "Compte créé",
  USER_UPDATED: "Compte modifié",
  USER_DELETED: "Compte supprimé",
  USER_RESTORED: "Compte restauré",
  USER_DEACTIVATED: "Compte désactivé",
  USER_ACTIVATED: "Compte activé",
  PASSWORD_SET_BY_ADMIN: "Mot de passe défini par un administrateur",
  ACCOUNTS_UNBLOCKED: "Comptes de candidats débloqués",
  APPLICATION_ACCEPTED: "Candidature acceptée",
  APPLICATION_REJECTED: "Candidature rejetée",
  SELECTION_REMOVED: "Ambassadeur retiré de la sélection",
  SELECTION_RESTORED: "Ambassadeur remis dans la sélection",
  NOTIFICATION_BROADCAST: "Message envoyé aux ambassadeurs",
  BADGE_AWARDED: "Badge attribué",
  BADGE_CANCELLED: "Badge annulé",
  PAYMENT_MANUAL_RECORDED: "Paiement manuel enregistré",
  PAYMENT_CANCELLED: "Paiement annulé",
  APPLICATION_WITHDRAWN: "Désistement enregistré",
  MANUAL_PAYMENT_ALLOWED: "Paiement manuel autorisé / retiré",
  RANKING_COMPUTED: "Classement calculé",
  SELECTION_RUN: "Sélection lancée",
  ACCESS_GENERATED: "Accès généré",
  EMAIL_CAMPAIGN_CREATED: "Campagne d'e-mails créée",
  IMPERSONATION_START: "Impersonation démarrée",
  IMPERSONATION_END: "Impersonation terminée",
};

/**
 * Trace une action d'administration : QUI l'a faite (`actorId`), QUOI, sur QUI/QUOI (`target`) et d'où (adresse IP
 * et navigateur lus dans la requête). Non bloquant : un échec d'écriture ne fait jamais échouer l'action.
 */
export async function auditAdminAction(params: {
  actorId: string;
  action: AuditAction;
  /** Personne ou objet visé : id du compte, libellé lisible (nom, e-mail…) et détails utiles. */
  target?: { userId?: string; label?: string | null; [key: string]: unknown };
  status?: "SUCCESS" | "FAILURE";
}): Promise<void> {
  let ipAddress: string | undefined;
  let userAgent: string | undefined;
  try {
    const requestHeaders = await headers();
    ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || undefined;
    userAgent = requestHeaders.get("user-agent") ?? undefined;
  } catch {
    // Hors requête (script, test) : pas d'adresse IP, l'événement est tout de même enregistré.
  }
  await audit({
    userId: params.actorId,
    action: params.action,
    ipAddress,
    userAgent,
    status: params.status ?? "SUCCESS",
    metadata: params.target ? { ...params.target } : undefined,
  });
}
