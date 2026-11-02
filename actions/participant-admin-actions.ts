"use server";

import { revalidatePath } from "next/cache";
import { auditAdminAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { buildParticipantBadgePdf } from "@/lib/participant-badge-pdf";
import { sendParticipantBadgeEmail } from "@/lib/mail";
import { syncParticipantQr } from "@/lib/participant-registration";
import { phoneKey } from "@/lib/phone";
import { Prisma } from "@prisma/client";
import { isScanHubEnabled, setBadgeQrActive } from "@/lib/scanhub";
import { getRegistrationState } from "@/lib/site-settings";

/**
 * Outils d'administration des participants à l'événement (inscription publique, sans compte).
 * Aucune fiche n'est jamais supprimée : annuler une inscription la marque annulée (avec le motif), désactive son badge
 * et libère sa place, mais toutes les informations du participant sont conservées et l'annulation est réversible.
 * Les actions renvoient `{ ok:false, error }` au lieu de lever, car la production masque les erreurs levées.
 */

type Result<T = object> = ({ ok: true; warning?: string } & T) | { ok: false; error: string };

async function requireAdmin() {
  const actor = await requirePermission("applications.event.manage");
  return actor.role === "ADMIN" || actor.role === "SUPER_ADMIN" ? actor : null;
}

export async function cancelParticipantAction(applicationId: string, reason: string): Promise<Result> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Réservé aux administrateurs" };
  const motif = reason.trim();
  if (motif.length < 3) return { ok: false, error: "Un motif est obligatoire" };

  const application = await db.eventApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, firstName: true, lastName: true, cancelledAt: true, participation: { select: { badgeNumber: true } } },
  });
  if (!application) return { ok: false, error: "Inscription introuvable" };
  if (application.cancelledAt) return { ok: false, error: "Cette inscription est déjà annulée" };

  // L'e-mail et le téléphone « actifs » sont libérés : la vraie personne peut s'inscrire. `email` et `phone` restent.
  await db.eventApplication.update({
    where: { id: applicationId },
    data: {
      status: "NON_RETENU",
      cancelledAt: new Date(),
      cancelledById: actor.id,
      cancelledReason: motif,
      activeEmail: null,
      phoneKey: null,
    },
  });

  // QR ScanHub désactivé. Si ScanHub ne répond pas, le pointage refuse quand même le badge annulé, mais le scanner de
  // l'entrée pourrait l'accepter : on prévient l'administrateur.
  let warning: string | undefined;
  const number = application.participation?.badgeNumber;
  if (number && isScanHubEnabled()) {
    try {
      await setBadgeQrActive(number, false);
    } catch (error) {
      console.error("ScanHub : désactivation du QR d'un participant annulé en échec", error);
      warning = "Inscription annulée, mais ScanHub n'a pas répondu : son QR n'a pas été désactivé. Réessayez plus tard.";
    }
  }

  await auditAdminAction({
    actorId: actor.id,
    action: "PARTICIPANT_CANCELLED",
    target: { applicationId, label: `${application.firstName} ${application.lastName}`, badge: number ?? null, reason: motif },
  });
  revalidatePath("/admin/candidatures/participants");
  return { ok: true, warning };
}

export async function restoreParticipantAction(applicationId: string): Promise<Result> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Réservé aux administrateurs" };

  const application = await db.eventApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      editionId: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      cancelledAt: true,
      participation: { select: { badgeNumber: true } },
    },
  });
  if (!application?.cancelledAt) return { ok: false, error: "Cette inscription n'est pas annulée" };

  // Les clés actives sont recalculées : si quelqu'un d'autre s'est inscrit entre-temps avec cet e-mail ou ce numéro,
  // le rétablissement est refusé (une seule inscription active par e-mail et par numéro).
  try {
    const capacity = (await getRegistrationState()).participantsCapacity;
    if (capacity > 0) {
      const registered = await db.eventApplication.count({ where: { editionId: application.editionId, cancelledAt: null } });
      if (registered >= capacity) return { ok: false, error: "Toutes les places sont prises : impossible de rétablir cette inscription" };
    }
    await db.eventApplication.update({
      where: { id: applicationId },
      data: {
        status: "RETENU",
        cancelledAt: null,
        cancelledById: null,
        cancelledReason: null,
        activeEmail: application.email.toLowerCase(),
        phoneKey: phoneKey(application.phone),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Une autre inscription active utilise déjà cet e-mail ou ce numéro de téléphone" };
    }
    throw error;
  }
  let warning: string | undefined;
  const number = application.participation?.badgeNumber;
  if (number && isScanHubEnabled()) {
    try {
      await setBadgeQrActive(number, true);
    } catch (error) {
      console.error("ScanHub : réactivation du QR d'un participant en échec", error);
      warning = "Inscription rétablie, mais ScanHub n'a pas répondu : son QR reste désactivé. Réessayez plus tard.";
    }
  }

  await auditAdminAction({
    actorId: actor.id,
    action: "PARTICIPANT_RESTORED",
    target: { applicationId, label: `${application.firstName} ${application.lastName}`, badge: number ?? null },
  });
  revalidatePath("/admin/candidatures/participants");
  return { ok: true, warning };
}

/** Envoie (ou renvoie) l'e-mail de confirmation avec le badge en PDF. Lève en cas d'échec d'envoi. */
async function sendBadgeEmail(application: {
  id: string;
  email: string;
  firstName: string;
  participation: { badgeNumber: string | null } | null;
}) {
  const badgeNumber = application.participation?.badgeNumber;
  if (!badgeNumber) throw new Error("Pas de badge");
  const pdf = await buildParticipantBadgePdf(application.id).catch(() => null);
  await sendParticipantBadgeEmail(
    application.email,
    application.firstName,
    application.id,
    badgeNumber,
    pdf ? { filename: pdf.filename, base64: pdf.base64 } : undefined
  );
}

export async function resendParticipantEmailAction(applicationId: string): Promise<Result> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Réservé aux administrateurs" };
  const application = await db.eventApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, email: true, firstName: true, cancelledAt: true, participation: { select: { badgeNumber: true } } },
  });
  if (!application || application.cancelledAt) return { ok: false, error: "Inscription introuvable ou annulée" };
  try {
    await sendBadgeEmail(application);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Envoi impossible" };
  }
}

