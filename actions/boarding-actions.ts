"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { notify } from "@/lib/notify";
import { assertRegionAccess, getActorRegionScope } from "@/lib/region-scope";

type BoardingStatusInput = "EN_ATTENTE" | "EMBARQUE" | "ANNULE";

/** Ambassadeurs badgés, prêts pour l'embarquement vers Niamey (ou déjà passés à l'étape suivante). */
export async function listBoardingAction(editionId: string) {
  const actor = await requirePermission("boarding.manage");
  const regionId = getActorRegionScope(actor);

  const applications = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      stage: { in: ["EMBARQUEMENT", "PRESENCE", "ATTESTATION"] },
      ...(regionId ? { regionId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      stage: true,
      region: { select: { id: true, name: true } },
      boarding: { select: { status: true, validatedAt: true, validatedBy: { select: { name: true } } } },
    },
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });

  return applications.map(application => ({
    id: application.id,
    firstName: application.firstName,
    lastName: application.lastName,
    email: application.email,
    phone: application.phone,
    stage: application.stage,
    region: application.region,
    boardingStatus: (application.boarding?.status ?? "EN_ATTENTE") as BoardingStatusInput,
    validatedAt: application.boarding?.validatedAt ?? null,
    validatedByName: application.boarding?.validatedBy?.name ?? null,
  }));
}

/**
 * Le point focal valide l'embarquement d'un ambassadeur (Règle 14).
 * EMBARQUE fait passer la candidature à l'étape PRESENCE ; annuler un embarquement
 * déjà validé la ramène à EMBARQUEMENT tant que la présence n'a pas été pointée.
 */
export async function setBoardingStatusAction(applicationId: string, status: BoardingStatusInput) {
  const user = await requirePermission("boarding.manage");

  if (!["EN_ATTENTE", "EMBARQUE", "ANNULE"].includes(status)) {
    throw new Error("Statut d'embarquement invalide");
  }

  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, regionId: true, stage: true, status: true, userId: true, editionId: true },
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(user, application.regionId);
  if (application.status !== "RETENU") throw new Error("Cette candidature n'est pas retenue");
  if (!["EMBARQUEMENT", "PRESENCE"].includes(application.stage)) {
    throw new Error("L'embarquement n'est possible qu'après l'attribution du badge");
  }

  let nextStage = application.stage;
  if (status === "EMBARQUE") {
    nextStage = "PRESENCE";
  } else if (application.stage === "PRESENCE") {
    const hasAttendance = application.userId
      ? await db.attendance.count({
          where: { editionId: application.editionId, userId: application.userId },
        })
      : 0;
    if (hasAttendance > 0) {
      throw new Error("La présence a déjà été pointée : l'embarquement ne peut plus être modifié");
    }
    nextStage = "EMBARQUEMENT";
  }

  const validated = status === "EMBARQUE";
  await db.$transaction([
    db.boarding.upsert({
      where: { ambassadorApplicationId: application.id },
      create: {
        ambassadorApplicationId: application.id,
        regionId: application.regionId,
        status,
        validatedById: validated ? user.id : null,
        validatedAt: validated ? new Date() : null,
      },
      update: {
        status,
        validatedById: validated ? user.id : null,
        validatedAt: validated ? new Date() : null,
      },
    }),
    db.ambassadorApplication.update({
      where: { id: application.id },
      data: { stage: nextStage },
    }),
  ]);

  if (application.userId && (status === "EMBARQUE" || status === "ANNULE")) {
    await notify({
      userId: application.userId,
      title: status === "EMBARQUE" ? "Embarquement validé" : "Embarquement annulé",
      message:
        status === "EMBARQUE"
          ? "Votre point focal a validé votre embarquement vers Niamey. Bon voyage !"
          : "Votre embarquement a été annulé. Contactez votre point focal pour plus d'informations.",
      link: "/ambassadeur/badge",
    });
  }

  return { status };
}
