"use server";

import { revalidatePath } from "next/cache";
import { auditAdminAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { cancelBadge } from "@/lib/badge-cancel";
import { notify } from "@/lib/notify";

/**
 * Retrait manuel d'un ambassadeur de la sélection (admin / super admin) :
 * - son engagement et son badge sont annulés, il repasse « Non sélectionné » à l'étape Sélection ;
 * - la place libérée va automatiquement au suivant du classement de la région ;
 * - refusé si l'embarquement est validé ou une présence pointée (trop tard pour revenir en arrière).
 * Les actions renvoient `{ ok:false, error }` au lieu de lever, car la production masque les erreurs levées.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const STAGES_BEFORE_ENGAGEMENT = ["CANDIDATURE", "PAIEMENT", "FORMATION", "QCM", "CLASSEMENT", "SELECTION", "REPECHAGE"];

async function requireAdminActor() {
  const actor = await requirePermission("selection.manage");
  if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") return null;
  return actor;
}

export async function removeFromSelectionAction(
  applicationId: string,
  reason: string
): Promise<Result<{ replacement: string | null }>> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Réservé aux administrateurs" };

  const motif = reason.trim();
  if (motif.length < 3) return { ok: false, error: "Un motif est obligatoire" };

  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      editionId: true,
      regionId: true,
      stage: true,
      selection: { select: { status: true } },
      engagement: { select: { id: true } },
      boarding: { select: { status: true } },
    },
  });
  if (!application) return { ok: false, error: "Candidature introuvable" };
  if (application.selection?.status !== "SELECTIONNE") {
    return { ok: false, error: "Cet ambassadeur n'est pas dans la sélection" };
  }
  if (application.boarding?.status === "EMBARQUE" || ["PRESENCE", "ATTESTATION"].includes(application.stage)) {
    return { ok: false, error: "L'embarquement est déjà validé : le retrait n'est plus possible" };
  }
  if (application.userId) {
    const attendance = await db.attendance.count({
      where: { editionId: application.editionId, userId: application.userId },
    });
    if (attendance > 0) return { ok: false, error: "Une présence est déjà pointée : le retrait n'est plus possible" };
  }

  // 1. Badge (QR désactivé, numéro jamais réattribué). « Aucun badge » n'est pas une erreur ici.
  const badge = await cancelBadge(applicationId);
  if (!badge.ok && badge.reason !== "Aucun badge attribué") return { ok: false, error: badge.reason };

  // 2. Engagement annulé, statut de sélection retiré.
  await db.$transaction([
    ...(application.engagement ? [db.engagement.delete({ where: { id: application.engagement.id } })] : []),
    db.selection.update({
      where: { ambassadorApplicationId: applicationId },
      data: { status: "NON_SELECTIONNE", withdrawnAt: new Date(), withdrawnById: actor.id, withdrawnReason: motif },
    }),
    db.ambassadorApplication.update({ where: { id: applicationId }, data: { stage: "SELECTION" } }),
  ]);

  // 3. Place libérée : le suivant du classement (non retiré, payé, pas déjà sélectionné).
  const next = await db.ambassadorApplication.findFirst({
    where: {
      editionId: application.editionId,
      regionId: application.regionId,
      status: "RETENU",
      payment: { is: { status: "VALIDE" } },
      rank: { not: null },
      selection: { is: { status: "NON_SELECTIONNE", withdrawnAt: null } },
    },
    orderBy: { rank: "asc" },
    select: { id: true, userId: true, email: true, firstName: true, lastName: true, stage: true },
  });
  if (next) {
    await db.$transaction([
      db.selection.update({ where: { ambassadorApplicationId: next.id }, data: { status: "SELECTIONNE" } }),
      ...(STAGES_BEFORE_ENGAGEMENT.includes(next.stage)
        ? [db.ambassadorApplication.update({ where: { id: next.id }, data: { stage: "ENGAGEMENT" } })]
        : []),
    ]);
    await notify({
      userId: next.userId,
      email: next.email,
      title: "Vous êtes sélectionné(e) !",
      message:
        "Bonne nouvelle : une place s'est libérée et vous faites désormais partie des ambassadeurs sélectionnés pour votre région. Les prochaines étapes vous seront communiquées.",
      sendEmail: true,
    });
  }

  await notify({
    userId: application.userId,
    title: "Retrait de la sélection",
    message: "Vous avez été retiré(e) de la liste des ambassadeurs sélectionnés. Contactez l'équipe pour plus d'informations.",
  });

  await auditAdminAction({
    actorId: actor.id,
    action: "SELECTION_REMOVED",
    target: {
      applicationId,
      label: `${application.firstName} ${application.lastName}`,
      reason: motif,
      badgeCancelled: badge.ok,
      engagementCancelled: !!application.engagement,
      replacementId: next?.id ?? null,
    },
  });
  revalidatePath("/admin/selection");
  return { ok: true, replacement: next ? `${next.firstName} ${next.lastName}` : null };
}

/**
 * Remet dans la sélection quelqu'un qui en avait été retiré. Il revient « hors quota » (comme un repêché validé) :
 * relancer la sélection ne le retire donc pas, et ne déloge pas celui qui a pris sa place.
 */
export async function restoreToSelectionAction(applicationId: string): Promise<Result> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Réservé aux administrateurs" };

  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true, firstName: true, lastName: true, stage: true, selection: { select: { withdrawnAt: true } } },
  });
  if (!application?.selection?.withdrawnAt) return { ok: false, error: "Cet ambassadeur n'a pas été retiré de la sélection" };

  await db.$transaction([
    db.selection.update({
      where: { ambassadorApplicationId: applicationId },
      data: { status: "SELECTIONNE", withdrawnAt: null, withdrawnById: null, withdrawnReason: null },
    }),
    db.repechage.upsert({
      where: { ambassadorApplicationId: applicationId },
      update: { status: "VALIDE", decidedById: actor.id, decidedAt: new Date(), decisionComment: "Remis dans la sélection après un retrait" },
      create: {
        ambassadorApplicationId: applicationId,
        status: "VALIDE",
        justification: "Remis dans la sélection après un retrait",
        requestedById: actor.id,
        decidedById: actor.id,
        decidedAt: new Date(),
        decisionComment: "Remis dans la sélection après un retrait",
      },
    }),
    ...(STAGES_BEFORE_ENGAGEMENT.includes(application.stage)
      ? [db.ambassadorApplication.update({ where: { id: applicationId }, data: { stage: "ENGAGEMENT" } })]
      : []),
  ]);

  await notify({
    userId: application.userId,
    title: "Remis dans la sélection",
    message: "Vous faites de nouveau partie des ambassadeurs sélectionnés pour votre région.",
  });
  await auditAdminAction({
    actorId: actor.id,
    action: "SELECTION_RESTORED",
    target: { applicationId, label: `${application.firstName} ${application.lastName}` },
  });
  revalidatePath("/admin/selection");
  return { ok: true };
}
