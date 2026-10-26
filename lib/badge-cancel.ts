import { db } from "@/lib/db";
import { setBadgeQrActive } from "@/lib/scanhub";

export const burnedCounterKey = (editionId: string) => `badges.ambassador_counter.${editionId}`;

export type CancelBadgeResult = { ok: true } | { ok: false; reason: string };

/**
 * Annule le badge d'un ambassadeur comme si l'administration ne l'avait pas encore attribué : la fiche badge est
 * supprimée, l'ambassadeur revient à l'étape « Badge » et le QR ScanHub est désactivé. Refusé si l'embarquement
 * est validé ou si une présence est déjà pointée. Le numéro n'est jamais réattribué.
 */
export async function cancelBadge(applicationId: string): Promise<CancelBadgeResult> {
  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      editionId: true,
      userId: true,
      stage: true,
      boarding: { select: { status: true } },
    },
  });
  if (!application?.userId) return { ok: false, reason: "Candidature introuvable" };

  const userBadge = await db.userBadge.findFirst({
    where: { userId: application.userId, editionId: application.editionId, badge: { code: "AMBASSADEUR" } },
    select: { id: true, number: true },
  });
  if (!userBadge) return { ok: false, reason: "Aucun badge attribué" };

  if (application.boarding?.status === "EMBARQUE" || ["PRESENCE", "ATTESTATION"].includes(application.stage)) {
    return { ok: false, reason: "L'embarquement est déjà validé : le badge ne peut plus être annulé" };
  }
  const attendance = await db.attendance.count({
    where: { editionId: application.editionId, userId: application.userId },
  });
  if (attendance > 0) return { ok: false, reason: "Une présence est déjà pointée : le badge ne peut plus être annulé" };

  // Le numéro est « brûlé » avant la suppression : il ne sera plus jamais redistribué.
  const burned = Number(userBadge.number?.match(/(\d+)$/)?.[1] ?? 0);
  const key = burnedCounterKey(application.editionId);
  const current = Number((await db.setting.findUnique({ where: { key }, select: { value: true } }))?.value ?? 0);
  await db.setting.upsert({
    where: { key },
    create: { key, value: String(Math.max(current, burned)), description: "Dernier numéro de badge ambassadeur attribué" },
    update: { value: String(Math.max(current, burned)) },
  });

  await db.$transaction([
    db.userBadge.delete({ where: { id: userBadge.id } }),
    db.ambassadorApplication.update({
      where: { id: application.id },
      data: { stage: application.stage === "EMBARQUEMENT" ? "BADGE" : application.stage },
    }),
    // Un embarquement « en attente » créé par la saisie du point focal n'a plus de raison d'être sans badge.
    ...(application.boarding
      ? [db.boarding.deleteMany({ where: { ambassadorApplicationId: application.id } })]
      : []),
  ]);

  // QR ScanHub : désactivé (ScanHub ne permet pas de le supprimer). Sans conséquence si ScanHub ne répond pas.
  if (userBadge.number) {
    try {
      await setBadgeQrActive(userBadge.number, false);
    } catch (error) {
      console.error("ScanHub : désactivation du QR d'un badge annulé en échec", error);
    }
  }
  return { ok: true };
}