const MAX_BATCH_MS = 40_000;

/**
 * Rejoue la création des QR ScanHub des badges participants restés au numéro (ScanHub était injoignable à
 * l'inscription). Par lots : s'arrête si ScanHub ne répond pas ou après ~40 s ; relancer pour continuer.
 */
export async function syncParticipantQrsAction(): Promise<Result<{ synced: number; remaining: number; emailed: number }>> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Réservé aux administrateurs" };
  if (!isScanHubEnabled()) return { ok: false, error: "ScanHub n'est pas configuré" };

  // Un QR encore au numéro (« JNJL-… ») n'a pas été enregistré chez ScanHub : un jeton ScanHub ne commence pas ainsi.
  const pending = await db.eventParticipation.findMany({
    where: {
      badgeNumber: { not: null },
      qrCode: { startsWith: "JNJL-" },
      eventApplication: { is: { cancelledAt: null } },
    },
    select: {
      id: true,
      badgeNumber: true,
      eventApplication: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  // Le PDF déjà distribué contient l'ancien QR (le numéro) : si les e-mails sont activés, le participant reçoit le nouveau.
  const sendEmails = (await getRegistrationState()).participantsEmails;

  const started = Date.now();
  let synced = 0;
  let emailed = 0;
  for (const participation of pending) {
    if (Date.now() - started > MAX_BATCH_MS) break;
    const name = participation.eventApplication ? `${participation.eventApplication.firstName} ${participation.eventApplication.lastName}` : "Participant";
    await syncParticipantQr(participation.id, name);
    const after = await db.eventParticipation.findUnique({ where: { id: participation.id }, select: { qrCode: true } });
    if (after?.qrCode?.startsWith("JNJL-")) break; // ScanHub ne répond pas : inutile d'insister
    synced += 1;
    if (sendEmails && participation.eventApplication) {
      try {
        await sendBadgeEmail({ ...participation.eventApplication, participation: { badgeNumber: participation.badgeNumber } });
        emailed += 1;
      } catch (error) {
        console.error("Resynchronisation QR : e-mail du nouveau badge non envoyé", error);
      }
    }
  }
  return { ok: true, synced, remaining: pending.length - synced, emailed };
}

/**
 * Renvoie l'e-mail de confirmation aux participants dont l'envoi a échoué (et qui n'ont reçu aucun autre e-mail de
 * ce type depuis). Par lots de 20, pour respecter le débit de Resend ; relancer pour continuer.
 */
export async function resendFailedParticipantEmailsAction(): Promise<Result<{ sent: number; failed: number; remaining: number }>> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Réservé aux administrateurs" };

  const logs = await db.emailLog.findMany({
    where: { kind: "participant_badge", createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
    select: { toEmail: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  // Dernier état connu par adresse : on ne renvoie qu'à ceux dont le dernier essai a échoué. Une adresse qui a déjà échoué
  // 3 fois est refusée pour de bon (adresse invalide, rejet définitif) : on l'écarte pour ne pas bloquer les autres.
  const lastStatus = new Map<string, string>();
  const failures = new Map<string, number>();
  for (const log of logs) {
    const address = log.toEmail.toLowerCase();
    lastStatus.set(address, log.status);
    if (log.status === "FAILED") failures.set(address, (failures.get(address) ?? 0) + 1);
  }
  const failedEmails = [...lastStatus]
    .filter(([address, status]) => status === "FAILED" && (failures.get(address) ?? 0) < 3)
    .map(([address]) => address);
  if (failedEmails.length === 0) return { ok: true, sent: 0, failed: 0, remaining: 0 };

  const applications = await db.eventApplication.findMany({
    where: { email: { in: failedEmails }, cancelledAt: null, participation: { badgeNumber: { not: null } } },
    select: { id: true, email: true, firstName: true, participation: { select: { badgeNumber: true } } },
    orderBy: { createdAt: "asc" },
  });

  const batch = applications.slice(0, 20);
  let sent = 0;
  let failed = 0;
  for (const application of batch) {
    try {
      await sendBadgeEmail(application);
      sent += 1;
    } catch (error) {
      failed += 1;
      // Quota d'e-mails épuisé : inutile de continuer le lot.
      if (error instanceof Error && /quota_exceeded/i.test(error.message)) break;
    }
  }
  return { ok: true, sent, failed, remaining: Math.max(0, applications.length - sent) };
}
