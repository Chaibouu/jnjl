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

const FINAL_STATUS: Record<string, AccessMailState> = {
  delivered: "DELIVERED",
  failed: "FAILED",
  bounced: "BOUNCED",
  complained: "COMPLAINED",
};


/**
 * Met à jour l'état de livraison des derniers e-mails (le fournisseur accepte l'envoi puis le marque
 * « livré » ou « échoué » après coup) et reprend les e-mails d'acceptation envoyés avant la mise en place de ce
 * suivi. Traite un petit lot par appel : relancer pour continuer.
 */
export async function refreshEmailStatusesAction(): Promise<
  { ok: true; checked: number; pending: number } | { ok: false; error: string }
> {
  await requireSuperAdmin();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY n'est pas configurée sur ce serveur" };
  const headers = { Authorization: `Bearer ${apiKey}` };

  try {
    // 1. Reprise des e-mails d'acceptation déjà envoyés (une seule requête, sans doublon).
    const listing = await fetch("https://api.resend.com/emails?limit=100", { headers, cache: "no-store" });
    if (listing.ok) {
      const body = (await listing.json()) as {
        data?: { id: string; to?: string[]; subject: string; last_event: string; created_at: string }[];
      };
      const known = new Set(
        (await db.emailLog.findMany({ where: { resendId: { not: null } }, select: { resendId: true } })).map(row => row.resendId)
      );
      for (const item of body.data ?? []) {
        if (known.has(item.id) || !/candidature a été acceptée/i.test(item.subject)) continue;
        const recipient = item.to?.[0]?.toLowerCase();
        if (!recipient) continue;
        await db.emailLog.create({
          data: {
            kind: "access",
            toEmail: recipient,
            subject: item.subject,
            status: FINAL_STATUS[item.last_event] ?? "ACCEPTED",
            resendId: item.id,
            createdAt: new Date(item.created_at),
          },
        });
      }
    }

    // 2. Vérification des envois encore « pris en charge », les plus récents d'abord.
    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const waiting = await db.emailLog.findMany({
      where: { status: "ACCEPTED", resendId: { not: null }, createdAt: { gte: since } },
      orderBy: [{ kind: "asc" }, { createdAt: "desc" }],
      take: 12,
      select: { id: true, resendId: true },
    });

    let checked = 0;
    for (const log of waiting) {
      const response = await fetch(`https://api.resend.com/emails/${log.resendId}`, { headers, cache: "no-store" });
      if (response.ok) {
        const detail = (await response.json()) as { last_event?: string };
        const next = FINAL_STATUS[detail.last_event ?? ""];
        if (next) await db.emailLog.update({ where: { id: log.id }, data: { status: next } });
      }
      checked += 1;
      await pause(600);
    }

    const pending = await db.emailLog.count({ where: { status: "ACCEPTED", resendId: { not: null }, createdAt: { gte: since } } });
    return { ok: true, checked, pending };
  } catch (error) {
    console.error("Suivi des emails impossible:", error);
    return { ok: false, error: "Impossible de joindre le service d'e-mails. Réessayez dans un instant." };
  }
}
