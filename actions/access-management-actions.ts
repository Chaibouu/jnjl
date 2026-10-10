"use server";

import bcrypt from "bcryptjs";
import { ApplicationStatus, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/actions/requirePermission";
import { audit } from "@/lib/audit";
import { getAppUrl } from "@/lib/app-url";
import { describeMailError, sendApplicationAcceptedEmail } from "@/lib/mail";
import { generateTemporaryPassword } from "@/lib/temp-password";
import { buildAccessMessage, buildWhatsappLink } from "@/lib/access-credentials";

/**
 * Gestion des accès des ambassadeurs acceptés — réservée au Super Admin.
 *
 * Pourquoi : l'envoi d'e-mails peut échouer (quota du fournisseur dépassé, adresse erronée…) sans que le
 * candidat le sache. Cet écran montre qui a reçu ses accès et permet de les lui remettre autrement
 * (WhatsApp, SMS, appel) avec un mot de passe provisoire généré à la demande.
 */

export type AccessMailState = "ACCEPTED" | "DELIVERED" | "FAILED" | "BOUNCED" | "COMPLAINED" | "MANUAL";

export type AccessRow = {
  id: string;
  fullName: string;
  firstName: string;
  email: string;
  phone: string;
  region: string;
  stage: string;
  mail: { status: AccessMailState; at: string; error: string | null } | null;
};

export type AccessOverview = {
  rows: AccessRow[];
  today: { sent: number; failed: number };
};

export type IssuedAccess = {
  applicationId: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  message: string;
  whatsappUrl: string | null;
  /** Résultat de l'envoi par e-mail demandé en plus de la remise manuelle. */
  emailResult: "sent" | "failed" | "skipped";
  emailError: string | null;
};

type IssueResult = { ok: true; access: IssuedAccess } | { ok: false; applicationId: string; error: string };

const MAX_BATCH = 40;

/** Petite attente entre deux appels au fournisseur d'e-mails (2 requêtes par seconde au plus). */
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Ambassadeurs acceptés, avec l'état du dernier e-mail d'accès et le volume d'envois du jour. */
export async function getAccessOverviewAction(): Promise<AccessOverview> {
  await requireSuperAdmin();

  const applications = await db.ambassadorApplication.findMany({
    where: { status: ApplicationStatus.RETENU, userId: { not: null }, user: { isDeleted: false } },
    orderBy: { reviewedAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      stage: true,
      region: { select: { name: true } },
    },
    take: 1000,
  });

  const emails = [...new Set(applications.map(application => application.email.toLowerCase()))];
  const [logs, sentToday, failedToday] = await Promise.all([
    emails.length
      ? db.emailLog.findMany({
          where: { kind: "access", toEmail: { in: emails } },
          orderBy: { createdAt: "desc" },
          select: { toEmail: true, status: true, error: true, createdAt: true },
        })
      : Promise.resolve([]),
    db.emailLog.count({ where: { createdAt: { gte: startOfTodayUtc() }, status: { not: "MANUAL" } } }),
    db.emailLog.count({ where: { createdAt: { gte: startOfTodayUtc() }, status: { in: ["FAILED", "BOUNCED"] } } }),
  ]);

  // Dernier suivi par adresse : le plus récent (liste déjà triée par date décroissante).
  const latest = new Map<string, (typeof logs)[number]>();
  for (const log of logs) if (!latest.has(log.toEmail)) latest.set(log.toEmail, log);

  return {
    rows: applications.map(application => {
      const log = latest.get(application.email.toLowerCase());
      return {
        id: application.id,
        fullName: `${application.firstName} ${application.lastName}`,
        firstName: application.firstName,
        email: application.email,
        phone: application.phone,
        region: application.region.name,
        stage: application.stage,
        mail: log ? { status: log.status as AccessMailState, at: log.createdAt.toISOString(), error: log.error } : null,
      };
    }),
    today: { sent: sentToday, failed: failedToday },
  };
}

/** Génère un nouveau mot de passe provisoire pour un ambassadeur accepté (et l'envoie par e-mail si demandé). */
async function issueAccess(applicationId: string, sendEmail: boolean, actorId: string): Promise<IssueResult> {
  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      stage: true,
      status: true,
      userId: true,
    },
  });
  if (!application) return { ok: false, applicationId, error: "Candidature introuvable" };
  if (application.status !== ApplicationStatus.RETENU || !application.userId) {
    return { ok: false, applicationId, error: "Seules les candidatures acceptées ont un compte" };
  }

  const user = await db.user.findUnique({
    where: { id: application.userId },
    select: { id: true, role: true, email: true, isDeleted: true },
  });
  if (!user || user.isDeleted) return { ok: false, applicationId, error: "Compte introuvable" };
  // Jamais le mot de passe d'un compte administrateur ou staff qui partagerait cette adresse.
  if (user.role !== UserRole.USER) {
    return { ok: false, applicationId, error: "Ce n'est pas un compte ambassadeur : réinitialisation refusée" };
  }

  const password = generateTemporaryPassword();
  const loginEmail = user.email ?? application.email;
  const loginUrl = `${getAppUrl() || "https://jnjl.ne"}/auth/login`;

  // Le mot de passe est remplacé dans tous les cas : le Super Admin le voit à l'écran, aucune personne
  // n'est donc jamais privée d'accès si l'e-mail échoue.
  await db.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(password, 12) } });
  await db.session.deleteMany({ where: { userId: user.id } });

  let emailResult: IssuedAccess["emailResult"] = "skipped";
  let emailError: string | null = null;
  if (sendEmail) {
    try {
      await sendApplicationAcceptedEmail(loginEmail, application.firstName, {
        temporaryPassword: password,
        existingAccount: true,
      });
      emailResult = "sent";
    } catch (error) {
      emailResult = "failed";
      emailError = describeMailError(error);
    }
  } else {
    await db.emailLog.create({
      data: {
        kind: "access",
        toEmail: loginEmail.toLowerCase(),
        subject: "Accès remis manuellement",
        status: "MANUAL",
      },
    });
  }

  await audit({
    userId: actorId,
    action: "ACCESS_GENERATED",
    status: "SUCCESS",
    metadata: { applicationId: application.id, targetUserId: user.id, viaEmail: sendEmail, emailResult },
  });

  const message = buildAccessMessage({
    firstName: application.firstName,
    email: loginEmail,
    password,
    loginUrl,
    stage: application.stage,
  });

  return {
    ok: true,
    access: {
      applicationId: application.id,
      fullName: `${application.firstName} ${application.lastName}`,
      email: loginEmail,
      phone: application.phone,
      password,
      message,
      whatsappUrl: buildWhatsappLink(application.phone, message),
      emailResult,
      emailError,
    },
  };
}

