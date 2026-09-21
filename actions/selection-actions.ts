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
  stage: true,
  status: true,
  regionId: true,
  region: { select: { id: true, name: true, code: true } },
  selection: { select: { status: true, rank: true } },
} as const;

/** Vue groupée par région : classement + quota + résultat de sélection le cas échéant. */
export async function getRankingAction(editionId: string) {
  await requirePermission("selection.manage");

  const [applications, quotas] = await Promise.all([
    db.ambassadorApplication.findMany({
      where: { editionId, status: "RETENU" },
      select: applicationSelect,
      orderBy: [{ rank: "asc" }, { quizScore: "desc" }],
    }),
    db.regionalQuota.findMany({ where: { editionId } }),
  ]);

  const quotaByRegion = new Map(quotas.map(quota => [quota.regionId, quota.quota]));

  const groups = new Map<string, { region: (typeof applications)[number]["region"]; quota: number; applications: typeof applications }>();
  for (const application of applications) {
    const key = application.regionId;
    if (!groups.has(key)) {
      groups.set(key, {
        region: application.region,
        quota: quotaByRegion.get(key) ?? 0,
        applications: [],
      });
    }
    groups.get(key)!.applications.push(application);
  }

  return Array.from(groups.values()).sort((a, b) => a.region.name.localeCompare(b.region.name));
}

/** Calcule (ou recalcule) le rang de chaque candidat retenu au sein de sa région, selon le score QCM (Règle 11). */
export async function computeRankingAction(editionId: string) {
  await requirePermission("selection.manage");

  const applications = await db.ambassadorApplication.findMany({
    where: { editionId, status: "RETENU", quizScore: { not: null } },
    orderBy: { quizScore: "desc" },
  });

  const byRegion = new Map<string, typeof applications>();
  for (const application of applications) {
    if (!byRegion.has(application.regionId)) byRegion.set(application.regionId, []);
    byRegion.get(application.regionId)!.push(application);
  }

  const updates = Array.from(byRegion.values()).flatMap(regionApplications =>
    regionApplications.map((application, index) =>
      db.ambassadorApplication.update({
        where: { id: application.id },
        data: {
          rank: index + 1,
          stage: application.stage === "QCM" ? "CLASSEMENT" : application.stage,
        },
      })
    )
  );

  if (updates.length > 0) {
    await db.$transaction(updates);
  }

  return { count: applications.length };
}

/** Applique le quota régional (Règle 10) au classement figé pour décider qui est sélectionné. */
export async function runSelectionAction(editionId: string) {
  await requirePermission("selection.manage");

  const [applications, quotas] = await Promise.all([
    db.ambassadorApplication.findMany({
      where: { editionId, status: "RETENU", rank: { not: null } },
    }),
    db.regionalQuota.findMany({ where: { editionId } }),
  ]);

  if (applications.length === 0) {
    throw new Error("Lancez d'abord le classement avant la sélection");
  }

  const quotaByRegion = new Map(quotas.map(quota => [quota.regionId, quota.quota]));

  const operations = applications.flatMap(application => {
    const quota = quotaByRegion.get(application.regionId) ?? 0;
    const isSelected = (application.rank ?? Infinity) <= quota;
    const status = isSelected ? "SELECTIONNE" : "NON_SELECTIONNE";
    // Un candidat sélectionné n'a pas besoin de repêchage : il passe directement ce
    // checkpoint. Un candidat non sélectionné reste à l'étape SELECTION, en attente
    // d'une éventuelle décision de repêchage (Règle 12).
    const nextStage = isSelected ? "REPECHAGE" : "SELECTION";

    return [
      db.selection.upsert({
        where: { ambassadorApplicationId: application.id },
        update: { status, rank: application.rank },
        create: { ambassadorApplicationId: application.id, status, rank: application.rank },
      }),
      db.ambassadorApplication.update({
        where: { id: application.id },
        data: { stage: nextStage },
      }),
    ];
  });

  // Résultats précédents : on ne notifie que si le résultat change (relance de la sélection).
  const previous = await db.selection.findMany({
    where: { ambassadorApplicationId: { in: applications.map(application => application.id) } },
    select: { ambassadorApplicationId: true, status: true },
  });
  const previousStatus = new Map(previous.map(item => [item.ambassadorApplicationId, item.status]));

  await db.$transaction(operations);

  for (const application of applications) {
    const isSelected = (application.rank ?? Infinity) <= (quotaByRegion.get(application.regionId) ?? 0);
    if (previousStatus.get(application.id) === (isSelected ? "SELECTIONNE" : "NON_SELECTIONNE")) continue;
    await notify({
      userId: application.userId,
      email: application.email,
      title: isSelected ? "Vous êtes sélectionné(e) !" : "Résultat de la sélection",
      message: isSelected
        ? "Bravo ! Vous faites partie des ambassadeurs sélectionnés pour votre région. Les prochaines étapes vous seront communiquées."
        : "Vous n'avez pas été sélectionné(e) dans le quota de votre région. Un repêchage exceptionnel reste possible : nous vous tiendrons informé(e).",
      sendEmail: true,
    });
  }

  return { count: applications.length };
}
