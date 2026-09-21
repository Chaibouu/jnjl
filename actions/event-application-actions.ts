"use server";

import { ApplicationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { notify } from "@/lib/notify";

const applicationInclude = {
  region: { select: { id: true, name: true, code: true } },
  edition: { select: { id: true, name: true, year: true } },
  user: { select: { id: true, name: true, email: true } },
} as const;

export async function listEventApplicationsAction() {
  await requirePermission("applications.event.manage");
  return db.eventApplication.findMany({
    include: applicationInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getEventApplicationAction(id: string) {
  await requirePermission("applications.event.manage");
  const application = await db.eventApplication.findUnique({
    where: { id },
    include: applicationInclude,
  });
  if (!application) throw new Error("Candidature introuvable");
  return application;
}

export async function acceptEventApplicationAction(id: string) {
  const reviewer = await requirePermission("applications.event.manage");
  const application = await db.eventApplication.findUnique({ where: { id } });
  if (!application) throw new Error("Candidature introuvable");
  if (application.status === ApplicationStatus.RETENU) {
    throw new Error("Cette candidature est déjà acceptée");
  }

  await db.$transaction(async transaction => {
    await transaction.eventApplication.update({
      where: { id },
      data: {
        status: ApplicationStatus.RETENU,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
      },
    });

    await transaction.eventParticipation.upsert({
      where: { eventApplicationId: id },
      update: {},
      create: {
        editionId: application.editionId,
        userId: application.userId,
        eventApplicationId: id,
      },
    });
  });

  await notify({
    userId: application.userId,
    email: application.email,
    title: "Candidature acceptée",
    message: "Félicitations ! Votre candidature pour participer à l'événement a été retenue.",
    sendEmail: true,
  });

  return { id };
}

export async function rejectEventApplicationAction(id: string) {
  const reviewer = await requirePermission("applications.event.manage");
  const application = await db.eventApplication.findUnique({ where: { id } });
  if (!application) throw new Error("Candidature introuvable");
  if (application.status === ApplicationStatus.RETENU) {
    throw new Error("Une candidature acceptée ne peut pas être rejetée");
  }

  await db.eventApplication.update({
    where: { id },
    data: {
      status: ApplicationStatus.NON_RETENU,
      reviewedById: reviewer.id,
      reviewedAt: new Date(),
    },
  });
  await notify({
    userId: application.userId,
    email: application.email,
    title: "Candidature non retenue",
    message: "Nous sommes désolés : votre candidature pour participer à l'événement n'a pas été retenue cette fois-ci.",
    sendEmail: true,
  });
  return { id };
}

export async function waitlistEventApplicationAction(id: string) {
  const reviewer = await requirePermission("applications.event.manage");
  const application = await db.eventApplication.findUnique({ where: { id } });
  if (!application) throw new Error("Candidature introuvable");
  if (application.status === ApplicationStatus.RETENU) {
    throw new Error("Une candidature acceptée ne peut pas être mise en liste d'attente");
  }

  await db.eventApplication.update({
    where: { id },
    data: {
      status: ApplicationStatus.LISTE_ATTENTE,
      reviewedById: reviewer.id,
      reviewedAt: new Date(),
    },
  });
  await notify({
    userId: application.userId,
    email: application.email,
    title: "Candidature en liste d'attente",
    message: "Votre candidature pour participer à l'événement est placée en liste d'attente. Nous reviendrons vers vous.",
    sendEmail: true,
  });
  return { id };
}
