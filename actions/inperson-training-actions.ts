"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { notify } from "@/lib/notify";
import { assertRegionAccess, getActorRegionScope } from "@/lib/region-scope";

/**
 * Ambassadeurs ayant payé (donc astreints à la formation) : le staff ne voit que sa région,
 * l'admin voit la liste nationale.
 */
export async function listInPersonTrainingAction(editionId: string) {
  const actor = await requirePermission("training.inperson.manage");
  const regionId = getActorRegionScope(actor);

  const applications = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      payment: { is: { status: "VALIDE" } },
      ...(regionId ? { regionId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      stage: true,
      inPersonTrainingAt: true,
      region: { select: { name: true } },
    },
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });

  return applications.map(application => ({
    id: application.id,
    fullName: `${application.firstName} ${application.lastName}`,
    phone: application.phone,
    region: application.region.name,
    stage: application.stage,
    doneAt: application.inPersonTrainingAt,
  }));
}

/** Marque la formation présentielle comme faite ; débloque le QCM si l'ambassadeur attendait à FORMATION. */
export async function markInPersonTrainingDoneAction(applicationId: string) {
  const actor = await requirePermission("training.inperson.manage");

  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      userId: true,
      regionId: true,
      stage: true,
      status: true,
      inPersonTrainingAt: true,
      payment: { select: { status: true } },
    },
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(actor, application.regionId);
  if (application.status !== "RETENU" || application.payment?.status !== "VALIDE") {
    throw new Error("Cet ambassadeur n'a pas encore payé : la formation ne peut pas être validée");
  }

  await db.ambassadorApplication.update({
    where: { id: applicationId },
    data: {
      inPersonTrainingAt: new Date(),
      inPersonTrainingById: actor.id,
      ...(application.stage === "FORMATION" ? { stage: "QCM" } : {}),
    },
  });

  if (!application.inPersonTrainingAt) {
    await notify({
      userId: application.userId,
      title: "Formation validée",
      message: "Votre formation a été validée par le staff de votre région. Vous pouvez maintenant passer le QCM.",
      link: "/ambassadeur/qcm",
    });
  }
  return { id: applicationId };
}
