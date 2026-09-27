"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";

const applicationInclude = {
  region: { select: { id: true, name: true, code: true } },
  edition: { select: { id: true, name: true, year: true } },
  user: { select: { id: true, name: true, email: true } },
  participation: { select: { badgeNumber: true } },
} as const;

/**
 * L'inscription à l'événement ne passe plus par une validation admin (§8 du guide admin) :
 * chaque candidature soumise vaut confirmation immédiate, avec badge généré à l'inscription
 * (voir `actions/participant-badge-actions.ts`). Ces actions ne servent donc plus qu'à
 * consulter et filtrer la liste des participants.
 */
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
