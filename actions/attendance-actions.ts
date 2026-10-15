"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { assertRegionAccess, getActorRegionScope } from "@/lib/region-scope";
import { recordBadgeCheckIn } from "@/lib/badge-checkin";

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
  const actor = await requirePermission("attendance.manage");
  const regionId = getActorRegionScope(actor);

  // `Attendance` n'a pas de région propre : pour un point focal, on la restreint via les
  // `userId` des candidatures ambassadeur de sa région (seul chemin reliant les deux modèles).
  const regionUserIds = regionId
    ? (
        await db.ambassadorApplication.findMany({
          where: { editionId, regionId, userId: { not: null } },
          select: { userId: true },
        })
      ).map(application => application.userId as string)
    : null;

  const where = {
    editionId,
    ...(sessionId ? { sessionId } : {}),
    ...(regionUserIds ? { userId: { in: regionUserIds } } : {}),
  };
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
      where: {
        editionId,
        status: "RETENU",
        stage: "PRESENCE",
        userId: { not: null },
        ...(regionId ? { regionId } : {}),
      },
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
  return recordBadgeCheckIn({
    editionId,
    badgeRef: badgeNumber,
    sessionId,
    checkedById: checker.id,
    assertRegion: regionId => assertRegionAccess(checker, regionId),
  });
}
