"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { getActorRegionScope } from "@/lib/region-scope";

/**
 * Vue d'ensemble : à quelle étape du parcours se trouve chaque candidat ambassadeur retenu.
 * Un STAFF cantonné à une région ne voit que les candidats de sa région (§ point focal régional) ;
 * l'admin et le super admin voient toutes les régions.
 */
export async function listAmbassadorProgressAction(editionId: string) {
  const actor = await requirePermission("applications.ambassador.manage");
  const regionId = getActorRegionScope(actor);

  const applications = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      ...(regionId ? { regionId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      stage: true,
      quizScore: true,
      rank: true,
      userId: true,
      region: { select: { id: true, name: true } },
      payment: { select: { status: true } },
      selection: { select: { status: true } },
      repechage: { select: { status: true } },
      engagement: { select: { acceptedAt: true } },
      boarding: { select: { status: true } },
      user: {
        select: {
          badges: {
            where: { editionId, badge: { code: "AMBASSADEUR" } },
            select: { number: true },
          },
        },
      },
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
    quizScore: application.quizScore,
    rank: application.rank,
    region: application.region,
    paymentStatus: application.payment?.status ?? null,
    selectionStatus: application.selection?.status ?? null,
    repechageStatus: application.repechage?.status ?? null,
    engagementSignedAt: application.engagement?.acceptedAt ?? null,
    boardingStatus: application.boarding?.status ?? null,
    badgeNumber: application.user?.badges[0]?.number ?? null,
  }));
}
