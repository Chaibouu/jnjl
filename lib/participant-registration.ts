import { ApplicationStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { phoneKey } from "@/lib/phone";
import { isScanHubEnabled, registerBadgeQr } from "@/lib/scanhub";

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
  entrepreneurshipCommitment: string;
  willTravelToNiamey: boolean | null;
  /** Nombre maximum de participants (0 = illimité), revérifié dans la transaction. */
  capacity: number;
};

const BADGE_NUMBER_ATTEMPTS = 6;

function uniqueTarget(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.join(",") : String(target ?? "");
}

/**
 * Numéro suivant : plus grand numéro déjà attribué + 1, comparé comme un NOMBRE (un tri alphabétique placerait
 * « …-10000 » avant « …-9999 »). À appeler sous le verrou de l'édition (voir registerParticipant).
 */
async function nextBadgeNumber(editionId: string, editionYear: number, tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{ max: number }[]>`
    SELECT COALESCE(MAX(CAST(substring("badgeNumber" from '[0-9]+$') AS INTEGER)), 0) AS max
    FROM "EventParticipation"
    WHERE "editionId" = ${editionId} AND "badgeNumber" IS NOT NULL`;
  const lastSequence = Number(rows[0]?.max ?? 0);
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
        // Verrou propre à l'édition, levé à la fin de la transaction : les inscriptions simultanées passent l'une après
        // l'autre (numéros de badge consécutifs sans collision, places comptées sans dépassement).
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"participant-registration:" + data.editionId}))`;
        if (data.capacity > 0) {
          const registered = await tx.eventApplication.count({ where: { editionId: data.editionId, cancelledAt: null } });
          if (registered >= data.capacity) {
            throw new RegistrationError("Les inscriptions sont closes : toutes les places sont prises.", 403);
          }
        }
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
            activeEmail: data.email,
            gender: data.gender,
            profession: data.profession,
            hasParticipatedBefore: data.hasParticipatedBefore,
            entrepreneurshipCommitment: data.entrepreneurshipCommitment,
            willTravelToNiamey: data.willTravelToNiamey,
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
      }, { maxWait: 15_000, timeout: 30_000 });
    } catch (error) {
      if (error instanceof RegistrationError) throw error;
      const target = uniqueTarget(error);
      if (target === null) throw error;
      if (target.includes("badgeNumber")) continue;
      if (target.includes("phoneKey")) {
        throw new RegistrationError(
          "Ce numéro de téléphone est déjà inscrit. Utilisez « Badge perdu ? Le retrouver » pour récupérer votre badge.",
          409
        );
      }
      if (/email/i.test(target)) {
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
  } catch (error) {
    console.error("ScanHub : QR du badge participant non créé", error);
  }
}
