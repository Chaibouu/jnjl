"use server";

import { auditAdminAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { notify } from "@/lib/notify";
import { getActorRegionScope } from "@/lib/region-scope";

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
  selection: { select: { status: true, rank: true, withdrawnAt: true, withdrawnReason: true } },
} as const;

/** Étapes qui précèdent l'engagement : seules celles-ci peuvent être déplacées par la sélection. */
const STAGES_BEFORE_ENGAGEMENT: string[] = [
  "CANDIDATURE",
  "PAIEMENT",
  "FORMATION",
  "QCM",
  "CLASSEMENT",
  "SELECTION",
  "REPECHAGE",
];

/** Vue groupée par région : classement + quota + résultat de sélection le cas échéant. */
export async function getRankingAction(editionId: string) {
  const actor = await requirePermission("selection.manage");
  const regionId = getActorRegionScope(actor);

  const [applications, quotas] = await Promise.all([
    db.ambassadorApplication.findMany({
      where: { editionId, status: "RETENU", payment: { is: { status: "VALIDE" } }, ...(regionId ? { regionId } : {}) },
      select: applicationSelect,
      orderBy: [{ rank: "asc" }, { quizScore: "desc" }],
    }),
    db.regionalQuota.findMany({ where: { editionId, ...(regionId ? { regionId } : {}) } }),
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
  const actor = await requirePermission("selection.manage");
  const regionId = getActorRegionScope(actor);

  const applications = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      payment: { is: { status: "VALIDE" } },
      quizScore: { not: null },
      ...(regionId ? { regionId } : {}),
    },
    // À score égal, le premier à avoir terminé le QCM passe devant (sans heure connue : en dernier).
    orderBy: [{ quizScore: "desc" }, { quizCompletedAt: { sort: "asc", nulls: "last" } }],
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

  await auditAdminAction({
    actorId: actor.id,
    action: "RANKING_COMPUTED",
    target: { editionId, regionId, candidates: applications.length },
  });
  if (updates.length > 0) {
    await db.$transaction(updates);
  }

  return { count: applications.length };
}

/** Applique le quota régional (Règle 10) au classement figé pour décider qui est sélectionné. */
export async function runSelectionAction(editionId: string) {
  const actor = await requirePermission("selection.manage");
  const regionId = getActorRegionScope(actor);

  const [applications, quotas] = await Promise.all([
    db.ambassadorApplication.findMany({
      where: {
        editionId,
        status: "RETENU",
        payment: { is: { status: "VALIDE" } },
        rank: { not: null },
        ...(regionId ? { regionId } : {}),
      },
      include: {
        engagement: { select: { id: true } },
        repechage: { select: { status: true } },
        selection: { select: { withdrawnAt: true } },
      },
    }),
    db.regionalQuota.findMany({ where: { editionId, ...(regionId ? { regionId } : {}) } }),
  ]);

  if (applications.length === 0) {
    throw new Error("Lancez d'abord le classement avant la sélection");
  }

  const quotaByRegion = new Map(quotas.map(quota => [quota.regionId, quota.quota]));

  // Un ambassadeur retiré à la main de la sélection ne compte plus : sa place revient au suivant du classement.
  const positionById = new Map<string, number>();
  const seenByRegion = new Map<string, number>();
  for (const application of [...applications].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))) {
    if (application.selection?.withdrawnAt) continue;
    const position = (seenByRegion.get(application.regionId) ?? 0) + 1;
    seenByRegion.set(application.regionId, position);
    positionById.set(application.id, position);
  }
  const isSelectedById = new Map(
    applications.map(application => {
      const quota = quotaByRegion.get(application.regionId) ?? 0;
      const withdrawn = !!application.selection?.withdrawnAt;
      // Un repêché validé reste sélectionné même au-delà du quota.
      const selected =
        !withdrawn && (application.repechage?.status === "VALIDE" || (positionById.get(application.id) ?? Infinity) <= quota);
      return [application.id, selected] as const;
    })
  );

  const operations = applications.flatMap(application => {
    const isSelected = isSelectedById.get(application.id) ?? false;
    const status = isSelected ? "SELECTIONNE" : "NON_SELECTIONNE";
    // Un candidat sélectionné n'a pas besoin de repêchage : il passe directement ce
    // checkpoint. Un candidat non sélectionné reste à l'étape SELECTION, en attente
    // d'une éventuelle décision de repêchage (Règle 12).
    // Sélectionné : passe directement à l'engagement (le repêchage ne le concerne pas).
    const nextStage = isSelected ? "ENGAGEMENT" : "SELECTION";

    return [
      db.selection.upsert({
        where: { ambassadorApplicationId: application.id },
        update: { status, rank: application.rank },
        create: { ambassadorApplicationId: application.id, status, rank: application.rank },
      }),
      // Ne jamais faire reculer un ambassadeur déjà plus avancé (engagement signé, badge…) :
      // relancer la sélection ne touche à l'étape que de ceux qui n'ont pas encore dépassé le choix.
      ...(STAGES_BEFORE_ENGAGEMENT.includes(application.stage) ||
      (application.stage === "ENGAGEMENT" && !application.engagement)
        ? [
            db.ambassadorApplication.update({
              where: { id: application.id },
              data: { stage: nextStage },
            }),
          ]
        : []),
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
    const isSelected = isSelectedById.get(application.id) ?? false;
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

  await auditAdminAction({
    actorId: actor.id,
    action: "SELECTION_RUN",
    target: { editionId, regionId, candidates: applications.length },
  });
  return { count: applications.length };
}
