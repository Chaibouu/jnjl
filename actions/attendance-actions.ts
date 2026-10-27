"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { assertRegionAccess, getActorRegionScope } from "@/lib/region-scope";
import { recordBadgeCheckIn } from "@/lib/badge-checkin";
import { categoryLabel } from "@/lib/access-categories";
import { reconcileScanHubScans } from "@/lib/scanhub-reconcile";

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
    // Point focal : ses ambassadeurs (via leur compte) et les participants inscrits dans sa région.
    ...(regionUserIds && regionId
      ? {
          OR: [
            { userId: { in: regionUserIds } },
            { participation: { eventApplication: { regionId } } },
          ],
        }
      : {}),
  };
  const [records, total, awaiting] = await Promise.all([
    db.attendance.findMany({
      where,
      select: {
        id: true,
        checkedAt: true,
        user: { select: { name: true, email: true } },
        // Participant inscrit sans compte : son identité est celle de son inscription.
        participation: { select: { eventApplication: { select: { firstName: true, lastName: true, email: true } } } },
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

  // Badges d'accès (médias, comité, intervenants…) : sans région propre, ils ne concernent que les acteurs nationaux.
  const accessPasses = regionId
    ? { total: 0, checkedIn: 0, records: [] as { id: string; fullName: string; category: string; organization: string | null; number: string; checkedInAt: Date }[] }
    : await (async () => {
        const [totalPasses, checkedIn, recent] = await Promise.all([
          db.accessPass.count({ where: { editionId, status: "ACTIF" } }),
          db.accessPass.count({ where: { editionId, checkedInAt: { not: null } } }),
          db.accessPass.findMany({
            where: { editionId, checkedInAt: { not: null } },
            select: { id: true, fullName: true, category: true, organization: true, number: true, checkedInAt: true },
            orderBy: { checkedInAt: "desc" },
            take: 50,
          }),
        ]);
        return {
          total: totalPasses,
          checkedIn,
          records: recent.map(pass => ({
            id: pass.id,
            fullName: pass.fullName,
            category: categoryLabel(pass.category),
            organization: pass.organization,
            number: pass.number,
            checkedInAt: pass.checkedInAt as Date,
          })),
        };
      })();

  return {
    total,
    accessPasses,
    records: records.map(({ participation, ...record }) => ({
      ...record,
      user:
        record.user ??
        (participation?.eventApplication
          ? {
              name: `${participation.eventApplication.firstName} ${participation.eventApplication.lastName}`,
              email: participation.eventApplication.email,
            }
          : null),
    })),
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

/**
 * Rattrapage manuel des pointages ScanHub : relit les scans récents et enregistre ceux que le webhook n'a pas
 * apportés. Sans danger à répéter : un badge déjà pointé est ignoré.
 */
export async function reconcileScanHubAction() {
  await requirePermission("attendance.manage");
  return reconcileScanHubScans();
}
