"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { notify } from "@/lib/notify";
import { assertRegionAccess, getActorRegionScope } from "@/lib/region-scope";
import { ForbiddenError } from "@/lib/forbidden-error";

const applicationSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  quizScore: true,
  rank: true,
  region: { select: { id: true, name: true, code: true } },
  repechage: {
    select: {
      status: true,
      justification: true,
      decisionComment: true,
      createdAt: true,
      updatedAt: true,
      decidedAt: true,
      requestedBy: { select: { id: true, name: true, role: true } },
      decidedBy: { select: { id: true, name: true, role: true } },
    },
  },
} as const;

/** Candidats non sélectionnés par le quota — éligibles à un repêchage manuel exceptionnel (Règle 12). */
export async function getRepechageCandidatesAction(editionId: string) {
  const actor = await requirePermission("repechage.manage");
  const regionId = getActorRegionScope(actor);

  return db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      ...(regionId ? { regionId } : {}),
      OR: [
        { selection: { status: "NON_SELECTIONNE" } },
        { repechage: { isNot: null } },
      ],
    },
    select: applicationSelect,
    orderBy: [{ region: { name: "asc" } }, { rank: "asc" }],
  });
}

/**
 * Permet aux STAFFS (ou admins) de soumettre une demande de repêchage avec motif.
 * La demande reste en statut EN_ATTENTE jusqu'à validation par un administrateur.
 */
export async function requestRepechageAction(
  applicationId: string,
  motif: string
) {
  const actor = await requirePermission("repechage.manage");
  const trimmedMotif = motif.trim();
  if (trimmedMotif.length < 10) {
    throw new Error("Le motif de la demande doit contenir au moins 10 caractères");
  }

  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    include: { selection: true, repechage: true },
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(actor, application.regionId);

  if (application.selection?.status !== "NON_SELECTIONNE") {
    throw new Error("Seul un candidat non sélectionné peut faire l'objet d'une demande de repêchage");
  }

  if (application.repechage?.status === "VALIDE") {
    throw new Error("Ce candidat a déjà été repêché");
  }

  await db.repechage.upsert({
    where: { ambassadorApplicationId: applicationId },
    update: {
      status: "EN_ATTENTE",
      justification: trimmedMotif,
      requestedById: actor.id,
      decidedById: null,
      decidedAt: null,
      decisionComment: null,
    },
    create: {
      ambassadorApplicationId: applicationId,
      status: "EN_ATTENTE",
      justification: trimmedMotif,
      requestedById: actor.id,
    },
  });

  return { applicationId, status: "EN_ATTENTE" };
}

/**
 * Permet à un membre du staff (ou admin) d'annuler sa demande de repêchage en attente.
 */
export async function cancelRepechageRequestAction(applicationId: string) {
  const actor = await requirePermission("repechage.manage");
  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    include: { repechage: true },
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(actor, application.regionId);

  if (!application.repechage) {
    throw new Error("Aucune demande de repêchage trouvée");
  }
  if (application.repechage.status !== "EN_ATTENTE") {
    throw new Error("Impossible d'annuler une demande déjà traitée");
  }

  // Le staff ne peut annuler que sa propre demande
  if (actor.role === "STAFF" && application.repechage.requestedById !== actor.id) {
    throw new Error("Vous ne pouvez annuler que vos propres demandes");
  }

  await db.repechage.delete({
    where: { ambassadorApplicationId: applicationId },
  });

  return { applicationId, cancelled: true };
}

/**
 * Prise de décision (Validation / Refus) réservée exclusivement aux ADMINISTRATEURS et SUPER_ADMINS.
 * - Si le candidat avait une demande de staff en attente, valide ou refuse la demande avec note éventuelle.
 * - Si le candidat n'avait pas de demande, permet à l'admin de repêcher directement avec justification.
 */
export async function decideRepechageAction(
  applicationId: string,
  decision: "VALIDE" | "REFUSE",
  justification?: string
) {
  const actor = await requirePermission("repechage.manage");
  if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
    throw new ForbiddenError(
      "Seuls les administrateurs et super-administrateurs peuvent valider ou refuser un repêchage"
    );
  }

  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    include: { selection: true, repechage: true },
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(actor, application.regionId);
  if (application.selection?.status !== "NON_SELECTIONNE") {
    throw new Error("Seul un candidat non sélectionné peut faire l'objet d'un repêchage");
  }

  const trimmedComment = justification?.trim() || "";
  // Pour un repêchage direct (pas de demande préalable), la justification est obligatoire
  if (!application.repechage && trimmedComment.length < 10) {
    throw new Error("La justification du repêchage doit contenir au moins 10 caractères");
  }

  const finalJustification =
    application.repechage?.justification || trimmedComment || "Repêchage direct par l'administration";
  const decisionComment = trimmedComment.length > 0 ? trimmedComment : null;

  await db.$transaction(async transaction => {
    await transaction.repechage.upsert({
      where: { ambassadorApplicationId: applicationId },
      update: {
        status: decision,
        decidedById: actor.id,
        decidedAt: new Date(),
        decisionComment: decisionComment,
        ...(application.repechage?.justification ? {} : { justification: finalJustification }),
      },
      create: {
        ambassadorApplicationId: applicationId,
        status: decision,
        justification: finalJustification,
        requestedById: actor.id,
        decidedById: actor.id,
        decidedAt: new Date(),
        decisionComment: decisionComment,
      },
    });

    if (decision === "VALIDE") {
      await transaction.selection.update({
        where: { ambassadorApplicationId: applicationId },
        data: { status: "SELECTIONNE" },
      });
      // Repêché : passe à l'étape ENGAGEMENT
      await transaction.ambassadorApplication.update({
        where: { id: applicationId },
        data: { stage: "ENGAGEMENT" },
      });
    }
  });

  // Notifier le candidat
  await notify({
    userId: application.userId,
    email: application.email,
    title: decision === "VALIDE" ? "Repêchage accepté" : "Repêchage refusé",
    message:
      decision === "VALIDE"
        ? "Bonne nouvelle : votre candidature a été repêchée. Vous faites désormais partie des ambassadeurs sélectionnés."
        : "Votre candidature n'a pas été repêchée. Merci pour votre engagement.",
    sendEmail: true,
  });

  // Notifier le staff demandeur si différent de l'admin
  if (application.repechage?.requestedById && application.repechage.requestedById !== actor.id) {
    await notify({
      userId: application.repechage.requestedById,
      title: decision === "VALIDE" ? "Demande de repêchage acceptée" : "Demande de repêchage refusée",
      message: `Votre demande de repêchage pour ${application.firstName} ${application.lastName} a été ${
        decision === "VALIDE" ? "acceptée" : "refusée"
      } par ${actor.name || "l'administration"}.${decisionComment ? ` Remarque : "${decisionComment}"` : ""}`,
      sendEmail: false,
    });
  }

  return { applicationId, decision };
}