export async function generateAccessAction(applicationId: string, sendEmail: boolean): Promise<IssueResult> {
  const actor = await requireSuperAdmin();
  return issueAccess(applicationId, sendEmail, actor.id);
}

/** Génère les accès de plusieurs ambassadeurs d'un coup (40 au plus par envoi). */
export async function generateAccessBatchAction(
  applicationIds: string[],
  sendEmail: boolean
): Promise<{ ok: true; results: IssueResult[] } | { ok: false; error: string }> {
  const actor = await requireSuperAdmin();
  const ids = [...new Set(applicationIds)];
  if (ids.length === 0) return { ok: false, error: "Aucun ambassadeur sélectionné" };
  if (ids.length > MAX_BATCH) return { ok: false, error: `Sélectionnez ${MAX_BATCH} ambassadeurs au plus à la fois` };

  const results: IssueResult[] = [];
  for (const id of ids) {
    results.push(await issueAccess(id, sendEmail, actor.id));
    // Le fournisseur d'e-mails limite le débit : on espace les envois d'un même lot.
    if (sendEmail) await pause(600);
  }
  return { ok: true, results };
}

// ─── Suivi de livraison (fournisseur d'e-mails) ──────────────────────────────

/** Traduit l'état donné par le fournisseur. « Ouvert » et « cliqué » prouvent que l'e-mail est arrivé. */
function statusFromEvent(event: string | undefined): AccessMailState {
  switch (event) {
    case "delivered":
    case "opened":
    case "clicked":
      return "DELIVERED";
    case "failed":
      return "FAILED";
    case "bounced":
      return "BOUNCED";
    case "complained":
      return "COMPLAINED";
    default:
      return "ACCEPTED"; // envoyé / en file / retardé : livraison pas encore confirmée
  }
}

