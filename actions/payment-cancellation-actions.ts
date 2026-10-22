"use server";

import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/actions/requirePermission";
import { auditAdminAction } from "@/lib/audit";
import { notify } from "@/lib/notify";

/**
 * Annulation d'un paiement et désistement d'un candidat — réservés au Super Admin.
 *
 * L'argent n'est jamais rendu par la plateforme : l'annulation retire le paiement du système (le reçu avec) et
 * renvoie le montant à rembourser, que l'administration restitue elle-même au candidat. Un instantané du paiement
 * (montant, moyen, référence, qui l'avait validé) est conservé dans le journal d'audit pour justifier le remboursement.
 */

export type CancelResult =
  | { ok: true; message: string; refundDue: { amount: number; method: string; provider: string | null; reference: string | null } | null }
  | { ok: false; error: string };

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 300);

async function loadApplication(applicationId: string) {
  return db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      editionId: true,
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      stage: true,
      quizScore: true,
      payment: {
        select: { id: true, amount: true, method: true, provider: true, reference: true, validatedAt: true, status: true },
      },
      selection: { select: { id: true } },
      engagement: { select: { id: true } },
      boarding: { select: { status: true } },
    },
  });
}

/** Un badge attribué, un embarquement validé ou une présence pointée rendent toute annulation impossible. */
async function advancedReason(application: NonNullable<Awaited<ReturnType<typeof loadApplication>>>) {
  if (application.userId) {
    const [badges, attendance] = await Promise.all([
      db.userBadge.count({ where: { userId: application.userId, editionId: application.editionId } }),
      db.attendance.count({ where: { userId: application.userId, editionId: application.editionId } }),
    ]);
    if (badges > 0) return "Un badge a déjà été attribué : annulez-le d'abord depuis l'écran Badges.";
    if (attendance > 0) return "Une présence est déjà pointée : l'annulation n'est plus possible.";
  }
  if (application.boarding?.status === "EMBARQUE") return "L'embarquement est déjà validé : l'annulation n'est plus possible.";
  return null;
}

function paymentSnapshot(payment: { amount: number; method: string; provider: string | null; reference: string | null; validatedAt: Date | null }) {
  return {
    amount: payment.amount,
    method: payment.method,
    provider: payment.provider,
    reference: payment.reference,
    validatedAt: payment.validatedAt?.toISOString() ?? null,
  };
}

/**
 * Annule le paiement d'un candidat accepté et le ramène à l'étape « Paiement », comme s'il n'avait jamais payé.
 * Possible tant qu'il n'a pas passé le QCM ni progressé au-delà (sélection, engagement, badge…).
 */
export async function cancelPaymentAction(applicationId: string, reason: string): Promise<CancelResult> {
  const actor = await requireSuperAdmin();
  const application = await loadApplication(applicationId);
  if (!application) return { ok: false, error: "Candidature introuvable" };
  if (!application.payment) return { ok: false, error: "Aucun paiement à annuler pour ce candidat" };

  const blocked = await advancedReason(application);
  if (blocked) return { ok: false, error: blocked };
  if (!["FORMATION", "QCM"].includes(application.stage) || application.quizScore !== null || application.selection || application.engagement) {
    return {
      ok: false,
      error:
        "Ce candidat a déjà avancé au-delà du QCM (classement, sélection ou engagement) : utilisez plutôt le désistement.",
    };
  }
  const completedQuiz = await db.quizAttempt.count({ where: { ambassadorApplicationId: applicationId, status: "COMPLETED" } });
  if (completedQuiz > 0) {
    return { ok: false, error: "Ce candidat a déjà passé un QCM : utilisez plutôt le désistement." };
  }

  const snapshot = paymentSnapshot(application.payment);
  await db.$transaction([
    // Le reçu (document lié) disparaît avec le paiement.
    db.payment.delete({ where: { id: application.payment.id } }),
    db.quizAttempt.updateMany({
      where: { ambassadorApplicationId: applicationId, status: "IN_PROGRESS" },
      data: { status: "EXPIRED" },
    }),
    db.ambassadorApplication.update({
      where: { id: applicationId },
      data: { stage: "PAIEMENT", inPersonTrainingAt: null, inPersonTrainingById: null },
    }),
  ]);

  await auditAdminAction({
    actorId: actor.id,
    action: "PAYMENT_CANCELLED",
    target: {
      applicationId,
      userId: application.userId ?? undefined,
      label: application.email,
      name: `${application.firstName} ${application.lastName}`,
      reason: clean(reason) || "Non précisé",
      refundDue: true,
      payment: snapshot,
    },
  });
  await notify({
    userId: application.userId,
    title: "Paiement annulé",
    message: "Votre paiement a été annulé par l'administration. Votre candidature reste acceptée : le paiement reste à effectuer.",
    link: "/ambassadeur/paiement",
  });

  return {
    ok: true,
    message: "Paiement annulé : le candidat est revenu à l'étape « Paiement ».",
    refundDue: { amount: snapshot.amount, method: snapshot.method, provider: snapshot.provider, reference: snapshot.reference },
  };
}

/**
 * Enregistre le désistement d'un candidat : la candidature est annulée (non retenue, motif « Désistement »), son
 * paiement éventuel est retiré et son rang supprimé. Impossible une fois le badge attribué ou l'embarquement validé.
 */
export async function withdrawAmbassadorApplicationAction(applicationId: string, reason: string): Promise<CancelResult> {
  const actor = await requireSuperAdmin();
  const application = await loadApplication(applicationId);
  if (!application) return { ok: false, error: "Candidature introuvable" };
  if (application.status === "NON_RETENU") return { ok: false, error: "Cette candidature est déjà annulée ou rejetée" };

  const blocked = await advancedReason(application);
  if (blocked) return { ok: false, error: blocked };

  const text = clean(reason);
  const snapshot = application.payment ? paymentSnapshot(application.payment) : null;

  await db.$transaction([
    ...(application.payment ? [db.payment.delete({ where: { id: application.payment.id } })] : []),
    db.selection.deleteMany({ where: { ambassadorApplicationId: applicationId } }),
    db.quizAttempt.updateMany({
      where: { ambassadorApplicationId: applicationId, status: "IN_PROGRESS" },
      data: { status: "EXPIRED" },
    }),
    db.ambassadorApplication.update({
      where: { id: applicationId },
      data: {
        status: "NON_RETENU",
        stage: "CANDIDATURE",
        rank: null,
        quizScore: null,
        quizCompletedAt: null,
        inPersonTrainingAt: null,
        inPersonTrainingById: null,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        rejectionReason: `Désistement du candidat${text ? ` : ${text}` : ""}`,
      },
    }),
  ]);

  await auditAdminAction({
    actorId: actor.id,
    action: "APPLICATION_WITHDRAWN",
    target: {
      applicationId,
      userId: application.userId ?? undefined,
      label: application.email,
      name: `${application.firstName} ${application.lastName}`,
      reason: text || "Non précisé",
      refundDue: Boolean(snapshot),
      payment: snapshot ?? undefined,
    },
  });
  await notify({
    userId: application.userId,
    title: "Désistement enregistré",
    message: "Votre désistement a bien été enregistré : votre candidature ambassadeur est annulée.",
  });

  return {
    ok: true,
    message: "Désistement enregistré : la candidature est annulée.",
    refundDue: snapshot
      ? { amount: snapshot.amount, method: snapshot.method, provider: snapshot.provider, reference: snapshot.reference }
      : null,
  };
}
