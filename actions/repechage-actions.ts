"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { notify } from "@/lib/notify";

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
      createdAt: true,
      decidedBy: { select: { name: true } },
    },
  },
} as const;

/** Candidats non sélectionnés par le quota — éligibles à un repêchage manuel exceptionnel (Règle 12). */
export async function getRepechageCandidatesAction(editionId: string) {
  await requirePermission("repechage.manage");

  return db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      OR: [
        { selection: { status: "NON_SELECTIONNE" } },
        { repechage: { isNot: null } },
      ],
    },
    select: applicationSelect,
    orderBy: [{ region: { name: "asc" } }, { rank: "asc" }],
  });
}

export async function decideRepechageAction(
  applicationId: string,
  decision: "VALIDE" | "REFUSE",
  justification: string
) {
  const actor = await requirePermission("repechage.manage");
  const trimmedJustification = justification.trim();
  if (trimmedJustification.length < 10) {
    throw new Error("La justification doit contenir au moins 10 caractères");
  }

  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    include: { selection: true },
  });
  if (!application) throw new Error("Candidature introuvable");
  if (application.selection?.status !== "NON_SELECTIONNE") {
    throw new Error("Seul un candidat non sélectionné peut faire l'objet d'un repêchage");
  }

  await db.$transaction(async transaction => {
    await transaction.repechage.upsert({
      where: { ambassadorApplicationId: applicationId },
      update: {
        status: decision,
        justification: trimmedJustification,
        decidedById: actor.id,
      },
      create: {
        ambassadorApplicationId: applicationId,
        status: decision,
        justification: trimmedJustification,
        decidedById: actor.id,
      },
    });

    if (decision === "VALIDE") {
      await transaction.selection.update({
        where: { ambassadorApplicationId: applicationId },
        data: { status: "SELECTIONNE" },
      });
    }

    // Repêché ou non, le candidat a désormais franchi le checkpoint de repêchage.
    await transaction.ambassadorApplication.update({
      where: { id: applicationId },
      data: { stage: "REPECHAGE" },
    });
  });

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

  return { applicationId, decision };
}
