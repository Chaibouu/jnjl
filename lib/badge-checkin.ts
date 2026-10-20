import { db } from "@/lib/db";

export class CheckInError extends Error {
  constructor(
    message: string,
    /** Code stable pour que l'appelant (webhook) choisisse quoi répondre. */
    readonly code: "UNKNOWN_BADGE" | "INACTIVE" | "ALREADY" | "NOT_BOARDED"
  ) {
    super(message);
  }
}

/**
 * Pointe la présence d'un porteur de badge. Le badge est retrouvé par son numéro imprimé ou par le
 * contenu de son QR (jeton ScanHub). Crée la participation si besoin ; pour un ambassadeur à
 * l'étape PRESENCE, fait passer la candidature à ATTESTATION.
 *
 * `assertRegion` permet à l'appelant humain de vérifier la portée régionale du pointeur.
 */
export async function recordBadgeCheckIn(params: {
  editionId?: string;
  badgeRef: string;
  sessionId?: string | null;
  checkedById: string;
  /** Heure réelle du scan (rattrapage) ; par défaut l'instant présent. */
  at?: Date;
  assertRegion?: (regionId: string) => void;
}) {
  const ref = params.badgeRef.trim();
  if (!ref) throw new CheckInError("Numéro de badge requis", "UNKNOWN_BADGE");

  const userBadge = await db.userBadge.findFirst({
    where: { OR: [{ number: ref }, { qrCode: ref }] },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!userBadge) {
    // Badge d'accès (média, comité, intervenant…) : pas de compte ni de parcours, juste la présence.
    const pass = await db.accessPass.findFirst({
      where: { OR: [{ number: ref }, { qrCode: ref }] },
      select: { id: true, fullName: true, editionId: true, status: true, checkedInAt: true },
    });
    if (!pass || (params.editionId && pass.editionId !== params.editionId)) {
      throw new CheckInError("Badge inconnu pour cette édition", "UNKNOWN_BADGE");
    }
    if (pass.status !== "ACTIF") throw new CheckInError("Ce badge n'est plus actif", "INACTIVE");
    if (pass.checkedInAt) throw new CheckInError(`${pass.fullName} est déjà pointé(e)`, "ALREADY");
    await db.accessPass.update({ where: { id: pass.id }, data: { checkedInAt: params.at ?? new Date() } });
    return { name: pass.fullName };
  }
  if (!userBadge.editionId || (params.editionId && userBadge.editionId !== params.editionId)) {
    throw new CheckInError("Badge inconnu pour cette édition", "UNKNOWN_BADGE");
  }
  if (userBadge.status !== "ACTIF") throw new CheckInError("Ce badge n'est plus actif", "INACTIVE");

  const editionId = userBadge.editionId;
  const userId = userBadge.userId;
  const sessionId = params.sessionId ?? null;
  const name = userBadge.user.name ?? userBadge.number ?? ref;

  const already = await db.attendance.findFirst({ where: { editionId, userId, sessionId } });
  if (already) throw new CheckInError(`${name} est déjà pointé(e)`, "ALREADY");

  const application = await db.ambassadorApplication.findFirst({
    where: { editionId, userId, status: "RETENU" },
    select: { id: true, stage: true, regionId: true },
  });
  if (application) params.assertRegion?.(application.regionId);
  if (application && application.stage === "EMBARQUEMENT") {
    throw new CheckInError(
      "L'embarquement de cet ambassadeur n'a pas encore été validé par le point focal",
      "NOT_BOARDED"
    );
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
        sessionId,
        checkedById: params.checkedById,
        ...(params.at ? { checkedAt: params.at } : {}),
      },
    }),
    ...(application && application.stage === "PRESENCE"
      ? [db.ambassadorApplication.update({ where: { id: application.id }, data: { stage: "ATTESTATION" } })]
      : []),
  ]);

  return { name };
}
