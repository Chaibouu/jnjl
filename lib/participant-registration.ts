import { ApplicationStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { phoneKey } from "@/lib/phone";
import { isScanHubEnabled, registerBadgeQr, setBadgeQrActive } from "@/lib/scanhub";

/** Raison d'un refus d'inscription (doublon ou places épuisées) : le message est montré tel quel au visiteur. */
export class RegistrationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export type ParticipantRegistration = {
  editionId: string;
  editionYear: number;
  userId: string | null;
  regionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  profession: string;
  hasParticipatedBefore: boolean;
  motivation: string | null;
};

const BADGE_NUMBER_ATTEMPTS = 6;

function uniqueTarget(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.join(",") : String(target ?? "");
}

/** Numéro suivant : plus grand numéro déjà attribué + 1 (et non le nombre de badges, qui se répète en cas de course). */
async function nextBadgeNumber(editionId: string, editionYear: number, tx: Prisma.TransactionClient) {
  const last = await tx.eventParticipation.findFirst({
    where: { editionId, badgeNumber: { not: null } },
    orderBy: { badgeNumber: "desc" },
    select: { badgeNumber: true },
  });
  const lastSequence = Number(last?.badgeNumber?.match(/(\d+)$/)?.[1] ?? 0);
  return `JNJL-${editionYear}-PART-${String(lastSequence + 1).padStart(4, "0")}`;
}

/**
 * Enregistre un participant : candidature et badge sont créés dans UNE transaction (jamais de candidature sans badge).
 * Les doublons (e-mail ou téléphone déjà inscrits pour l'édition) sont arrêtés par les contraintes de la base, donc
 * sans faille en cas d'envois simultanés. Un numéro de badge pris au même instant par un autre participant est
 * simplement retenté.
 */
export async function registerParticipant(data: ParticipantRegistration) {
  const key = phoneKey(data.phone);
  for (let attempt = 1; attempt <= BADGE_NUMBER_ATTEMPTS; attempt++) {
    try {
      return await db.$transaction(async tx => {
        const application = await tx.eventApplication.create({
          data: {
            editionId: data.editionId,
            userId: data.userId,
            regionId: data.regionId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            phoneKey: key,
            gender: data.gender,
            profession: data.profession,
            hasParticipatedBefore: data.hasParticipatedBefore,
            motivation: data.motivation,
            status: ApplicationStatus.RETENU,
            reviewedAt: new Date(),
            consentAt: new Date(),
          },
          select: { id: true },
        });
        const badgeNumber = await nextBadgeNumber(data.editionId, data.editionYear, tx);
        const participation = await tx.eventParticipation.create({
          data: {
            editionId: data.editionId,
            userId: data.userId,
            eventApplicationId: application.id,
            badgeNumber,
            qrCode: badgeNumber,
          },
          select: { id: true },
        });
        return { applicationId: application.id, participationId: participation.id, badgeNumber };
      });
    } catch (error) {
      const target = uniqueTarget(error);
      if (target === null) throw error;
      if (target.includes("badgeNumber")) continue;
      if (target.includes("phoneKey")) {
        throw new RegistrationError(
          "Ce numéro de téléphone est déjà inscrit. Utilisez « Badge perdu ? Le retrouver » pour récupérer votre badge.",
          409
        );
      }
      if (target.includes("email")) {
        throw new RegistrationError(
          "Une inscription existe déjà pour cet e-mail. Utilisez « Badge perdu ? Le retrouver ».",
          409
        );
      }
      throw new RegistrationError("Une inscription existe déjà pour ce compte et cette édition.", 409);
    }
  }
  throw new Error("Numéro de badge indisponible, réessayez");
}

/**
 * Crée le QR ScanHub du badge participant (réutilisable) et le met dans `qrCode` à la place du numéro, pour que le
 * scanner de l'entrée le reconnaisse. Ne lève jamais : sans ScanHub le badge reste valable, le QR contient le
 * numéro et le pointage manuel par numéro fonctionne.
 */
export async function syncParticipantQr(participationId: string, holderName: string): Promise<void> {
  if (!isScanHubEnabled()) return;
  try {
    const participation = await db.eventParticipation.findUnique({
      where: { id: participationId },
      select: { id: true, badgeNumber: true, qrCode: true },
    });
    if (!participation?.badgeNumber || participation.qrCode !== participation.badgeNumber) return;

    const qr = await registerBadgeQr({
      number: participation.badgeNumber,
      holderName,
      role: "Participant JNJL",
    });
    if (!qr.token) throw new Error("ScanHub n'a pas renvoyé le jeton du QR");
    await db.eventParticipation.update({ where: { id: participation.id }, data: { qrCode: qr.token } });
    await setBadgeQrActive(participation.badgeNumber, true);
  } catch (error) {
    console.error("ScanHub : QR du badge participant non créé", error);
  }
}
