"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";

/** Sessions du programme de l'édition, pour pointer « sur une session » ou sur l'événement en général. */
export async function listAttendanceSessionsAction(editionId: string) {
  await requirePermission("attendance.manage");

  const sessions = await db.programSession.findMany({
    where: { programDay: { editionId } },
    select: { id: true, title: true, startTime: true, programDay: { select: { date: true } } },
    orderBy: [{ programDay: { date: "asc" } }, { startTime: "asc" }],
  });
  return sessions;
}

/** Pointages récents + compteurs de l'édition (ou de la session filtrée). */
export async function listAttendanceAction(editionId: string, sessionId?: string | null) {
  await requirePermission("attendance.manage");

  const where = { editionId, ...(sessionId ? { sessionId } : {}) };
  const [records, total, awaiting] = await Promise.all([
    db.attendance.findMany({
      where,
      select: {
        id: true,
        checkedAt: true,
        user: { select: { name: true, email: true } },
        session: { select: { title: true } },
      },
      orderBy: { checkedAt: "desc" },
      take: 50,
    }),
    db.attendance.count({ where }),
    // Ambassadeurs embarqués, pas encore pointés à l'événement.
    db.ambassadorApplication.findMany({
      where: { editionId, status: "RETENU", stage: "PRESENCE", userId: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        region: { select: { name: true } },
        user: { select: { badges: { where: { editionId }, select: { number: true } } } },
      },
      orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
    }),
  ]);

  return {
    total,
    records,
    awaiting: awaiting.map(application => ({
      id: application.id,
      fullName: `${application.firstName} ${application.lastName}`,
      region: application.region.name,
      badgeNumber: application.user?.badges[0]?.number ?? null,
    })),
  };
}

/**
 * Pointe la présence d'un porteur de badge (saisie ou scan du numéro / QR).
 * Crée la participation si besoin ; pour un ambassadeur à l'étape PRESENCE,
 * fait passer la candidature à ATTESTATION.
 */
export async function checkInByBadgeAction(editionId: string, badgeNumber: string, sessionId?: string | null) {
  const checker = await requirePermission("attendance.manage");

  const number = badgeNumber.trim();
  if (!number) throw new Error("Numéro de badge requis");

  const userBadge = await db.userBadge.findUnique({
    where: { number },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!userBadge || userBadge.editionId !== editionId) {
    throw new Error("Badge inconnu pour cette édition");
  }
  if (userBadge.status !== "ACTIF") throw new Error("Ce badge n'est plus actif");

  const userId = userBadge.userId;
  const sessionFilter = sessionId ?? null;

  const already = await db.attendance.findFirst({
    where: { editionId, userId, sessionId: sessionFilter },
  });
  if (already) {
    throw new Error(`${userBadge.user.name ?? "Ce participant"} est déjà pointé(e)`);
  }

  const application = await db.ambassadorApplication.findFirst({
    where: { editionId, userId, status: "RETENU" },
    select: { id: true, stage: true },
  });
  if (application && application.stage === "EMBARQUEMENT") {
    throw new Error("L'embarquement de cet ambassadeur n'a pas encore été validé par le point focal");
  }

  const participation =
    (await db.eventParticipation.findFirst({ where: { editionId, userId } })) ??
    (await db.eventParticipation.create({ data: { editionId, userId } }));

  await db.$transaction([
    db.attendance.create({
      data: {
        editionId,
        userId,
        participationId: participation.id,
        sessionId: sessionFilter,
        checkedById: checker.id,
      },
    }),
    ...(application && application.stage === "PRESENCE"
      ? [db.ambassadorApplication.update({ where: { id: application.id }, data: { stage: "ATTESTATION" } })]
      : []),
  ]);

  return { name: userBadge.user.name ?? number };
}