/** Petite attente entre deux pages : le fournisseur limite le débit à 2 requêtes par seconde. */
const PAGES_PER_CALL = 3;
const PAGE_SIZE = 100;

export type SyncResult = { read: number; updated: number; imported: number; next: string | null };

/**
 * Synchronise le suivi avec l'historique du fournisseur d'e-mails, par pages de 100 envois (les plus récents
 * d'abord) :
 *  - met à jour l'état de livraison des envois déjà suivis (livré, échoué, refusé…) ;
 *  - reprend les e-mails d'acceptation envoyés avant la mise en place du suivi.
 * Traite quelques pages par appel et renvoie le curseur de la suite ; l'écran relance jusqu'à la fin.
 */
export async function syncEmailStatusesAction(cursor: string | null): Promise<{ ok: true } & SyncResult | { ok: false; error: string }> {
  await requireSuperAdmin();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY n'est pas configurée sur ce serveur" };
  const headers = { Authorization: `Bearer ${apiKey}` };

  let read = 0;
  let updated = 0;
  let imported = 0;
  let next: string | null = cursor;

  try {
    for (let page = 0; page < PAGES_PER_CALL; page += 1) {
      const url = `https://api.resend.com/emails?limit=${PAGE_SIZE}${next ? `&after=${encodeURIComponent(next)}` : ""}`;
      const response = await fetch(url, { headers, cache: "no-store" });
      if (!response.ok) {
        if (response.status === 429) return { ok: false, error: "Le service d'e-mails limite le débit : réessayez dans quelques secondes." };
        return { ok: false, error: `Le service d'e-mails a répondu une erreur (${response.status}).` };
      }
      const body = (await response.json()) as {
        has_more?: boolean;
        data?: { id: string; to?: string[]; subject: string; last_event: string; created_at: string }[];
      };
      const items = body.data ?? [];
      read += items.length;
      if (items.length === 0) {
        next = null;
        break;
      }

      const known = await db.emailLog.findMany({
        where: { resendId: { in: items.map(item => item.id) } },
        select: { id: true, resendId: true, status: true },
      });
      const byResendId = new Map(known.map(row => [row.resendId as string, row]));

      // États à mettre à jour, regroupés pour limiter les requêtes.
      const toUpdate = new Map<AccessMailState, string[]>();
      const toCreate: { kind: string; toEmail: string; subject: string; status: string; resendId: string; createdAt: Date }[] = [];

      for (const item of items) {
        const status = statusFromEvent(item.last_event);
        const row = byResendId.get(item.id);
        if (row) {
          // On ne « rétrograde » jamais un envoi confirmé, ni une remise manuelle.
          if (status !== "ACCEPTED" && row.status !== status && row.status !== "MANUAL") {
            toUpdate.set(status, [...(toUpdate.get(status) ?? []), row.id]);
          }
        } else if (/candidature a été acceptée/i.test(item.subject) && item.to?.[0]) {
          toCreate.push({
            kind: "access",
            toEmail: item.to[0].toLowerCase(),
            subject: item.subject,
            status,
            resendId: item.id,
            createdAt: new Date(item.created_at),
          });
        }
      }

      for (const [status, ids] of toUpdate) {
        await db.emailLog.updateMany({ where: { id: { in: ids } }, data: { status } });
        updated += ids.length;
      }
      if (toCreate.length > 0) {
        await db.emailLog.createMany({ data: toCreate });
        imported += toCreate.length;
      }

      next = body.has_more ? items[items.length - 1].id : null;
      if (!next) break;
      await pause(600);
    }
    return { ok: true, read, updated, imported, next };
  } catch (error) {
    console.error("Synchronisation des emails impossible:", error);
    return { ok: false, error: "Impossible de joindre le service d'e-mails. Réessayez dans un instant." };
  }
}
